# TruthLens — Backend (DeepFake Detection API)

FastAPI server wrapping a ResNext50 + LSTM deepfake detection model.

## Quick Setup (Windows)

**Option A — Run the setup script:**
```
Double-click setup.bat
```

**Option B — Manual setup in CMD:**
```cmd
cd backend
python -m venv venv
.\venv\Scripts\activate.bat
pip install -r requirements.txt
```

## Configure Environment

Copy the example env file and add the HuggingFace token:
```cmd
copy .env.example .env
```

Then edit `.env` and set your token:
```
HF_TOKEN=hf_your_token_here
```

Get a free token at: https://huggingface.co/settings/tokens

## Run the Server

```cmd
.\venv\Scripts\activate.bat
python main.py
```

First run will download model weights (~226 MB) from HuggingFace automatically.
Server starts at `http://localhost:8000`.

## API

**POST /analyze** — Upload a video for deepfake detection
```
curl -X POST http://localhost:8000/analyze -F "file=@video.mp4"
```

Response:
```json
{
  "verdict": "FAKE",
  "confidence": 93.42,
  "truth_score": 7,
  "scores": [
    {"label": "FAKE", "score": 0.9342},
    {"label": "REAL", "score": 0.0658}
  ],
  "filename": "video.mp4"
}
```

**GET /health** — Check if server and model are ready

## Dependencies

Only these are needed (no dlib or face_recognition required):
- `torch` + `torchvision` — Neural network inference
- `opencv-python` — Video reading + face detection (Haar Cascade)
- `fastapi` + `uvicorn` — API server
- `huggingface_hub` — Auto-download model weights
- `numpy`, `Pillow` — Image processing

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `activate.ps1 cannot be loaded` | Use CMD instead of PowerShell, run `.\venv\Scripts\activate.bat` |
| `pip install` asks for dlib | You have wrong requirements. Use the `requirements.txt` in this folder only |
| Model download fails | Check your `HF_TOKEN` in `.env` is valid |
| `CUDA out of memory` | Model runs on CPU by default, no GPU needed |
