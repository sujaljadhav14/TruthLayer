import numpy as np


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


def test_vad_detects_speech(det_module):
    sr = 16000
    a = make_synthetic_speech(sr=sr)
    res = det_module.extract_speech_segments(a, sr)
    assert 'segments' in res
    assert res['segments'], "VAD should detect at least one speech segment"


def test_split_chunks_length(det_module):
    sr = 16000
    dur = 7.0
    a = np.random.randn(int(sr * dur)).astype(np.float32)
    chunks = det_module.split_chunks(a, sr, csec=4.0, osec=1.0)
    assert isinstance(chunks, list)
    # For 7s with 4s chunks and 1s overlap, expect at least 2 chunks
    assert len(chunks) >= 2


def test_speech_summary_fields(det_module):
    sr = 16000
    segments = [(0, sr), (2 * sr, 3 * sr)]
    summary = det_module.summarize_speech_segments(segments, audio_len=4 * sr, sr=sr)

    assert summary["speech_segments_count"] == 2
    assert summary["speech_segments"][0]["start_sec"] == 0.0
    assert summary["speech_segments"][0]["end_sec"] == 1.0
    assert summary["speech_segments"][1]["duration_sec"] == 1.0
    assert summary["speech_ratio"] == 0.5
