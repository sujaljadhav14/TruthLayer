"""
Audio deepfake analyzer API routes.
POST /analyze-audio  — upload audio/video file, get deepfake verdict
GET  /analyze-audio/status — check if audio analyzer is ready
"""

import os
import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter(tags=["Audio Analysis"])

SUPPORTED_AUDIO = {"audio/wav", "audio/mp3", "audio/mpeg", "audio/flac", "audio/ogg", "audio/x-wav"}
SUPPORTED_VIDEO = {"video/mp4", "video/avi", "video/quicktime", "video/x-msvideo", "video/webm"}


@router.post("/analyze-audio")
async def analyze_audio(file: UploadFile = File(...)):
    """
    Analyze audio (or extract audio from video) for deepfake detection.

    Accepts: audio files (wav, mp3, flac) or video files (mp4, avi, mov)
    Returns: verdict, confidence, truth_score, chunk-level timeline, forensic features
    """
    content_type = file.content_type or ""
    is_video = content_type in SUPPORTED_VIDEO
    is_audio = content_type in SUPPORTED_AUDIO

    # Accept based on extension if content type is unrecognized
    if not is_video and not is_audio:
        ext = Path(file.filename or "").suffix.lower()
        if ext in {".mp4", ".avi", ".mov", ".webm", ".mkv"}:
            is_video = True
        elif ext in {".wav", ".mp3", ".flac", ".ogg", ".m4a"}:
            is_audio = True
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Upload audio (wav/mp3/flac) or video (mp4/avi/mov).",
            )

    suffix = Path(file.filename or "file").suffix or (".mp4" if is_video else ".wav")
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)

    try:
        shutil.copyfileobj(file.file, tmp)
        tmp.close()

        from audio_analyzer.preprocessor import (
            extract_audio_from_video,
            load_audio_file,
            split_into_chunks,
            extract_forensic_features,
        )
        from audio_analyzer.models import analyze_audio_chunks, aggregate_results

        # Load audio
        SR = 16000
        if is_video:
            audio = extract_audio_from_video(tmp.name, target_sr=SR)
            if audio is None:
                raise HTTPException(
                    status_code=422,
                    detail="No audio track found in the video file.",
                )
        else:
            audio = load_audio_file(tmp.name, target_sr=SR)

        # Split and analyze
        chunks = split_into_chunks(audio, sr=SR, chunk_sec=2.0, hop_sec=0.5)
        if not chunks:
            raise HTTPException(status_code=422, detail="Audio too short (minimum 0.5 seconds).")

        chunk_results = analyze_audio_chunks(chunks, sr=SR)
        summary = aggregate_results(chunk_results)

        # Overall forensic features from full audio
        overall_forensic = extract_forensic_features(audio, sr=SR)

        return {
            **summary,
            "filename": file.filename,
            "source": "video_audio" if is_video else "audio_file",
            "duration_ms": int(len(audio) / SR * 1000),
            "sample_rate": SR,
            "forensic_features": overall_forensic,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio analysis failed: {str(e)}")
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass


@router.get("/analyze-audio/status")
async def audio_status():
    """Check if audio analyzer dependencies are available."""
    status = {"ready": False, "librosa": False, "wav2vec2": False}
    try:
        import librosa  # noqa
        status["librosa"] = True
    except ImportError:
        pass

    try:
        from transformers import pipeline  # noqa
        status["wav2vec2"] = True
    except ImportError:
        pass

    status["ready"] = status["librosa"]
    return status
