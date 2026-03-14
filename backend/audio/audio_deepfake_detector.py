"""

Audio Deepfake Detection + Tool Classification  [v6 - Data Calibrated]
======================================================================
Thresholds set from measured values on known ElevenLabs fake vs real:
  audio_1.mp3 = ElevenLabs clone (FAKE)
  audio_2.mp3 = Real human speech (REAL)

Signals ranked by separation power:
  1. HF energy ratio     : FAKE=0.024, REAL=0.001  (18x diff)  ** NEW **
  2. Spectral flatness   : FAKE=0.022, REAL=0.008  (2.9x diff) ** NEW **
  3. Flux CV             : FAKE=0.655, REAL=0.818  (lower=fake) ** NEW **
  4. CPP mean            : FAKE=0.087, REAL=0.061  (1.4x diff)  recalibrated
  5. Shimmer             : FAKE=0.467, REAL=0.630  (lower=fake) ** NEW **
  6. Noise floor SNR     : FAKE=-16dB, REAL=-12dB               recalibrated
  7. Phase entropy       : FAKE=0.845, REAL=0.861  (weak)        recalibrated
  8. Vocoder cepstrum    : 0 for both (kept for non-EL fakes)    kept

Install:
    pip install transformers torch torchaudio librosa scipy numpy
"""

import os
import sys
import subprocess
import tempfile
import warnings
import io

# Fix Windows console encoding — prevent charmap errors with Unicode chars
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
import numpy as np
import torch
import librosa
import scipy.signal
import scipy.stats
from pathlib import Path
from transformers import (
    AutoFeatureExtractor,
    AutoModelForAudioClassification,
)

try:
    import webrtcvad
    HAS_WEBRTCVAD = True
except ImportError:
    HAS_WEBRTCVAD = False
    print("[WARN] webrtcvad not installed. VAD will use energy-based fallback.")

try:
    from resemblyzer import VoiceEncoder, preprocess_wav
    HAS_RESEMBLYZER = True
except ImportError:
    HAS_RESEMBLYZER = False
    print("[WARN] resemblyzer not installed. Speaker verification disabled.")

warnings.filterwarnings("ignore")

# ==============================================
#  CONFIG
# ==============================================

MODEL_A_ID  = "Gustking/wav2vec2-large-xlsr-deepfake-audio-classification"
MODEL_B_ID  = "MelodyMachine/Deepfake-audio-detection-V2"

TARGET_SR   = 22050
ML_SR       = 16000
FRAME_LEN   = 2048
HOP_LEN     = 512

W_MODEL_A   = 0.25
W_MODEL_B   = 0.10
W_FREQUENCY = 0.65

ML_CHUNK_SEC = 4.0
ML_OVERLAP   = 1.0
ML_TEMP_A    = 1.5
ML_TEMP_B    = 2.0

# Weights: ranked by measured separation power
FREQ_WEIGHTS = {
    "hf_energy":          0.22,   # 18x difference (strongest)
    "spectral_flatness":  0.18,   # 2.9x difference
    "flux_cv":            0.14,   # CV 0.655 vs 0.818
    "cpp":                0.14,   # 1.4x difference
    "shimmer":            0.12,   # 0.467 vs 0.630
    "noise_floor":        0.10,   # -16dB vs -12dB
    "phase":              0.06,   # 0.845 vs 0.861 (weak)
    "vocoder":            0.04,   # 0 for both (kept for non-EL)
}

# Override: HF energy + CPP both strong -> force FAKE
HF_OVERRIDE_THRESHOLD  = 0.70
CPP_OVERRIDE_THRESHOLD = 0.55
OVERRIDE_FAKE_SCORE    = 0.80

CONFIDENCE_THRESHOLD = 0.52
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


# ==============================================
#  AUDIO UTILITIES
# ==============================================

def load_audio(path: str, sr: int) -> np.ndarray:
    audio, _ = librosa.load(str(path), sr=sr, mono=True)
    return audio

def normalize(a: np.ndarray) -> np.ndarray:
    p = np.max(np.abs(a))
    return a / p if p > 0 else a

def softmax_t(logits: np.ndarray, t: float) -> np.ndarray:
    s = logits / t
    e = np.exp(s - s.max())
    return e / e.sum()

def split_chunks(audio, sr, csec, osec):
    clen = int(csec * sr)
    step = int((csec - osec) * sr)
    if len(audio) <= clen:
        pad = np.zeros(clen, dtype=np.float32)
        pad[:len(audio)] = audio
        return [pad]
    chunks, s = [], 0
    while s < len(audio):
        seg = audio[s: s + clen]
        if len(seg) < clen:
            pad = np.zeros(clen, dtype=np.float32)
            pad[:len(seg)] = seg
            seg = pad
        chunks.append(seg.astype(np.float32))
        s += step
    return chunks


# ==============================================
#  STEP 1 -- FFMPEG PREPROCESSING
# ==============================================

def preprocess_with_ffmpeg(input_path: str, target_sr: int = 16000) -> str:
    """Convert any audio to WAV mono at target sample rate using ffmpeg."""
    out_path = tempfile.mktemp(suffix=".wav")
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(input_path),
             "-ac", "1", "-ar", str(target_sr),
             "-sample_fmt", "s16", out_path],
            capture_output=True, check=True, timeout=30,
        )
        return out_path
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        return None


# ==============================================
#  STEP 2 -- VOICE ACTIVITY DETECTION (WebRTC)
# ==============================================

VAD_FRAME_MS    = 30      # 10, 20, or 30 ms
VAD_AGGRESSION  = 2       # 0-3, higher = more aggressive filtering

def _float_to_pcm16(audio: np.ndarray) -> bytes:
    """Convert float32 audio [-1,1] to 16-bit PCM bytes."""
    clipped = np.clip(audio, -1.0, 1.0)
    pcm = (clipped * 32767).astype(np.int16)
    return pcm.tobytes()

