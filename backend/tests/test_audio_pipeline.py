"""End-to-end checks for the audio detector with fake ML models.

The fake model always says "fake" with high confidence. If the pipeline ever
skips or replaces the ML score (as an earlier version did for short speech
segments), the deepfake_model component stops matching and these tests fail.
"""

import types

import numpy as np
import pytest
import soundfile as sf

SR = 22050


def speechlike(bursts, total, gap=0.6, sr=SR):
    """Harmonic 'phrases' separated by silence, like conversational speech."""
    rng = np.random.default_rng(0)
    audio = np.zeros(int(total * sr), dtype=np.float32)
    t0 = 0.3
    for dur in bursts:
        n = int(dur * sr)
        t = np.arange(n) / sr
        f0 = 120 + 30 * np.sin(2 * np.pi * 3 * t)
        phase = 2 * np.pi * np.cumsum(f0) / sr
        sig = sum(np.sin(k * phase) / k for k in range(1, 12))
        sig *= 0.5 + 0.5 * np.sin(2 * np.pi * 4 * t) ** 2
        start = int(t0 * sr)
        audio[start:start + n] += 0.4 * sig.astype(np.float32)
        t0 += dur + gap
    return audio + 0.002 * rng.standard_normal(len(audio)).astype(np.float32)


@pytest.fixture
def detector(det_module, monkeypatch):
    fake_model = types.SimpleNamespace(
        config=types.SimpleNamespace(id2label={0: "fake", 1: "real"}))
    monkeypatch.setattr(det_module, "load_hf_model", lambda _id: (None, fake_model))
    monkeypatch.setattr(det_module, "infer_chunk",
                        lambda chunk, fe, model: np.array([3.0, -3.0]))
    monkeypatch.setattr(det_module, "preprocess_with_ffmpeg", lambda *_a, **_k: None)
    return det_module.DeepfakeDetector()


def run(detector, tmp_path, audio):
    path = tmp_path / "clip.wav"
    sf.write(path, audio, SR)
    return detector.detect(str(path))


@pytest.mark.parametrize("bursts,total", [
    ([1.5] * 10, 22),   # conversational: many short phrases
    ([12.0], 14),       # one long monologue
    ([3.0] * 12, 45),   # more than 8 phrases
])
def test_ml_score_is_used_for_all_speech(detector, tmp_path, bursts, total):
    r = run(detector, tmp_path, speechlike(bursts, total))
    expected = r["ml_a"]["fake_prob"]
    if r["ml_b"]:
        expected = 0.7 * r["ml_a"]["fake_prob"] + 0.3 * r["ml_b"]["fake_prob"]

    assert r["ml_a"]["fake_prob"] > 0.9
    assert r["authenticity_score"]["breakdown"]["deepfake_model"] == pytest.approx(expected, abs=1e-3)
    assert r["ml_b"] is not None, "Model B result must be kept"
    assert r["ml_a"]["fake_chunks"] == r["ml_a"]["total_chunks"] > 0


def test_speech_focused_scoring_covers_all_speech(detector, tmp_path):
    r = run(detector, tmp_path, speechlike([3.0] * 12, 45))
    assert r["analysis_mode"] == "speech_focused"
    # 36 s of speech in 4 s chunks with 1 s overlap -> ~12 chunks, not just 8 segments' worth
    assert r["ml_a"]["total_chunks"] >= 10


def test_timeline_is_chronological_and_inside_file(detector, tmp_path):
    r = run(detector, tmp_path, speechlike([1.5] * 10, 22))
    starts = [c["start"] for c in r["timeline"]]
    assert starts == sorted(starts)
    assert all(0 <= c["start"] <= c["end"] <= r["duration"] + 0.05 for c in r["timeline"])
    # every chunk must start inside a detected speech region (not in a silence)
    regions = [(s["start_sec"], s["end_sec"]) for s in r["vad"]["speech_segments"]]
    for c in r["timeline"]:
        assert any(lo - 0.05 <= c["start"] <= hi + 0.05 for lo, hi in regions), c


def test_label_always_agrees_with_fake_probability(detector, tmp_path):
    r = run(detector, tmp_path, speechlike([2.0] * 6, 16))
    if r["label"] == "fake":
        assert r["fake_prob"] >= 0.5
    elif r["label"] == "real":
        assert r["fake_prob"] < 0.5
    assert "[" not in r["verdict"], "verdict must be user-facing text, not debug tags"


# ── Pure helpers ──

def test_speech_time_mapping(det_module):
    # speech at 1-3 s and 5-6 s of the original file
    spans = [(0.0, 1.0, 2.0), (2.0, 5.0, 1.0)]
    m = det_module.speech_time_to_original
    assert m(0.0, spans) == 1.0
    assert m(1.5, spans) == 2.5
    assert m(2.5, spans) == 5.5
    assert m(10.0, spans) == 6.0  # padded chunk end clamps to last speech end


def test_build_speech_track_resamples_indices(det_module):
    audio = np.arange(16000 * 4, dtype=np.float32)          # 4 s at 16 kHz
    segments = [(22050, 2 * 22050), (3 * 22050, 4 * 22050)]  # 1-2 s and 3-4 s at 22.05 kHz
    track, spans = det_module.build_speech_track(audio, segments, 22050, 16000)
    assert len(track) == 2 * 16000
    assert spans[0] == pytest.approx((0.0, 1.0, 1.0))
    assert spans[1] == pytest.approx((1.0, 3.0, 1.0))


def test_override_lifts_score_to_match_fake_label(det_module):
    scores = {"fake": 0.35, "real": 0.65, "total": 0.35}
    signals = {k: 0.5 for k in det_module.SIGNAL_FNS}
    label, conf, verdict, _warning, reason = det_module.build_verdict(
        scores, signals, True, 2, 2, {"fake_prob": 0.2}, {"top_tool": "x"})
    assert label == "fake"
    assert verdict == "AI-GENERATED"
    assert reason == "artifact_override"
    assert scores["fake"] == det_module.OVERRIDE_FAKE_SCORE
    assert conf == pytest.approx(det_module.OVERRIDE_FAKE_SCORE)
    assert scores["override_applied"] is True
