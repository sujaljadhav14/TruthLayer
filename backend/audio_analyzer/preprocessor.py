"""
Audio preprocessor — splits audio into overlapping chunks for deepfake analysis.
Also extracts forensic features: MFCCs, pitch, spectral flux, formants.
"""

import os
import tempfile
import numpy as np
from pathlib import Path
from typing import Optional

# Lazy imports — only loaded when needed to avoid startup cost
_librosa = None
_soundfile = None


def _get_librosa():
    global _librosa
    if _librosa is None:
        import librosa
        _librosa = librosa
    return _librosa


def _get_sf():
    global _soundfile
    if _soundfile is None:
        import soundfile as sf
        _soundfile = sf
    return _soundfile


def extract_audio_from_video(video_path: str, target_sr: int = 16000) -> Optional[np.ndarray]:
    """
    Extract audio track from a video file.
    Returns a 1-D float32 numpy array at target_sr, or None if no audio.
    """
    lr = _get_librosa()
    try:
        y, _ = lr.load(video_path, sr=target_sr, mono=True)
        return y
    except Exception as e:
        print(f"[AudioPreprocessor] Could not extract audio: {e}")
        return None


def load_audio_file(audio_path: str, target_sr: int = 16000) -> np.ndarray:
    """Load a standalone audio file (wav, mp3, flac, etc.)"""
    lr = _get_librosa()
    y, _ = lr.load(audio_path, sr=target_sr, mono=True)
    return y


def split_into_chunks(
    audio: np.ndarray,
    sr: int = 16000,
    chunk_sec: float = 2.0,
    hop_sec: float = 0.5,
) -> list[dict]:
    """
    Split audio into overlapping windows.
    Returns list of {'audio': np.ndarray, 'start_ms': int, 'end_ms': int}
    """
    chunk_samples = int(chunk_sec * sr)
    hop_samples = int(hop_sec * sr)
    chunks = []

    start = 0
    while start + chunk_samples <= len(audio):
        chunk = audio[start : start + chunk_samples]
        chunks.append({
            "audio": chunk,
            "start_ms": int(start / sr * 1000),
            "end_ms": int((start + chunk_samples) / sr * 1000),
        })
        start += hop_samples

    # Include last partial chunk if ≥ 0.5s
    if start < len(audio) and (len(audio) - start) >= sr * 0.5:
        chunk = audio[start:]
        # Pad to chunk_samples with zeros
        chunk = np.pad(chunk, (0, chunk_samples - len(chunk)))
        chunks.append({
            "audio": chunk,
            "start_ms": int(start / sr * 1000),
            "end_ms": int(len(audio) / sr * 1000),
        })

    return chunks


def extract_forensic_features(audio: np.ndarray, sr: int = 16000) -> dict:
    """
    Extract forensic-grade audio features for deepfake detection.
    Returns a dict of scalar anomaly scores (higher = more suspicious).
    """
    lr = _get_librosa()

    features = {}

    # ── MFCCs (13 coefficients) ──────────────────────────────────────────
    mfccs = lr.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
    features["mfcc_mean"] = float(np.mean(mfccs))
    features["mfcc_std"] = float(np.std(mfccs))
    # High variance in MFCCs can indicate splicing
    features["mfcc_variance_anomaly"] = float(np.var(np.std(mfccs, axis=1)))

    # ── Pitch / F0 ───────────────────────────────────────────────────────
    pitches, magnitudes = lr.piptrack(y=audio, sr=sr)
    pitch_vals = pitches[magnitudes > np.max(magnitudes) * 0.1]
    if len(pitch_vals) > 0:
        features["pitch_mean"] = float(np.mean(pitch_vals))
        features["pitch_std"] = float(np.std(pitch_vals))
        # Abnormally low std = synthetic/flat pitch
        features["pitch_anomaly"] = float(
            max(0.0, 1.0 - np.clip(np.std(pitch_vals) / 50.0, 0, 1))
        )
    else:
        features["pitch_mean"] = 0.0
        features["pitch_std"] = 0.0
        features["pitch_anomaly"] = 1.0  # No detected pitch = suspicious

    # ── Spectral Flux (energy change between frames) ─────────────────────
    spectral_flux = np.mean(
        np.abs(np.diff(lr.feature.melspectrogram(y=audio, sr=sr), axis=1))
    )
    features["spectral_flux"] = float(spectral_flux)
    # Unusually low flux = static/synthesized audio
    features["spectral_flux_anomaly"] = float(
        max(0.0, 1.0 - np.clip(spectral_flux / 10.0, 0, 1))
    )

    # ── Spectral Centroid ─────────────────────────────────────────────────
    centroid = lr.feature.spectral_centroid(y=audio, sr=sr)
    features["spectral_centroid_mean"] = float(np.mean(centroid))
    features["spectral_centroid_std"] = float(np.std(centroid))

    # ── Zero Crossing Rate ────────────────────────────────────────────────
    zcr = lr.feature.zero_crossing_rate(y=audio)
    features["zcr_mean"] = float(np.mean(zcr))

    # ── RMS Energy ───────────────────────────────────────────────────────
    rms = lr.feature.rms(y=audio)
    features["rms_mean"] = float(np.mean(rms))
    features["rms_std"] = float(np.std(rms))

    # ── Overall anomaly score (0=normal, 1=very suspicious) ───────────────
    anomaly_signals = [
        features.get("pitch_anomaly", 0),
        features.get("spectral_flux_anomaly", 0),
        features.get("mfcc_variance_anomaly", 0) / 10.0,  # normalize
    ]
    features["overall_anomaly_score"] = float(np.clip(np.mean(anomaly_signals), 0, 1))

    return features
