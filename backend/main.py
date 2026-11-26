"""
TruthLayer — Unified DeepFake Detection API (Video + Audio)
FastAPI server combining ResNext50+LSTM video detector and audio deepfake detector.

Run:
    cd backend
    pip install -r requirements.txt
    python main.py

The model weights (~226 MB) are downloaded automatically from HuggingFace
on first startup and cached in backend/model_cache/.
FFmpeg is required for audio analysis (install from https://ffmpeg.org).
"""

import os
import sys
import uuid
import glob
import tempfile
import shutil
from pathlib import Path

from dotenv import load_dotenv

# Use absolute path so .env is found regardless of working directory
load_dotenv(Path(__file__).parent / ".env")

# ── Ensure FFmpeg is on PATH (winget installs to a deep path) ───────────
def _add_ffmpeg_to_path():
    """Find FFmpeg installed by winget and add its bin/ dir to PATH."""
    if shutil.which("ffmpeg"):
        return  # already accessible
    winget_pkgs = os.path.expanduser(
        "~/AppData/Local/Microsoft/WinGet/Packages"
    )
    pattern = os.path.join(winget_pkgs, "Gyan.FFmpeg*", "ffmpeg*", "bin")
    matches = glob.glob(pattern)
    if matches:
        os.environ["PATH"] = matches[0] + os.pathsep + os.environ.get("PATH", "")
        print(f"Added FFmpeg to PATH: {matches[0]}")

_add_ffmpeg_to_path()

# Must be set before any huggingface_hub import
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ── Globals (loaded once at startup) ────────────────────────────────────
# Video globals
VIDEO_MODEL = None
VIDEO_PROCESSOR = None
TORCH_MOD = None
F_MODULE = None

# Audio globals
AUDIO_DETECTOR = None

BACKEND_DIR = Path(__file__).parent
MODEL_CACHE_DIR = BACKEND_DIR / "model_cache"
WEIGHTS_FILE = "model_87_acc_20_frames_final_data.pt"
AUDIO_UPLOAD_DIR = BACKEND_DIR / "audio" / "uploads"
AUDIO_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="TruthLayer DeepFake Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register new routers (additive only) ────────────────────────────────
from ai_debate.routes import router as debate_router
from api.heatmap import router as heatmap_router
from complaints.routes import router as complaints_router
from reports.routes import router as report_router

app.include_router(debate_router, prefix="/api")
app.include_router(heatmap_router, prefix="/api")
app.include_router(complaints_router, prefix="/api")
app.include_router(report_router, prefix="/api")


# ── Video model helpers ─────────────────────────────────────────────────
def download_weights_if_needed():
    """Download the .pt weights file from HuggingFace if not cached locally."""
    weights_path = MODEL_CACHE_DIR / WEIGHTS_FILE
    if weights_path.exists():
        print(f"Using cached weights: {weights_path}")
        return weights_path

    from huggingface_hub import hf_hub_download

    HF_TOKEN = os.getenv("HF_TOKEN")
    MODEL_ID = os.getenv("MODEL_ID", "tayyabimam/Deepfake")

    if not HF_TOKEN:
        raise RuntimeError("HF_TOKEN not set. Add it to backend/.env")

    print(f"Downloading model weights from {MODEL_ID} ...")
    MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)

    downloaded = hf_hub_download(
        repo_id=MODEL_ID,
        filename=WEIGHTS_FILE,
        token=HF_TOKEN,
        local_dir=str(MODEL_CACHE_DIR),
    )
    print(f"Weights saved to: {downloaded}")
    return Path(downloaded)


def load_video_model():
    """Load the video detection model and processor into globals."""
    global VIDEO_MODEL, VIDEO_PROCESSOR, TORCH_MOD, F_MODULE

    if VIDEO_MODEL is not None:
        return

    import torch
    import torch.nn.functional as F

    TORCH_MOD = torch
    F_MODULE = F

    weights_path = download_weights_if_needed()

    from model.detector import DeepFakeDetector

    VIDEO_MODEL = DeepFakeDetector(num_classes=2)
    VIDEO_MODEL.load_state_dict(
        torch.load(str(weights_path), map_location=torch.device("cpu"))
    )
    VIDEO_MODEL.eval()
    print("Video model loaded successfully!")

    from model.processor import VideoProcessor

    VIDEO_PROCESSOR = VideoProcessor()
    print("Video processor ready!")