def extract_speech_segments(audio: np.ndarray, sr: int) -> dict:
    """
    Detect speech segments using WebRTC VAD.
    Returns dict with speech_segments list, speech_audio, non_speech_audio.
    """
    # WebRTC VAD only supports 8000, 16000, 32000, 48000 Hz
    vad_sr = 16000
    if sr != vad_sr:
        audio_vad = librosa.resample(audio, orig_sr=sr, target_sr=vad_sr)
    else:
        audio_vad = audio

    frame_samples = int(vad_sr * VAD_FRAME_MS / 1000)
    pcm_bytes = _float_to_pcm16(audio_vad)

    segments = []  # list of (start_sample, end_sample) in original sr

    if HAS_WEBRTCVAD:
        vad = webrtcvad.Vad(VAD_AGGRESSION)
        n_frames = len(audio_vad) // frame_samples
        is_speech = []
        for i in range(n_frames):
            start = i * frame_samples
            end = start + frame_samples
            frame_bytes = pcm_bytes[start * 2: end * 2]
            if len(frame_bytes) == frame_samples * 2:
                is_speech.append(vad.is_speech(frame_bytes, vad_sr))
            else:
                is_speech.append(False)

        # Smooth: merge gaps < 300ms
        min_gap_frames = int(0.3 * 1000 / VAD_FRAME_MS)
        smoothed = list(is_speech)
        for i in range(len(smoothed)):
            if not smoothed[i]:
                left = max(0, i - min_gap_frames)
                right = min(len(smoothed), i + min_gap_frames)
                if any(smoothed[left:i]) and any(smoothed[i+1:right+1]):
                    smoothed[i] = True

        # Extract contiguous speech regions
        in_speech = False
        seg_start = 0
        ratio = sr / vad_sr
        for i, s in enumerate(smoothed):
            if s and not in_speech:
                seg_start = i
                in_speech = True
            elif not s and in_speech:
                start_orig = int(seg_start * frame_samples * ratio)
                end_orig = int(i * frame_samples * ratio)
                segments.append((start_orig, min(end_orig, len(audio))))
                in_speech = False
        if in_speech:
            start_orig = int(seg_start * frame_samples * ratio)
            segments.append((start_orig, len(audio)))
    else:
        # Energy-based fallback
        rms = librosa.feature.rms(y=audio, frame_length=2048, hop_length=512)[0]
        threshold = np.max(rms) * 0.08
        in_speech = False
        seg_start = 0
        for i, r in enumerate(rms):
            if r > threshold and not in_speech:
                seg_start = i * 512
                in_speech = True
            elif r <= threshold and in_speech:
                segments.append((seg_start, min(i * 512, len(audio))))
                in_speech = False
        if in_speech:
            segments.append((seg_start, len(audio)))

    # Build speech and non-speech audio
    speech_parts = [audio[s:e] for s, e in segments]
    speech_audio = np.concatenate(speech_parts) if speech_parts else audio

    # Non-speech regions
    non_speech_parts = []
    prev_end = 0
    for s, e in segments:
        if s > prev_end:
            non_speech_parts.append(audio[prev_end:s])
        prev_end = e
    if prev_end < len(audio):
        non_speech_parts.append(audio[prev_end:])
    non_speech_audio = np.concatenate(non_speech_parts) if non_speech_parts else np.array([], dtype=np.float32)

    print(f"  [VAD] Found {len(segments)} speech segments, "
          f"{len(speech_audio)/sr:.1f}s speech, "
          f"{len(non_speech_audio)/sr:.1f}s non-speech")

    return {
        "segments": segments,
        "speech_audio": speech_audio,
        "non_speech_audio": non_speech_audio,
        "speech_ratio": len(speech_audio) / (len(audio) + 1),
    }


# ==============================================
#  STEP 3 -- MFCC FEATURE EXTRACTION
# ==============================================

def extract_mfcc_features(audio: np.ndarray, sr: int) -> dict:
    """Extract MFCC features: 13 MFCCs + deltas = 39 features, compute stats."""
    mfcc = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13,
                                 n_fft=FRAME_LEN, hop_length=HOP_LEN)
    delta = librosa.feature.delta(mfcc)
    delta2 = librosa.feature.delta(mfcc, order=2)

    features = np.vstack([mfcc, delta, delta2])  # (39, T)

    stats = {
        "mfcc_mean": float(np.mean(mfcc)),
        "mfcc_std": float(np.std(mfcc)),
        "mfcc_skew": float(scipy.stats.skew(mfcc.flatten())),
        "delta_mean": float(np.mean(np.abs(delta))),
        "delta2_mean": float(np.mean(np.abs(delta2))),
        "mfcc_per_coeff_std": float(np.mean(np.std(mfcc, axis=1))),
    }

    # MFCC regularity score: AI voices have unnaturally consistent MFCCs
    # Lower per-coefficient std = more regular = more likely fake
    per_coeff_cv = np.std(mfcc, axis=1) / (np.abs(np.mean(mfcc, axis=1)) + 1e-9)
    mean_cv = float(np.mean(per_coeff_cv))
    # Real speech: CV ~0.8-1.5, AI speech: CV ~0.4-0.7
    mfcc_score = float(np.clip((1.0 - mean_cv) / 0.6, 0, 1))
    stats["mfcc_regularity_score"] = mfcc_score

    print(f"  [MFCC] 39 features extracted, regularity={mfcc_score*100:.1f}%")
    return stats


# ==============================================
#  STEP 4 -- SPEAKER VERIFICATION (Resemblyzer)
# ==============================================

def speaker_verification(audio: np.ndarray, sr: int) -> dict:
    """
    Compute speaker embeddings per segment and measure consistency.
    Cloned voices: unnaturally consistent (>0.92) or spliced (<0.60).
    Real voices: natural variation (0.75-0.88).
    """
    if not HAS_RESEMBLYZER:
        print("  [SPKR] Resemblyzer not available, returning neutral score")
        return {
            "speaker_score": 0.5,
            "mean_similarity": 0.0,
            "embedding_dim": 0,
            "n_segments": 0,
        }

    # Resemblyzer expects 16kHz
    if sr != 16000:
        audio_16k = librosa.resample(audio, orig_sr=sr, target_sr=16000)
    else:
        audio_16k = audio

    encoder = VoiceEncoder()

    # Split into 3-second segments with 1s overlap
    seg_len = 16000 * 3
    step = 16000 * 2
    segments = []
    i = 0
    while i + seg_len <= len(audio_16k):
        segments.append(audio_16k[i:i+seg_len])
        i += step
    if len(segments) < 2 and len(audio_16k) >= seg_len:
        segments = [audio_16k[:seg_len]]

    if len(segments) < 2:
        # Audio too short for segment comparison
        if len(audio_16k) > 16000:
            embed = encoder.embed_utterance(preprocess_wav(audio_16k, source_sr=16000))
            return {
                "speaker_score": 0.5,
                "mean_similarity": 0.0,
                "embedding_dim": len(embed),
                "n_segments": 1,
            }
        return {
            "speaker_score": 0.5,
            "mean_similarity": 0.0,
            "embedding_dim": 256,
            "n_segments": 0,
        }

    # Compute embeddings for each segment
    embeddings = []
    for seg in segments:
        processed = preprocess_wav(seg, source_sr=16000)
        if len(processed) > 0:
            emb = encoder.embed_utterance(processed)
            embeddings.append(emb)

    if len(embeddings) < 2:
        return {
            "speaker_score": 0.5,
            "mean_similarity": 0.0,
            "embedding_dim": 256,
            "n_segments": len(embeddings),
        }

    # Compute pairwise cosine similarities
    sims = []
    for i in range(len(embeddings)):
        for j in range(i + 1, len(embeddings)):
            cos_sim = float(np.dot(embeddings[i], embeddings[j]) /
                           (np.linalg.norm(embeddings[i]) * np.linalg.norm(embeddings[j]) + 1e-9))
            sims.append(cos_sim)

    mean_sim = float(np.mean(sims))
    std_sim = float(np.std(sims))

    # Score: too consistent OR too inconsistent = suspicious
    # Real: ~0.78-0.88, Clone: >0.92 or <0.60
    if mean_sim > 0.92:
        # Unnaturally consistent -> cloned voice
        score = float(np.clip((mean_sim - 0.88) / 0.10, 0, 1))
    elif mean_sim < 0.60:
        # Very inconsistent -> spliced/edited audio
        score = float(np.clip((0.70 - mean_sim) / 0.20, 0, 1))
    else:
        # Natural range
        score = float(np.clip(0.2 - std_sim, 0, 0.3))

    print(f"  [SPKR] {len(embeddings)} segments, "
          f"mean_sim={mean_sim:.3f}, std={std_sim:.3f}, "
          f"score={score*100:.1f}%")

    return {
        "speaker_score": float(np.clip(score, 0, 1)),
        "mean_similarity": mean_sim,
        "similarity_std": std_sim,
        "embedding_dim": len(embeddings[0]),
        "n_segments": len(embeddings),
    }


