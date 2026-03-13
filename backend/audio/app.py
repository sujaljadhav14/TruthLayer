"""
FastAPI server for Audio Deepfake Detection
============================================
Run:  uvicorn app:app --host 0.0.0.0 --port 8001 --reload
Test: curl -X POST -F "file=@audio_1.mp3" http://localhost:8001/analyze
"""

import os
import uuid
import shutil
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from audio_deepfake_detector import DeepfakeDetector, print_result

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="Audio Deepfake Detector API",
    description="Detects AI-generated speech, cloned voices, and edited audio",
    version="7.0",
)

detector = None


def get_detector():
    global detector
    if detector is None:
        detector = DeepfakeDetector()
    return detector


@app.on_event("startup")
async def startup():
    get_detector()


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": detector is not None}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """Upload an audio file and get deepfake analysis results."""
    ext = Path(file.filename).suffix.lower()
    if ext not in (".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".wma", ".webm"):
        raise HTTPException(400, f"Unsupported format: {ext}")

    # Save uploaded file
    file_id = uuid.uuid4().hex[:12]
    save_path = UPLOAD_DIR / f"{file_id}{ext}"
    try:
        with open(save_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        det = get_detector()
        result = det.detect(str(save_path))
        print_result(result)

        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(500, f"Detection failed: {str(e)}")
    finally:
        if save_path.exists():
            save_path.unlink()


@app.post("/analyze/batch")
async def analyze_batch(files: list[UploadFile] = File(...)):
    """Upload multiple audio files for batch analysis."""
    if len(files) > 10:
        raise HTTPException(400, "Maximum 10 files per batch")

    saved_paths = []
    try:
        for f in files:
            ext = Path(f.filename).suffix.lower()
            file_id = uuid.uuid4().hex[:12]
            save_path = UPLOAD_DIR / f"{file_id}{ext}"
            with open(save_path, "wb") as out:
                shutil.copyfileobj(f.file, out)
            saved_paths.append(str(save_path))

        det = get_detector()
        results = det.detect_batch(saved_paths)
        return JSONResponse(content={"results": results, "count": len(results)})
    except Exception as e:
        raise HTTPException(500, f"Batch detection failed: {str(e)}")
    finally:
        for p in saved_paths:
            try:
                os.remove(p)
            except OSError:
                pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
