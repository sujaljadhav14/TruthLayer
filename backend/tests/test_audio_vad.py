import contextlib
import importlib.util
import sys
import types
from pathlib import Path

import numpy as np


def _install_module_stubs():
    """Install lightweight stubs so the detector module can be imported in CI.

    The full audio stack pulls in heavy ML dependencies that are not required
    for these unit tests. We only need the pure chunking/VAD helper logic.
    """
    torch_stub = types.SimpleNamespace(
        cuda=types.SimpleNamespace(is_available=lambda: False),
        no_grad=contextlib.nullcontext,
        device=lambda *_args, **_kwargs: None,
    )
    transformers_stub = types.SimpleNamespace(
        AutoFeatureExtractor=types.SimpleNamespace(from_pretrained=lambda *_args, **_kwargs: None),
        AutoModelForAudioClassification=types.SimpleNamespace(from_pretrained=lambda *_args, **_kwargs: None),
    )

    class _FakeVad:
        def __init__(self, aggressiveness):
            self.aggressiveness = aggressiveness

        def is_speech(self, frame_bytes, sample_rate):
            return any(frame_bytes)

    webrtcvad_stub = types.SimpleNamespace(Vad=_FakeVad)

    librosa_stub = types.SimpleNamespace(
        resample=lambda audio, orig_sr, target_sr: audio,
        load=lambda path, sr=None, mono=True: (np.array([], dtype=np.float32), sr),
        feature=types.SimpleNamespace(rms=lambda **_kwargs: np.array([[0.0]])),
        stft=lambda *args, **kwargs: np.zeros((2, 2), dtype=np.complex64),
        fft_frequencies=lambda **_kwargs: np.array([0.0, 1000.0]),
        util=types.SimpleNamespace(frame=lambda audio, frame_length, hop_length: np.array([audio[:frame_length]])),
        note_to_hz=lambda note: 0.0,
        pyin=lambda *args, **kwargs: (None, None, None),
        feature_extractor=None,
    )

    scipy_stub = types.SimpleNamespace(
        signal=types.SimpleNamespace(find_peaks=lambda *args, **kwargs: (np.array([], dtype=int), {"prominences": np.array([])})),
        stats=types.SimpleNamespace(skew=lambda *args, **kwargs: 0.0, entropy=lambda hist: 0.0, linregress=lambda *args, **kwargs: (0.0, 0.0, 0.0, 0.0, 0.0)),
    )

    sys.modules.setdefault("torch", torch_stub)
    sys.modules.setdefault("transformers", transformers_stub)
    sys.modules.setdefault("webrtcvad", webrtcvad_stub)
    sys.modules.setdefault("librosa", librosa_stub)
    sys.modules.setdefault("scipy", scipy_stub)
    sys.modules.setdefault("scipy.signal", scipy_stub.signal)
    sys.modules.setdefault("scipy.stats", scipy_stub.stats)


_install_module_stubs()

MODULE_PATH = Path(__file__).resolve().parent.parent / "audio" / "audio_deepfake_detector.py"
spec = importlib.util.spec_from_file_location("audio_deepfake_detector", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
assert spec.loader is not None
spec.loader.exec_module(module)

extract_speech_segments = module.extract_speech_segments
split_chunks = module.split_chunks
summarize_speech_segments = module.summarize_speech_segments


def make_synthetic_speech(sr=16000, total_sec=5.0, speech_start=1.0, speech_dur=2.0):
    t = np.linspace(0, total_sec, int(total_sec * sr), endpoint=False)
    audio = np.zeros_like(t)
    # speech-like sine wave segment
    start = int(speech_start * sr)
    end = int((speech_start + speech_dur) * sr)
    audio[start:end] = 0.6 * np.sin(2 * np.pi * 220 * t[: end - start])
    # add small noise
    audio += 0.001 * np.random.randn(len(t))
    return audio.astype(np.float32)


def test_vad_detects_speech():
    sr = 16000
    a = make_synthetic_speech(sr=sr)
    res = extract_speech_segments(a, sr)
    assert 'segments' in res
    assert res['segments'], "VAD should detect at least one speech segment"


def test_split_chunks_length():
    sr = 16000
    dur = 7.0
    a = np.random.randn(int(sr * dur)).astype(np.float32)
    chunks = split_chunks(a, sr, csec=4.0, osec=1.0)
    assert isinstance(chunks, list)
    # For 7s with 4s chunks and 1s overlap, expect at least 2 chunks
    assert len(chunks) >= 2


def test_speech_summary_fields():
    sr = 16000
    segments = [(0, sr), (2 * sr, 3 * sr)]
    summary = summarize_speech_segments(segments, audio_len=4 * sr, sr=sr)

    assert summary["speech_segments_count"] == 2
    assert summary["speech_segments"][0]["start_sec"] == 0.0
    assert summary["speech_segments"][0]["end_sec"] == 1.0
    assert summary["speech_segments"][1]["duration_sec"] == 1.0
    assert summary["speech_ratio"] == 0.5