# ==============================================
#  STEP 7 -- BREATHING DETECTION
# ==============================================

def detect_breathing(audio: np.ndarray, sr: int, speech_segments: list) -> dict:
    """
    Detect breathing patterns in non-speech regions.
    Real audio has detectable breathing; AI-generated typically doesn't.
    """
    # Get non-speech regions
    non_speech = []
    prev_end = 0
    for seg_start, seg_end in speech_segments:
        if seg_start > prev_end + int(0.1 * sr):  # gaps > 100ms
            non_speech.append((prev_end, seg_start))
        prev_end = seg_end
    if prev_end < len(audio) - int(0.1 * sr):
        non_speech.append((prev_end, len(audio)))

    breath_events = []
    breath_intervals = []
    last_breath_time = None

    for gap_start, gap_end in non_speech:
        gap_audio = audio[gap_start:gap_end]
        gap_dur = len(gap_audio) / sr

        if gap_dur < 0.15 or gap_dur > 3.0:
            continue

        # Compute short-time energy
        frame_len = min(1024, len(gap_audio))
        hop = frame_len // 2
        if len(gap_audio) < frame_len:
            continue

        rms = librosa.feature.rms(y=gap_audio, frame_length=frame_len,
                                   hop_length=hop)[0]

        # Check for breathing-like energy pattern:
        # - Short energy burst (0.2-0.8s)
        # - Moderate amplitude (not silence, not speech-level)
        peak_rms = float(np.max(rms))
        mean_rms = float(np.mean(rms))
        signal_rms = float(np.sqrt(np.mean(audio ** 2))) + 1e-9

        # Breathing: 5-30% of signal RMS
        if 0.03 * signal_rms < mean_rms < 0.35 * signal_rms:
            # Check spectral shape: breathing is broadband, 200-3000 Hz
            S = np.abs(librosa.stft(gap_audio, n_fft=min(2048, len(gap_audio)),
                                     hop_length=hop))
            freqs = librosa.fft_frequencies(sr=sr, n_fft=min(2048, len(gap_audio)))

            if len(freqs) > 1:
                breath_band = (freqs >= 200) & (freqs <= 3000)
                total_energy = float(np.sum(S ** 2)) + 1e-9
                breath_energy = float(np.sum(S[breath_band, :] ** 2))
                breath_ratio = breath_energy / total_energy

                # Breathing has most energy in 200-3000 Hz band
                if breath_ratio > 0.5:
                    breath_time = gap_start / sr
                    breath_events.append({
                        "time": breath_time,
                        "duration": gap_dur,
                        "energy_ratio": breath_ratio,
                    })
                    if last_breath_time is not None:
                        breath_intervals.append(breath_time - last_breath_time)
                    last_breath_time = breath_time

    # Score
    n_breaths = len(breath_events)
    audio_dur = len(audio) / sr

    if audio_dur < 3.0:
        # Too short to expect breathing
        score = 0.5
    elif n_breaths == 0:
        # No breathing detected -> likely AI
        score = 0.8
    elif n_breaths >= 1:
        # Has breathing -> more likely real
        # Check if intervals are natural (3-6 seconds)
        if breath_intervals:
            mean_interval = float(np.mean(breath_intervals))
            natural = 3.0 <= mean_interval <= 7.0
            score = 0.15 if natural else 0.4
        else:
            score = 0.25  # Has at least one breath
    else:
        score = 0.5

    print(f"  [BREATH] {n_breaths} breaths detected in {audio_dur:.1f}s audio, "
          f"score={score*100:.1f}%")

    return {
        "breathing_score": float(np.clip(score, 0, 1)),
        "breath_count": n_breaths,
        "breath_intervals": breath_intervals,
        "breath_events": breath_events,
        "audio_duration": audio_dur,
    }


# ==============================================
#  STEP 8 -- AUTHENTICITY SCORING
# ==============================================

W_DEEPFAKE  = 0.55
W_SPEAKER   = 0.10
W_ARTIFACT  = 0.25
W_NOISE     = 0.10

def compute_authenticity_score(
    deepfake_score: float,
    speaker_score: float,
    artifact_score: float,
    noise_score: float,
    speaker_reliable: bool = True,
) -> dict:
    """
    Final authenticity score = weighted combination.
    Score is probability of FAKE (0=real, 1=fake).
    When speaker verification is unreliable (returned neutral 0.5),
    redistribute its weight to the ML deepfake model.
    """
    w_df = W_DEEPFAKE
    w_sp = W_SPEAKER
    w_ar = W_ARTIFACT
    w_no = W_NOISE

    if not speaker_reliable:
        # Speaker returned neutral 0.5 -- redistribute weight to ML model
        w_df += w_sp
        w_sp = 0.0

    fake_prob = (w_df * deepfake_score +
                 w_sp * speaker_score +
                 w_ar * artifact_score +
                 w_no * noise_score)
    fake_prob = float(np.clip(fake_prob, 0.0, 1.0))
    real_prob = 1.0 - fake_prob

    print(f"\n  [SCORE] Authenticity Score Breakdown:")
    print(f"    Deepfake Model   ({w_df:.0%}): {deepfake_score*100:5.1f}%")
    print(f"    Speaker Verif    ({w_sp:.0%}): {speaker_score*100:5.1f}%"
          f"{'  [neutral - weight redistributed]' if not speaker_reliable else ''}")
    print(f"    Artifact Detect  ({w_ar:.0%}): {artifact_score*100:5.1f}%")
    print(f"    Noise Analysis   ({w_no:.0%}): {noise_score*100:5.1f}%")
    print(f"    -----------------------------")
    print(f"    FAKE probability      : {fake_prob*100:5.1f}%")

    return {
        "fake": fake_prob,
        "real": real_prob,
        "total": round(fake_prob, 4),
        "breakdown": {
            "deepfake_model": round(deepfake_score, 4),
            "speaker_verification": round(speaker_score, 4),
            "artifact_detection": round(artifact_score, 4),
            "noise_analysis": round(noise_score, 4),
        },
        "weights": {
            "deepfake_model": w_df,
            "speaker_verification": w_sp,
            "artifact_detection": w_ar,
            "noise_analysis": w_no,
        },
    }


# ==============================================
#  LAYER 1 -- ML MODELS
# ==============================================

def load_hf_model(model_id):
    print(f"  [ML] Loading: {model_id}")
    try:
        fe    = AutoFeatureExtractor.from_pretrained(model_id)
        model = AutoModelForAudioClassification.from_pretrained(model_id)
        model.to(DEVICE).eval()
        print(f"  [ML] Labels : {model.config.id2label}")
        return fe, model
    except Exception as e:
        print(f"  [ML] ERROR loading {model_id}: {e}")
        raise

def infer_chunk(chunk, fe, model):
    inputs = fe(chunk, sampling_rate=ML_SR, return_tensors="pt", padding=True)
    inputs = {k: v.to(DEVICE) for k, v in inputs.items()}
    with torch.no_grad():
        return model(**inputs).logits.squeeze().cpu().numpy()

