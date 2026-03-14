# TruthLens Backend

FastAPI backend for video deepfake detection, audio forensic analysis, video heatmap generation, report generation, saved report retrieval, and digital certificate verification.

## Implemented API Surface

### Core Analysis
- `POST /analyze` - video verdict and score breakdown
- `POST /analyze-audio` - audio forensic analysis
- `POST /api/heatmap` - frame-level video heatmap timeline
- `GET /health` - health and model readiness

### Reports
- `POST /api/report/generate` - save JSON report + certificate
- `POST /api/report/pdf` - save JSON report and return PDF
- `POST /api/report/verify` - verify certificate signature
- `GET /api/reports` - list saved reports
- `GET /api/reports/{report_id}` - fetch one saved report payload

## Certificate Implementation

The current certificate flow uses:
- canonical JSON payload
- SHA-256 payload hashing
- Ed25519 digital signatures via `cryptography`
- generated public key stored with report artifacts for verification

## Current Gaps

- No database storage yet; reports are stored as files in `backend/generated_reports`
- No audio spectrogram heatmap endpoint yet
- No ZIP/CSV export endpoints yet
- No background worker for long-running report or heatmap jobs

## Quick Setup

```cmd
cd backend
python -m venv venv
.\venv\Scripts\activate.bat
pip install -r requirements.txt
copy .env.example .env
python main.py
```

## Required Environment

Set at least:

```env
HF_TOKEN=hf_your_token_here
MODEL_ID=tayyabimam/Deepfake
```

## Notes

- FFmpeg is required for audio analysis
- First run downloads the video model weights
- Generated reports, PDFs, and signing keys are stored inside `backend/generated_reports`