# ── Audio model helpers ─────────────────────────────────────────────────
def load_audio_model():
    """Load the audio deepfake detector into globals."""
    global AUDIO_DETECTOR

    if AUDIO_DETECTOR is not None:
        return

    # Add audio/ to Python path so the import works
    audio_dir = str(BACKEND_DIR / "audio")
    if audio_dir not in sys.path:
        sys.path.insert(0, audio_dir)

    from audio_deepfake_detector import DeepfakeDetector

    AUDIO_DETECTOR = DeepfakeDetector()
    print("Audio deepfake detector loaded successfully!")


# ── Startup ─────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    print("Loading deepfake detection models...")
    try:
        load_video_model()
        print("Video model ready!")
    except Exception as e:
        print(f"WARNING: Video model failed to load: {e}")
        print("Video analysis will be unavailable. Audio analysis will still work.")
    try:
        load_audio_model()
        print("Audio model ready!")
    except Exception as e:
        print(f"WARNING: Audio model failed to load: {e}")
        print("Audio analysis will be unavailable.")
    print("Server ready!")


# ── Health ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "video_model_loaded": VIDEO_MODEL is not None,
        "audio_model_loaded": AUDIO_DETECTOR is not None,
    }


# ── Video analysis ──────────────────────────────────────────────────────
VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".wmv", ".flv", ".mpeg", ".mpg"}

@app.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    """Accept a video upload, run deepfake detection, return verdict + scores."""

    ext = Path(file.filename or "video.mp4").suffix.lower()
    is_video = (file.content_type and file.content_type.startswith("video/")) or ext in VIDEO_EXTENSIONS
    if not is_video:
        raise HTTPException(status_code=400, detail="Only video files are accepted.")

    load_video_model()

    suffix = ext or ".mp4"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        shutil.copyfileobj(file.file, tmp)
        tmp.close()

        inputs = VIDEO_PROCESSOR(tmp.name)
        frames_tensor = inputs["pixel_values"]

        with TORCH_MOD.no_grad():
            fmap, logits = VIDEO_MODEL(frames_tensor)
            probs = F_MODULE.softmax(logits, dim=1).cpu().numpy()[0]
            labels = {0: "REAL", 1: "FAKE"}
            result = [
                {"label": labels[i], "score": float(probs[i])} for i in range(len(probs))
            ]
            result.sort(key=lambda x: x["score"], reverse=True)

        top = result[0]
        verdict = "FAKE" if "fake" in top["label"].lower() else "REAL"
        confidence = top["score"]
        truth_score = (
            int((1 - confidence) * 100) if verdict == "FAKE" else int(confidence * 100)
        )

        return {
            "verdict": verdict,
            "confidence": round(confidence * 100, 2),
            "truth_score": truth_score,
            "scores": result,
            "filename": file.filename,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        os.unlink(tmp.name)


# ── Audio analysis ──────────────────────────────────────────────────────
AUDIO_EXTENSIONS = {".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".wma", ".webm", ".mpeg", ".mpg"}


@app.post("/analyze-audio")
async def analyze_audio(file: UploadFile = File(...)):
    """Upload an audio file and get deepfake analysis results."""
    ext = Path(file.filename or "audio.wav").suffix.lower()
    if ext not in AUDIO_EXTENSIONS:
        raise HTTPException(400, f"Unsupported audio format: {ext}")

    load_audio_model()

    file_id = uuid.uuid4().hex[:12]
    save_path = AUDIO_UPLOAD_DIR / f"{file_id}{ext}"
    try:
        with open(save_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        result = AUDIO_DETECTOR.detect(str(save_path))
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(500, f"Audio analysis failed: {str(e)}")
    finally:
        if save_path.exists():
            save_path.unlink()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