def score_ml(audio, fe, model, temp):
    chunks   = split_chunks(audio, ML_SR, ML_CHUNK_SEC, ML_OVERLAP)
    logits   = [infer_chunk(c, fe, model) for c in chunks]

    # Guard against empty or NaN logits
    if not logits:
        return {"fake_prob": 0.5, "real_prob": 0.5,
                "fake_chunks": 0, "total_chunks": 0,
                "chunk_details": []}

    mean_logits = np.mean(logits, axis=0)
    if np.any(np.isnan(mean_logits)):
        mean_logits = np.nan_to_num(mean_logits, nan=0.0)

    probs    = softmax_t(mean_logits, temp)
    id2label = model.config.id2label
    fake_p, real_p = 0.0, 0.0
    for i, p in enumerate(probs):
        lbl = id2label[i].lower()
        if any(k in lbl for k in ("fake","spoof","synthetic")): fake_p = float(p)
        elif any(k in lbl for k in ("real","genuine","bonafide")): real_p = float(p)

    # Ensure we always have valid probabilities
    if fake_p == 0.0 and real_p == 0.0:
        fake_p, real_p = 0.5, 0.5
    votes = [id2label[int(np.argmax(l))].lower() for l in logits]
    fv    = sum(1 for v in votes if any(k in v for k in ("fake","spoof")))

    # Per-chunk timeline data
    step_sec = ML_CHUNK_SEC - ML_OVERLAP
    chunk_details = []
    for idx, lg in enumerate(logits):
        lg_safe = np.nan_to_num(lg, nan=0.0)
        cp = softmax_t(lg_safe, temp)
        c_fake, c_real = 0.0, 0.0
        for i, p in enumerate(cp):
            lbl = id2label[i].lower()
            if any(k in lbl for k in ("fake","spoof","synthetic")): c_fake = float(p)
            elif any(k in lbl for k in ("real","genuine","bonafide")): c_real = float(p)
        start = round(idx * step_sec, 2)
        end = round(start + ML_CHUNK_SEC, 2)
        label = "fake" if c_fake >= 0.5 else "real"
        chunk_details.append({
            "start": start, "end": end,
            "fake_prob": round(c_fake, 4), "real_prob": round(c_real, 4),
            "label": label,
        })

    return {"fake_prob": fake_p, "real_prob": real_p,
            "fake_chunks": fv, "total_chunks": len(chunks),
            "chunk_details": chunk_details}


# ==============================================
#  LAYER 2 -- 8 FREQUENCY SIGNALS [v6 DATA-DRIVEN]
# ==============================================
# Thresholds calibrated from measured values:
#   FAKE (ElevenLabs audio_1.mp3) vs REAL (audio_2.mp3)
#   Decision boundary = midpoint between measured values

# -- Signal 1: HF Energy Ratio --------------------------------
# MEASURED: FAKE=0.0240, REAL=0.0014 (18x difference)
# AI synthesis produces full-bandwidth audio; real recordings
# often have less HF content due to mic/codec/environment.

def sig_hf_energy(audio: np.ndarray) -> float:
    S     = np.abs(librosa.stft(audio, n_fft=FRAME_LEN, hop_length=HOP_LEN))
    freqs = librosa.fft_frequencies(sr=TARGET_SR, n_fft=FRAME_LEN)
    hf    = freqs >= 4000
    hf_e  = float(np.sum(S[hf, :] ** 2))
    tot_e = float(np.sum(S ** 2)) + 1e-8
    ratio = hf_e / tot_e
    # Decision boundary at 0.005 (biased toward catching fakes)
    # FAKE 0.024 -> score 1.0, REAL 0.001 -> score 0.0
    return float(np.clip((ratio - 0.003) / 0.020, 0, 1))


# -- Signal 2: Spectral Flatness ------------------------------
# MEASURED: FAKE=0.0223, REAL=0.0077 (2.9x difference)
# AI audio has flatter spectrum (more uniform energy distribution).
# Real speech is more tonal (harmonic peaks dominate).

def sig_spectral_flatness(audio: np.ndarray) -> float:
    flatness = librosa.feature.spectral_flatness(y=audio)[0]
    mean_flat = float(np.mean(flatness))
    # Decision boundary at ~0.013
    # FAKE 0.022 -> score 0.82, REAL 0.008 -> score 0.0
    return float(np.clip((mean_flat - 0.010) / 0.015, 0, 1))


# -- Signal 3: Flux CV (spectral flux regularity) -------------
# MEASURED: FAKE CV=0.655, REAL CV=0.818
# AI audio has more regular spectral changes (lower CV).

def sig_flux_cv(audio: np.ndarray) -> float:
    S    = np.abs(librosa.stft(audio, n_fft=FRAME_LEN, hop_length=HOP_LEN))
    flux = np.sqrt(np.sum(np.diff(S, axis=1)**2, axis=0))
    if len(flux) < 4:
        return 0.5
    cv = float(np.std(flux) / (np.mean(flux) + 1e-9))
    # Decision boundary at ~0.74
    # FAKE CV=0.655 -> score 0.73, REAL CV=0.818 -> score 0.0
    return float(np.clip((0.80 - cv) / 0.20, 0, 1))


# -- Signal 4: Cepstral Peak Prominence (CPP) -----------------
# MEASURED: FAKE mean=0.087 cv=0.440, REAL mean=0.061 cv=0.337
# AI has higher CPP (more periodic source) and higher CV.
# Quefrency: cepstrum[q] -> f0 = sr / q

def sig_cpp(audio: np.ndarray) -> float:
    cpp_vals = []
    frames = librosa.util.frame(
        audio, frame_length=FRAME_LEN, hop_length=HOP_LEN * 2
    ).T

    for frame in frames:
        windowed = frame * np.hanning(len(frame))
        spec = np.abs(np.fft.rfft(windowed))
        if np.max(spec) < 1e-6:
            continue
        log_spec = np.log(spec + 1e-9)
        cepstrum = np.abs(np.fft.irfft(log_spec))

        # Quefrency range for F0 = 62-500 Hz
        q_lo = max(1, int(TARGET_SR / 500))   # 44
        q_hi = min(len(cepstrum) - 1, int(TARGET_SR / 62))  # 355
        if q_hi <= q_lo + 2:
            continue

        region = cepstrum[q_lo:q_hi + 1]
        x = np.arange(len(region), dtype=np.float64)
        if len(x) < 3:
            continue

        try:
            slope, intercept, _, _, _ = scipy.stats.linregress(x, region)
            trend = slope * x + intercept
            residual = region - trend
            cpp_vals.append(float(np.max(residual) - np.mean(residual)))
        except Exception:
            continue

    if not cpp_vals:
        return 0.5

    mean_cpp = float(np.mean(cpp_vals))
    std_cpp  = float(np.std(cpp_vals))
    cv       = std_cpp / (mean_cpp + 1e-9)

    # Decision boundaries from measured data:
    # CPP mean: FAKE=0.087, REAL=0.061 -> boundary ~0.070
    abs_score = float(np.clip((mean_cpp - 0.055) / 0.050, 0, 1))
    # CPP CV:   FAKE=0.440, REAL=0.337 -> boundary ~0.385
    cv_score  = float(np.clip((cv - 0.30) / 0.20, 0, 1))

    return float(np.clip(abs_score * 0.55 + cv_score * 0.45, 0, 1))


# -- Signal 5: Shimmer (amplitude variation) -------------------
# MEASURED: FAKE=0.467, REAL=0.630
# AI has less amplitude variation in voiced segments.

