"""
Heatmap API route.
POST /api/heatmap — upload a video, get back per-frame fake scores + Grad-CAM overlays.
"""

import os
import shutil
import tempfile
import subprocess
from pathlib import Path

import numpy as np
import cv2
import torch
import torch.nn.functional as F
from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter(tags=["Heatmap"])


def _get_globals():
    """Import globals from main.py at request time to avoid circular imports."""
    import main as m
    if m.VIDEO_MODEL is None or m.VIDEO_PROCESSOR is None:
        m.load_video_model()
    return m.VIDEO_MODEL, m.VIDEO_PROCESSOR, m.TORCH_MOD, m.F_MODULE


def _extract_raw_frames(video_path: str, num_frames: int = 20) -> list[np.ndarray]:
    """Extract evenly-spaced raw RGB frames (unpreprocessed) for overlay."""
    cap = cv2.VideoCapture(video_path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    interval = max(1, total // num_frames)
    frames = []
    count = 0
    while cap.isOpened() and len(frames) < num_frames:
        ret, frame = cap.read()
        if not ret:
            break
        if count % interval == 0:
            frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        count += 1
    cap.release()

    # Duplicate last frame if needed
    while len(frames) < num_frames and frames:
        frames.append(frames[-1].copy())

    return frames


@router.post("/heatmap")
async def generate_heatmap(file: UploadFile = File(...)):
    """
    Analyze a video and return:
    - per_frame_scores: list of fake probability per frame
    - frames: list of base64-encoded Grad-CAM overlay images (JPEG)
    - timeline: list of {frame_index, timestamp_ms, fake_score, is_suspicious}
    - verdict, confidence, truth_score (same as /analyze)
    """
    if not (file.content_type or "").startswith("video/"):
        ext = Path(file.filename or "").suffix.lower()
        if ext not in {".mp4", ".avi", ".mov", ".webm", ".mkv"}:
            raise HTTPException(status_code=400, detail="Video files only.")

    suffix = Path(file.filename or "video.mp4").suffix or ".mp4"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        shutil.copyfileobj(file.file, tmp)
        tmp.close()

        MODEL, PROCESSOR, TORCH_MOD, F_MODULE = _get_globals()

        # Extract preprocessed tensor + raw frames (20 frames — model's native sequence length)
        inputs = PROCESSOR(tmp.name)
        frames_tensor = inputs["pixel_values"]  # (1, seq_len, 3, H, W)
        seq_len = frames_tensor.shape[1]

        raw_frames = _extract_raw_frames(tmp.name, num_frames=seq_len)

        # Get video FPS for timestamps
        cap = cv2.VideoCapture(tmp.name)
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_ms = int((total_frames / fps) * 1000)
        cap.release()

        # ── Per-frame LSTM fake scores ──────────────────────────────────────
        from model.gradcam import per_frame_fake_scores, generate_gradcam, frame_to_base64

        # Per-frame scores — now returns (scores, overall_fake_prob)
        frame_scores, overall_fake_prob = per_frame_fake_scores(MODEL, frames_tensor)

        # Grad-CAM: highlight regions if fake, show minimal activation if real
        target_class = 1 if overall_fake_prob > 0.5 else 0

        try:
            heatmaps = generate_gradcam(MODEL, frames_tensor, target_class=target_class)
        except Exception as e:
            print(f"[Heatmap] Grad-CAM failed ({e}), using blank heatmaps")
            h, w = frames_tensor.shape[3], frames_tensor.shape[4]
            heatmaps = [np.zeros((h, w), dtype=np.float32)] * seq_len

        # ── Encode frames with overlays ─────────────────────────────────────
        encoded_frames = []
        for i in range(min(seq_len, len(raw_frames))):
            raw = raw_frames[i]
            # Resize raw frame for consistency
            raw_resized = cv2.resize(raw, (224, 224))
            hm = cv2.resize(heatmaps[i], (224, 224)) if i < len(heatmaps) else np.zeros((224, 224))
            b64 = frame_to_base64(raw_resized, hm, alpha=0.45)
            encoded_frames.append(b64)

        # ── Overall verdict using already-computed overall_fake_prob ─────────
        verdict = "FAKE" if overall_fake_prob > 0.5 else "REAL"
        confidence = overall_fake_prob if verdict == "FAKE" else (1.0 - overall_fake_prob)
        truth_score = int((1.0 - overall_fake_prob) * 100)

        # Suspicious threshold: fake_score > 50% of overall_fake_prob
        # (avoids showing suspicious frames when video is REAL)
        suspicion_threshold = max(0.3, overall_fake_prob * 0.5)

        return {
            "verdict": verdict,
            "confidence": round(confidence * 100, 2),
            "truth_score": truth_score,
            "filename": file.filename,
            "duration_ms": duration_ms,
            "total_frames_analyzed": seq_len,
            "per_frame_scores": [round(float(s), 4) for s in frame_scores],
            "timeline": [
                {
                    "frame_index": i,
                    "timestamp_ms": int(i * (duration_ms / max(seq_len, 1))),
                    "fake_score": round(float(s), 4),
                    "is_suspicious": float(s) > suspicion_threshold,
                }
                for i, s in enumerate(frame_scores)
            ],
            "frames": encoded_frames,
            "suspicious_frame_count": sum(1 for s in frame_scores if float(s) > suspicion_threshold),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Heatmap analysis failed: {str(e)}")
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass
