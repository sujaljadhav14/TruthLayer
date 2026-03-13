"""
TruthLens — DeepFake Detection API
FastAPI server wrapping the ResNext50+LSTM deepfake detector.

Run:
    cd backend
    pip install -r requirements.txt
    python main.py

The model weights (~226 MB) are downloaded automatically from HuggingFace
on first startup and cached in backend/model_cache/.
"""

import os
import sys
import tempfile
import shutil
from pathlib import Path

from dotenv import load_dotenv

# Use absolute path so .env is found regardless of working directory
load_dotenv(Path(__file__).parent / ".env")

# Must be set before any huggingface_hub import
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ── Globals (loaded once at startup) ────────────────────────────────────
MODEL = None
PROCESSOR = None
TORCH_MOD = None
F_MODULE = None

BACKEND_DIR = Path(__file__).parent
MODEL_CACHE_DIR = BACKEND_DIR / "model_cache"
WEIGHTS_FILE = "model_87_acc_20_frames_final_data.pt"

app = FastAPI(title="TruthLens DeepFake Detection API")

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
from audio_analyzer.routes import router as audio_router

app.include_router(debate_router, prefix="/api")
app.include_router(audio_router, prefix="/api")


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
        sys.exit("HF_TOKEN not set. Add it to backend/.env")

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


def load_model_once():
    """Load the detection model and video processor into globals."""
    global MODEL, PROCESSOR, TORCH_MOD, F_MODULE

    if MODEL is not None:
        return

    import torch
    import torch.nn.functional as F

    TORCH_MOD = torch
    F_MODULE = F

    # Download weights
    weights_path = download_weights_if_needed()

    # Load model architecture
    from model.detector import DeepFakeDetector

    MODEL = DeepFakeDetector(num_classes=2)
    MODEL.load_state_dict(
        torch.load(str(weights_path), map_location=torch.device("cpu"))
    )
    MODEL.eval()
    print("Model loaded successfully!")

    # Load processor
    from model.processor import VideoProcessor

    PROCESSOR = VideoProcessor()
    print("Video processor ready!")


@app.on_event("startup")
async def startup_event():
    print("Loading deepfake detection model...")
    load_model_once()
    print("Server ready!")


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": MODEL is not None}


@app.post("/analyze")
async def analyze_video(file: UploadFile = File(...)):
    """Accept a video upload, run deepfake detection, return verdict + scores."""

    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Only video files are accepted.")

    load_model_once()

    suffix = Path(file.filename or "video.mp4").suffix or ".mp4"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        shutil.copyfileobj(file.file, tmp)
        tmp.close()

        # Run inference
        inputs = PROCESSOR(tmp.name)
        frames_tensor = inputs["pixel_values"]

        with TORCH_MOD.no_grad():
            fmap, logits = MODEL(frames_tensor)
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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