def sig_shimmer(audio: np.ndarray) -> float:
    f0, vf, _ = librosa.pyin(
        audio, fmin=librosa.note_to_hz('C2'),
        fmax=librosa.note_to_hz('C7'),
        sr=TARGET_SR, hop_length=HOP_LEN, fill_na=None,
    )
    if f0 is None:
        return 0.5

    mask = vf & ~np.isnan(f0)
    rms  = librosa.feature.rms(y=audio, frame_length=FRAME_LEN,
                                hop_length=HOP_LEN)[0]
    ml   = min(len(rms), len(mask))
    vrms = rms[:ml][mask[:ml]]

    if len(vrms) < 10:
        return 0.5

    shimmer = float(np.std(vrms) / (np.mean(vrms) + 1e-9))

    # Decision boundary at ~0.55
    # FAKE shimmer=0.467 -> score 0.67, REAL shimmer=0.630 -> score 0.0
    return float(np.clip((0.60 - shimmer) / 0.20, 0, 1))


# -- Signal 6: Noise Floor ------------------------------------
# MEASURED: FAKE=-16.15 dB, REAL=-11.76 dB
# AI audio has cleaner silence (more negative SNR dB).

def sig_noise_floor(audio: np.ndarray) -> float:
    rms      = librosa.feature.rms(y=audio, frame_length=FRAME_LEN,
                                    hop_length=HOP_LEN)[0]
    sil_mask = rms < (np.max(rms) * 0.04)

    if np.sum(sil_mask) < 3:
        return 0.3

    segs = [audio[i * HOP_LEN: i * HOP_LEN + FRAME_LEN]
            for i, s in enumerate(sil_mask)
            if s and i * HOP_LEN + FRAME_LEN <= len(audio)]

    if not segs:
        return 0.3

    silent_audio = np.concatenate(segs)
    noise_rms  = float(np.sqrt(np.mean(silent_audio ** 2)))
    signal_rms = float(np.sqrt(np.mean(audio ** 2))) + 1e-9
    snr_db     = 20 * np.log10(noise_rms / signal_rms + 1e-12)

    # Decision boundary at ~-14 dB
    # FAKE -16.15 dB -> score 0.62, REAL -11.76 dB -> score 0.18
    return float(np.clip((-snr_db - 10.0) / 10.0, 0, 1))


# -- Signal 7: Phase Coherence --------------------------------
# MEASURED: FAKE=0.845, REAL=0.861 (small difference)
# AI has slightly more structured phase (lower entropy).

def sig_phase(audio: np.ndarray) -> float:
    stft_c = librosa.stft(audio, n_fft=FRAME_LEN, hop_length=HOP_LEN)
    phase  = np.angle(stft_c)
    pd     = np.diff(phase, axis=1)
    pd     = (pd + np.pi) % (2 * np.pi) - np.pi

    phase_entropies = []
    for freq_bin in pd[::8]:
        hist, _ = np.histogram(freq_bin, bins=16, range=(-np.pi, np.pi))
        hist    = hist + 1e-9
        hist    = hist / hist.sum()
        phase_entropies.append(float(scipy.stats.entropy(hist)))

    if not phase_entropies:
        return 0.5

    mean_ent   = float(np.mean(phase_entropies))
    max_ent    = np.log(16)
    normalized = mean_ent / max_ent

    # Decision boundary at ~0.853
    # FAKE 0.845 -> score 0.38, REAL 0.861 -> score 0.0
    # Tight range because values are close
    return float(np.clip((0.86 - normalized) / 0.04, 0, 1))


# -- Signal 8: Vocoder Fingerprint ----------------------------
# MEASURED: 0 peaks for both files (ElevenLabs doesn't leave obvious
# cepstral peaks). Kept for detecting non-ElevenLabs fakes.

def sig_vocoder(audio: np.ndarray) -> float:
    S = np.abs(librosa.stft(audio, n_fft=FRAME_LEN, hop_length=HOP_LEN))
    mean_spec = np.mean(S, axis=1)
    log_spec  = np.log(mean_spec + 1e-9)
    cepstrum  = np.abs(np.fft.irfft(log_spec))

    q_lo = max(1, int(TARGET_SR / 320))
    q_hi = min(len(cepstrum) - 1, int(TARGET_SR / 80))

    if q_hi <= q_lo + 2:
        return 0.5

    region = cepstrum[q_lo:q_hi]
    bg_b = cepstrum[1:max(1, q_lo)]
    bg_a = cepstrum[min(q_hi, len(cepstrum) - 1):]
    bg_parts = [p for p in [bg_b, bg_a] if len(p) > 0]
    if not bg_parts:
        return 0.5
    bg = np.concatenate(bg_parts)
    bg_std = float(np.std(bg)) + 1e-9

    peaks, props = scipy.signal.find_peaks(region, prominence=bg_std * 1.5)
    if len(peaks) == 0:
        return 0.10

    prom_vals  = props["prominences"]
    max_prom   = float(np.max(prom_vals))
    prom_ratio = max_prom / bg_std

    primary_q      = peaks[np.argmax(prom_vals)] + q_lo
    harmonic_q     = primary_q * 2
    harmonic_bonus = 0.0
    if harmonic_q < len(cepstrum):
        nearby = cepstrum[max(0, harmonic_q - 3):harmonic_q + 4]
        bg_mean = float(np.mean(bg)) + 1e-9
        if len(nearby) > 0 and float(np.max(nearby)) > bg_mean + 2.0 * bg_std:
            harmonic_bonus = 0.15

    return float(np.clip(
        prom_ratio / 5.0 + harmonic_bonus + len(peaks) * 0.03, 0, 1
    ))


# -- Run all signals ------------------------------------------

SIGNAL_FNS = {
    "hf_energy":          sig_hf_energy,
    "spectral_flatness":  sig_spectral_flatness,
    "flux_cv":            sig_flux_cv,
    "cpp":                sig_cpp,
    "shimmer":            sig_shimmer,
    "noise_floor":        sig_noise_floor,
    "phase":              sig_phase,
    "vocoder":            sig_vocoder,
}
SIGNAL_LABELS = {
    "hf_energy":          "HF energy (>4kHz) ",
    "spectral_flatness":  "Spectral flatness  ",
    "flux_cv":            "Flux regularity    ",
    "cpp":                "Cepstral peak (CPP)",
    "shimmer":            "Shimmer (amp var)  ",
    "noise_floor":        "Noise floor        ",
    "phase":              "Phase coherence    ",
    "vocoder":            "Vocoder fingerprint",
}

def run_signals(audio: np.ndarray) -> dict:
    print("\n  [FREQ] Running 8 frequency signals...")
    results = {}
    for name, fn in SIGNAL_FNS.items():
        try:
            score = float(np.clip(fn(audio), 0.0, 1.0))
        except Exception as ex:
            print(f"    [!] {name} failed: {ex}")
            score = 0.5
        results[name] = score
        if score > 0.55:
            tag = "FAKE"
        elif score < 0.45:
            tag = "REAL"
        else:
            tag = "----"
        bar = "#" * int(score * 20) + "." * (20 - int(score * 20))
        print(f"    [{tag:4s}] {SIGNAL_LABELS[name]}  {score*100:5.1f}%  {bar}")
    return results


