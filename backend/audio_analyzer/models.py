"""
wav2vec2-based audio deepfake detector.
Uses facebook/wav2vec2-base with a simple classification head.
Falls back to forensic-features-only mode if transformers is not installed.
"""

import numpy as np
from typing import Optional

_pipeline = None
_TRANSFORMERS_AVAILABLE = False


def _try_load_model():
    """Lazy-load wav2vec2 model, return True if successful."""
    global _pipeline, _TRANSFORMERS_AVAILABLE
    if _pipeline is not None:
        return True
    try:
        from transformers import pipeline as hf_pipeline
        _pipeline = hf_pipeline(
            "audio-classification",
            model="facebook/wav2vec2-base",
            device=-1,  # CPU
        )
        _TRANSFORMERS_AVAILABLE = True
        return True
    except Exception as e:
        print(f"[AudioModel] wav2vec2 not available: {e}. Using forensic features only.")
        _TRANSFORMERS_AVAILABLE = False
        return False


def classify_chunk(audio_chunk: np.ndarray, sr: int = 16000) -> dict:
    """
    Run deepfake classification on a single audio chunk.
    Returns {'label': 'FAKE'|'REAL', 'score': float, 'method': str}
    """
    if _try_load_model() and _pipeline is not None:
        try:
            # wav2vec2 expects raw 16kHz float32 audio
            result = _pipeline({"array": audio_chunk.astype(np.float32), "sampling_rate": sr})
            top = max(result, key=lambda x: x["score"])
            label = "FAKE" if "fake" in top["label"].lower() or "spoof" in top["label"].lower() else "REAL"
            return {"label": label, "score": float(top["score"]), "method": "wav2vec2"}
        except Exception as e:
            print(f"[AudioModel] inference error: {e}")

    # Fallback: use forensic features heuristic
    return _forensic_heuristic(audio_chunk, sr)


def _forensic_heuristic(audio: np.ndarray, sr: int = 16000) -> dict:
    """
    Rule-based fake detection from acoustic features when ML model is unavailable.
    Returns same format as classify_chunk.
    """
    try:
        from .preprocessor import extract_forensic_features
        features = extract_forensic_features(audio, sr)
        anomaly = features.get("overall_anomaly_score", 0.5)
        label = "FAKE" if anomaly > 0.5 else "REAL"
        return {
            "label": label,
            "score": float(anomaly if label == "FAKE" else 1.0 - anomaly),
            "method": "forensic_heuristic",
        }
    except Exception as e:
        print(f"[AudioModel] forensic heuristic error: {e}")
        return {"label": "UNKNOWN", "score": 0.5, "method": "error"}


def analyze_audio_chunks(chunks: list[dict], sr: int = 16000) -> list[dict]:
    """
    Analyze all audio chunks and return per-chunk results.
    Each result includes classification + forensic features.
    """
    from .preprocessor import extract_forensic_features

    results = []
    for chunk_data in chunks:
        audio = chunk_data["audio"]
        classification = classify_chunk(audio, sr)
        features = extract_forensic_features(audio, sr)

        results.append({
            "start_ms": chunk_data["start_ms"],
            "end_ms": chunk_data["end_ms"],
            "label": classification["label"],
            "confidence": classification["score"],
            "method": classification["method"],
            "forensic_features": features,
        })

    return results


def aggregate_results(chunk_results: list[dict]) -> dict:
    """
    Aggregate per-chunk results into a single verdict.
    """
    if not chunk_results:
        return {
            "verdict": "UNKNOWN",
            "confidence": 0.0,
            "truth_score": 50,
            "fake_chunks": 0,
            "total_chunks": 0,
            "fake_ratio": 0.0,
        }

    fake_chunks = [r for r in chunk_results if r["label"] == "FAKE"]
    fake_ratio = len(fake_chunks) / len(chunk_results)

    # Weighted verdict: >30% fake chunks → FAKE verdict
    verdict = "FAKE" if fake_ratio > 0.3 else "REAL"
    confidence = np.mean([r["confidence"] for r in chunk_results])

    truth_score = (
        int((1 - confidence) * 100) if verdict == "FAKE"
        else int(confidence * 100)
    )

    # Aggregate forensic features across all chunks
    all_anomaly_scores = [
        r["forensic_features"].get("overall_anomaly_score", 0.5)
        for r in chunk_results
        if "forensic_features" in r
    ]

    return {
        "verdict": verdict,
        "confidence": round(float(confidence) * 100, 2),
        "truth_score": truth_score,
        "fake_chunks": len(fake_chunks),
        "total_chunks": len(chunk_results),
        "fake_ratio": round(fake_ratio * 100, 1),
        "avg_anomaly_score": round(float(np.mean(all_anomaly_scores)), 3) if all_anomaly_scores else 0.5,
        "chunk_results": chunk_results,
    }