def freq_combined(signals: dict) -> tuple:
    """
    Override: if HF energy > 70% AND CPP > 55% -> force FAKE.
    These two together are strong evidence of AI synthesis.
    """
    hf  = signals.get("hf_energy", 0.0)
    cpp = signals.get("cpp", 0.0)

    override = (hf >= HF_OVERRIDE_THRESHOLD and cpp >= CPP_OVERRIDE_THRESHOLD)

    if override:
        print(f"\n  [FREQ] ** OVERRIDE: "
              f"HF={hf*100:.0f}% + CPP={cpp*100:.0f}% "
              f"-> forcing fake score to {OVERRIDE_FAKE_SCORE*100:.0f}%")
        return OVERRIDE_FAKE_SCORE, True

    score = float(np.clip(
        sum(FREQ_WEIGHTS[k] * signals[k]
            for k in FREQ_WEIGHTS if k in signals),
        0.0, 1.0
    ))
    return score, False


# ==============================================
#  LAYER 3 -- TOOL CLASSIFIER
# ==============================================

TOOL_TAGS = {
    "Real Speech": "[REAL]",
    "ElevenLabs":  "[ELVN]",
    "RVC":         "[RVC ]",
    "XTTS/Coqui":  "[XTTS]",
    "OpenAI TTS":  "[OAIT]",
    "Generic TTS": "[GTTS]",
}

def classify_tool(audio: np.ndarray, signals: dict, fake_prob: float) -> dict:
    stft  = np.abs(librosa.stft(audio, n_fft=FRAME_LEN, hop_length=HOP_LEN))
    freqs = librosa.fft_frequencies(sr=TARGET_SR, n_fft=FRAME_LEN)

    # ElevenLabs signature: high HF + high flatness + clean noise floor
    hf_sig   = signals.get("hf_energy", 0)
    flat_sig = signals.get("spectral_flatness", 0)
    nf_sig   = signals.get("noise_floor", 0)
    cpp_sig  = signals.get("cpp", 0)
    shm_sig  = signals.get("shimmer", 0)
    flux_sig = signals.get("flux_cv", 0)
    ph_sig   = signals.get("phase", 0)
    voc_sig  = signals.get("vocoder", 0)

    # RVC: bursty flux
    flux_raw  = np.sqrt(np.sum(np.diff(stft, axis=1)**2, axis=0))
    flux_skew = float(scipy.stats.skew(flux_raw)) if len(flux_raw) > 3 else 0.0

    # XTTS: diffusion smearing
    spec_diff = np.mean(np.abs(np.diff(stft, axis=1)), axis=0)
    xtts_raw  = float(1.0 - np.std(spec_diff) / (np.mean(spec_diff) + 1e-9))

    # OpenAI: flat spectrum
    flatness  = librosa.feature.spectral_flatness(y=audio)[0]
    mean_flat = float(np.mean(flatness))

    # Score each tool
    real_s = (0.30 * (1.0 - hf_sig) +
              0.25 * (1.0 - flat_sig) +
              0.25 * (1.0 - cpp_sig) +
              0.20 * (1.0 - shm_sig))

    el_s   = (0.30 * hf_sig +
              0.25 * flat_sig +
              0.20 * nf_sig +
              0.15 * cpp_sig +
              0.10 * shm_sig)

    rvc_s  = (0.30 * flat_sig +
              0.25 * ph_sig +
              0.25 * float(np.clip(flux_skew / 3.0, 0, 1)) +
              0.20 * flux_sig)

    xtts_v = (0.35 * flux_sig +
              0.30 * float(np.clip(xtts_raw, 0, 1)) +
              0.20 * ph_sig +
              0.15 * voc_sig)

    openai_s = (0.35 * float(np.clip(mean_flat / 0.15, 0, 1)) +
                0.30 * nf_sig +
                0.20 * flat_sig +
                0.15 * flux_sig)

    generic_s = (0.40 * voc_sig +
                 0.30 * cpp_sig +
                 0.30 * shm_sig)

    raw = {
        "Real Speech": float(np.clip(real_s,    0, 1)),
        "ElevenLabs":  float(np.clip(el_s,      0, 1)),
        "RVC":         float(np.clip(rvc_s,     0, 1)),
        "XTTS/Coqui":  float(np.clip(xtts_v,   0, 1)),
        "OpenAI TTS":  float(np.clip(openai_s,  0, 1)),
        "Generic TTS": float(np.clip(generic_s, 0, 1)),
    }

    total  = sum(raw.values()) + 1e-9
    scores = {k: round(v / total, 4) for k, v in raw.items()}
    top_tool = max(scores, key=scores.get)

    if fake_prob < 0.45:
        top_tool = "Real Speech"

    return {
        "top_tool":   top_tool,
        "confidence": scores[top_tool],
        "all_scores": scores,
    }


# ==============================================
#  ENSEMBLE + VERDICT
# ==============================================

def ensemble(ml_a, ml_b, fs, override, has_b) -> dict:
    if override:
        wa = 0.15
        wb = 0.05 if has_b else 0.0
        wf = 0.80
    else:
        wa = W_MODEL_A + (W_MODEL_B if not has_b else 0)
        wb = W_MODEL_B if has_b else 0.0
        wf = W_FREQUENCY

    fake = (wa * ml_a["fake_prob"] +
            (wb * ml_b["fake_prob"] if wb > 0 and ml_b else 0.0) +
            wf * fs)
    fake = float(np.clip(fake, 0.0, 1.0))
    return {"fake": fake, "real": 1.0 - fake}


def build_verdict(scores, signals, override, fv, rv, ml_a, tool):
    fp   = scores["fake"]
    conf = max(fp, 1.0 - fp)

    if override:
        verdict = "FAKE / AI GENERATED [X]  [HF+CPP override]"
        label   = "fake"
    elif conf < CONFIDENCE_THRESHOLD:
        verdict = "UNCERTAIN [?]"
        label   = "uncertain"
    elif fp >= 0.5:
        verdict = "FAKE / AI GENERATED [X]"
        label   = "fake"
    else:
        verdict = "AUTHENTIC [OK]"
        label   = "real"

    if not override:
        if fv >= 5 and fp >= 0.5:
            verdict = "FAKE / AI GENERATED [X]  [strong]"
            label   = "fake"
        elif rv >= 6 and fp < 0.5:
            verdict = "AUTHENTIC [OK]  [strong]"
            label   = "real"

    warning = ""
    if (not override and
            ml_a["fake_prob"] < 0.4 and
            sum(signals.values()) / len(signals) > 0.5):
        warning = ("[!] ML missed this -- likely modern clone "
                   f"({tool['top_tool']}) not in training data")

    return label, round(conf, 4), verdict, warning


# ==============================================
#  DETECTOR CLASS
# ==============================================

class DeepfakeDetector:
    def __init__(self):
        print(f"\n{'='*60}")
        print("  Audio Deepfake Detector  [v7 - Full Pipeline]")
        print(f"{'='*60}")
        print(f"  Device : {DEVICE.upper()}")
        print(f"  VAD    : {'WebRTC' if HAS_WEBRTCVAD else 'Energy fallback'}")
        print(f"  Speaker: {'Resemblyzer' if HAS_RESEMBLYZER else 'Disabled'}")
        print(f"{'-'*60}")
        print("\n  Loading ML models...")
        self.fe_a, self.model_a = load_hf_model(MODEL_A_ID)
        try:
            self.fe_b, self.model_b = load_hf_model(MODEL_B_ID)
            self._has_b = True
        except Exception as e:
            print(f"  [WARN] Model B unavailable ({e}). Using A only.")
            self.fe_b = self.model_b = None
            self._has_b = False
        print(f"\n{'='*60}\n")

    def detect(self, file_path: str) -> dict:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Not found: {file_path}")

        print(f"\n{'='*60}")
        print(f"  File : {Path(file_path).name}")
        print(f"{'='*60}")

        # ── STEP 1: Preprocessing with ffmpeg ──
        print("\n  [STEP 1] Audio Preprocessing...")
        wav_path = preprocess_with_ffmpeg(file_path, ML_SR)
        load_path = wav_path if wav_path else file_path

        audio_hq = normalize(load_audio(load_path, TARGET_SR))
        audio_ml = normalize(load_audio(load_path, ML_SR))
        dur = len(audio_hq) / TARGET_SR
        print(f"    Duration: {dur:.2f}s, SR: {TARGET_SR}/{ML_SR} Hz")
        if wav_path:
            print(f"    ffmpeg: converted to {ML_SR}Hz WAV")
        else:
            print(f"    ffmpeg: not available, using librosa directly")

        # ── STEP 2: Voice Activity Detection ──
        print(f"\n  [STEP 2] Voice Activity Detection...")
        vad_result = extract_speech_segments(audio_hq, TARGET_SR)
        speech_segments = vad_result["segments"]

        # ── STEP 3: MFCC Feature Extraction ──
        print(f"\n  [STEP 3] MFCC Feature Extraction...")
        speech_audio = vad_result["speech_audio"]
        mfcc_features = extract_mfcc_features(speech_audio, TARGET_SR)

        # ── STEP 4: Speaker Verification ──
        print(f"\n  [STEP 4] Speaker Verification (Resemblyzer)...")
        spkr_result = speaker_verification(speech_audio, TARGET_SR)

        # ── STEP 5: ML Deepfake Detection ──
        print(f"\n  [STEP 5] ML Deepfake Detection...")
        print("  [ML-A] XLS-R model...")
        ml_a = score_ml(audio_ml, self.fe_a, self.model_a, ML_TEMP_A)
        print(f"    fake={ml_a['fake_prob']*100:.1f}%  "
              f"[{ml_a['fake_chunks']}/{ml_a['total_chunks']} chunks]")

        ml_b = None
        if self._has_b:
            print("  [ML-B] Wav2Vec2 model...")
            ml_b = score_ml(audio_ml, self.fe_b, self.model_b, ML_TEMP_B)
            print(f"    fake={ml_b['fake_prob']*100:.1f}%  "
                  f"[{ml_b['fake_chunks']}/{ml_b['total_chunks']} chunks]")

        # Deepfake model score: combine ML models
        deepfake_ml = ml_a["fake_prob"]
        if ml_b:
            deepfake_ml = 0.7 * ml_a["fake_prob"] + 0.3 * ml_b["fake_prob"]

        # ── STEP 6: Artifact Analysis (8 frequency signals) ──
        print(f"\n  [STEP 6] Artifact Analysis...")
        signals  = run_signals(audio_hq)
        fs, override = freq_combined(signals)
        print(f"\n  [FREQ] Combined: {fs*100:.1f}%"
              f"{'  <- OVERRIDE ACTIVE' if override else ''}")

        fv = sum(1 for v in signals.values() if v > 0.55)
        rv = sum(1 for v in signals.values() if v < 0.45)

        # ── STEP 7: Breathing Detection ──
        print(f"\n  [STEP 7] Breathing Detection...")
        breathing = detect_breathing(audio_hq, TARGET_SR, speech_segments)

        # ── STEP 8: Authenticity Scoring ──
        print(f"\n  [STEP 8] Authenticity Scoring...")

        # Map to 4-component scoring formula:
        # Deepfake Model (55%): ML model ensemble -- primary signal
        deepfake_component = deepfake_ml

        # Speaker Verification (10%): Resemblyzer consistency
        speaker_component = spkr_result.get("speaker_score", 0.5)
        # Check if speaker verification was actually reliable
        speaker_reliable = (spkr_result.get("n_segments", 0) >= 2 and
                            spkr_result.get("mean_similarity", 0.0) > 0.0)

        # Artifact Detection (25%): frequency signals
        artifact_component = fs

        # Noise Analysis (10%): noise floor + breathing
        noise_floor_score = signals.get("noise_floor", 0.5)
        breathing_score = breathing["breathing_score"]
        noise_component = 0.5 * noise_floor_score + 0.5 * breathing_score

        scores = compute_authenticity_score(
            deepfake_component, speaker_component,
            artifact_component, noise_component,
            speaker_reliable=speaker_reliable,
        )

        # ── Tool Classification ──
        print("\n  [TOOL] Classifying source tool...")
        tool = classify_tool(audio_hq, signals, scores["fake"])
        print(f"    Most likely: {tool['top_tool']} "
              f"({tool['confidence']*100:.1f}%)")

        # ── Verdict ──
        label, conf, verdict, warning = build_verdict(
            scores, signals, override, fv, rv, ml_a, tool
        )

        # Cleanup temp file
        if wav_path and os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except OSError:
                pass

        return {
            "file":           str(file_path),
            "verdict":        verdict,
            "label":          label,
            "confidence":     conf,
            "confidence_pct": f"{conf*100:.1f}%",
            "fake_prob":      round(scores["fake"], 4),
            "real_prob":      round(scores["real"], 4),
            "override":       override,
            "source_tool":    tool["top_tool"],
            "tool_scores":    tool["all_scores"],
            "tool_conf":      tool["confidence"],
            "ml_a":           ml_a,
            "ml_b":           ml_b,
            "freq_score":     round(fs, 4),
            "signals":        {k: {"value": round(v, 4), "score": round(v, 4), "vote": "fake" if v > 0.55 else "real" if v < 0.45 else "uncertain"} for k, v in signals.items()},
            "freq_votes":     {"fake": fv, "real": rv, "uncertain": 8 - fv - rv},
            "warning":        warning,
            # New pipeline data
            "authenticity_score": scores,
            "vad": {
                "segments": len(speech_segments),
                "speech_ratio": round(vad_result["speech_ratio"], 4),
            },
            "mfcc": {
                "regularity_score": mfcc_features.get("mfcc_regularity_score", 0),
            },
            "speaker_verification": {
                "similarity": spkr_result.get("mean_similarity", 0),
                "score": spkr_result.get("speaker_score", 0.5),
            },
            "breathing": {
                "score": breathing["breathing_score"],
                "count": breathing["breath_count"],
                "intervals": breathing["breath_intervals"],
            },
            "timeline": ml_a.get("chunk_details", []),
            "duration": dur,
        }

    def detect_batch(self, paths: list) -> list:
        results = []
        for p in paths:
            try:
                r = self.detect(p)
                print_result(r)
                results.append(r)
            except Exception as e:
                print(f"[ERROR] {p}: {e}")
                results.append({"file": str(p), "error": str(e)})
        return results


# ==============================================
#  OUTPUT
# ==============================================

def _bar(v, w=28):
    f = int(v * w)
    return "#" * f + "." * (w - f)

def print_result(r: dict):
    if "error" in r:
        print(f"\n  [X] ERROR: {r['error']}")
        return

    fp   = r["fake_prob"]
    rp   = r["real_prob"]
    sig  = r.get("signals", {})
    fv   = r.get("freq_votes", {})
    mla  = r.get("ml_a", {})
    mlb  = r.get("ml_b", {})
    ts   = r.get("tool_scores", {})
    tool = r.get("source_tool", "Unknown")
    tag  = TOOL_TAGS.get(tool, "[???]")
    ovr  = r.get("override", False)
    auth = r.get("authenticity_score", {})
    vad  = r.get("vad", {})
    mfcc = r.get("mfcc", {})
    spkr = r.get("speaker_verification", {})
    brth = r.get("breathing", {})

    print(f"\n  +== FINAL RESULT {'='*42}")
    print(f"  |")
    print(f"  |  VERDICT       : {r['verdict']}")
    if ovr:
        print(f"  |  Override      : HF+CPP both high -> forced FAKE")
    print(f"  |  Confidence    : {r['confidence_pct']}")
    print(f"  |  Source Tool   : {tag} {tool}  "
          f"({r['tool_conf']*100:.1f}% match)")
    print(f"  |")
    print(f"  |  fake  {fp*100:5.1f}%  {_bar(fp)}")
    print(f"  |  real  {rp*100:5.1f}%  {_bar(rp)}")
    print(f"  |")

    # Authenticity Score Breakdown
    breakdown = auth.get("breakdown", {})
    weights   = auth.get("weights", {})
    if breakdown:
        print(f"  |  -- Authenticity Score ({W_DEEPFAKE}/{W_SPEAKER}/{W_ARTIFACT}/{W_NOISE}) ----------")
        print(f"  |  Deepfake Model  ({weights.get('deepfake_model',0):.0%}): "
              f"{breakdown.get('deepfake_model',0)*100:5.1f}%  "
              f"{_bar(breakdown.get('deepfake_model',0), 20)}")
        print(f"  |  Speaker Verif   ({weights.get('speaker_verification',0):.0%}): "
              f"{breakdown.get('speaker_verification',0)*100:5.1f}%  "
              f"{_bar(breakdown.get('speaker_verification',0), 20)}")
        print(f"  |  Artifact Detect ({weights.get('artifact_detection',0):.0%}): "
              f"{breakdown.get('artifact_detection',0)*100:5.1f}%  "
              f"{_bar(breakdown.get('artifact_detection',0), 20)}")
        print(f"  |  Noise Analysis  ({weights.get('noise_analysis',0):.0%}): "
              f"{breakdown.get('noise_analysis',0)*100:5.1f}%  "
              f"{_bar(breakdown.get('noise_analysis',0), 20)}")
        print(f"  |")

    # VAD
    if vad:
        print(f"  |  -- Voice Activity Detection ---------------------")
        print(f"  |  Speech segments : {vad.get('segments', 0)}")
        print(f"  |  Speech ratio    : {vad.get('speech_ratio', 0)*100:.1f}%")
        print(f"  |")

    # MFCC
    if mfcc:
        print(f"  |  -- MFCC Features --------------------------------")
        print(f"  |  Regularity score: {mfcc.get('regularity_score',0)*100:.1f}%")
        print(f"  |")

    # Speaker Verification
    if spkr:
        print(f"  |  -- Speaker Verification (Resemblyzer) -----------")
        print(f"  |  Mean similarity : {spkr.get('similarity', 0):.3f}")
        print(f"  |  Speaker score   : {spkr.get('score', 0)*100:.1f}%  "
              f"{_bar(spkr.get('score', 0), 20)}")
        print(f"  |")

    # Breathing
    if brth:
        print(f"  |  -- Breathing Detection --------------------------")
        print(f"  |  Breaths found   : {brth.get('count', 0)}")
        intervals = brth.get('intervals', [])
        if intervals:
            print(f"  |  Mean interval   : {np.mean(intervals):.1f}s")
        print(f"  |  Breathing score : {brth.get('score', 0)*100:.1f}%  "
              f"{_bar(brth.get('score', 0), 20)}")
        print(f"  |")

    print(f"  |  -- Tool Classification --------------------------")
    for t, sc in sorted(ts.items(), key=lambda x: x[1], reverse=True):
        tic    = TOOL_TAGS.get(t, "[???]")
        bar    = "#" * int(sc * 24) + "." * (24 - int(sc * 24))
        marker = " <-" if t == tool else ""
        print(f"  |  {tic} {t:<14} {sc*100:5.1f}%  {bar}{marker}")
    print(f"  |")
    print(f"  |  -- ML Models ------------------------------------")
    print(f"  |  XLS-R    fake={mla.get('fake_prob',0)*100:.1f}%  "
          f"[{mla.get('fake_chunks',0)}/{mla.get('total_chunks',0)} chunks]")
    if mlb:
        print(f"  |  Wav2Vec2 fake={mlb.get('fake_prob',0)*100:.1f}%  "
              f"[{mlb.get('fake_chunks',0)}/{mlb.get('total_chunks',0)} chunks]")
    print(f"  |")
    print(f"  |  -- Frequency Signals ----------------------------")
    print(f"  |  Votes: [FAKE] {fv.get('fake',0)}/8  "
          f"[REAL] {fv.get('real',0)}/8  "
          f"[----] {fv.get('uncertain',0)}/8")
    if ovr:
        print(f"  |  * HF + CPP override active")
    for key, label in SIGNAL_LABELS.items():
        val = sig.get(key, 0.5)
        if val > 0.55:
            ic = "FAKE"
        elif val < 0.45:
            ic = "REAL"
        else:
            ic = "----"
        bar  = "#" * int(val * 16) + "." * (16 - int(val * 16))
        star = " *" if (key in ("hf_energy", "cpp") and ovr) else ""
        print(f"  |  [{ic:4s}] {label}  {val*100:5.1f}%  {bar}{star}")
    if r.get("warning"):
        print(f"  |")
        print(f"  |  {r['warning']}")
    print(f"  +{'='*57}")


# ==============================================
#  CLI
# ==============================================

def main():
    if len(sys.argv) < 2:
        print("\nUsage: python audio_deepfake_detector.py <file> [<file2>...]")
        sys.exit(1)

    files = sys.argv[1:]
    valid = [f for f in files if os.path.exists(f)]
    for f in files:
        if not os.path.exists(f):
            print(f"[WARNING] Not found: {f}")
    if not valid:
        print("[ERROR] No valid files.")
        sys.exit(1)

    d = DeepfakeDetector()

    if len(valid) == 1:
        r = d.detect(valid[0])
        print_result(r)
    else:
        results = d.detect_batch(valid)
        print(f"\n{'='*72}")
        print("  BATCH SUMMARY")
        print(f"{'='*72}")
        print(f"  {'File':<24} {'Verdict':<38} {'Conf':>5}  {'Tool':<14}")
        print(f"  {'-'*70}")
        for r in results:
            if "error" not in r:
                fname = Path(r["file"]).name[:23]
                tic   = TOOL_TAGS.get(r.get("source_tool", ""), "[???]")
                ttool = r.get("source_tool", "?")[:13]
                ovr   = " *" if r.get("override") else ""
                print(f"  {fname:<24} {r['verdict']:<38} "
                      f"{r['confidence_pct']:>5}  {tic}{ttool}{ovr}")
            else:
                print(f"  {Path(r['file']).name:<24}  ERROR: {r['error']}")
        print(f"{'='*72}")


if __name__ == "__main__":
    main()
