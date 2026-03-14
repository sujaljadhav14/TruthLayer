# TruthLens - Deepfake Detection Platform

TruthLens is a forensic media analysis platform for video and audio deepfake detection. It currently provides model verdicts, frame-level heatmap review for video, forensic PDF/JSON reports, saved report history, and cryptographically signed digital certificates.

## What Is Implemented

### Video Analysis
- Upload video files and run ResNeXt-50 + LSTM inference
- Return `REAL` / `FAKE`, confidence, truth score, and score breakdown
- Run integrated Grad-CAM heatmap analysis inside the video result view
- Save heatmap summary data into generated reports

### Audio Analysis
- Upload audio files and run the current audio forensic detector
- Return verdict, fake/real probabilities, source-tool estimate, and signal metrics
- Include audio findings in saved forensic reports

### Reports and History
- Generate forensic JSON reports and PDF reports
- Save generated reports in `backend/generated_reports`
- Browse saved reports in `/dashboard/history`
- View saved analysis, heatmap findings, audio findings, and certificate details

### Digital Certificate
- Each generated report includes a SHA-256 payload hash
- Each certificate is signed with Ed25519 using the `cryptography` library
- Certificates can be verified through the backend verification route

## What Was Removed
- The extra AI prosecutor/defender/judge verdict is no longer part of the active product flow
- The separate standalone heatmap analyzer tab has been removed from the analysis page
- Heatmap is now part of the video analysis result itself

## Partially Implemented
- Heatmap timeline and suspicious timestamp summary are implemented
- Full export formats like CSV/ZIP are not implemented yet
- Report storage exists on disk, but there is no database-backed case management yet

## Not Implemented Yet
- Audio spectrogram heatmap visualization
- Comparison page
- Complaint filing flow
- Background job processing / async heatmap generation
- Database-backed report storage

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS 4, Motion |
| Auth | Clerk |
| Backend | FastAPI, Uvicorn |
| ML Model | PyTorch, ResNeXt-50 + LSTM |
| Audio | librosa, scipy, transformers, torchaudio |
| Reports | fpdf2, qrcode, cryptography |
| Model Hub | HuggingFace Hub |

## Project Structure

```text
backend/
  main.py
  api/heatmap.py
  model/
  audio/
  reports/
  generated_reports/

frontend/
  app/dashboard/analyze/page.tsx
  app/dashboard/history/page.tsx
  app/api/report/
  components/HeatmapTimeline.tsx
  components/ForensicReport.tsx
```

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- FFmpeg available on the machine

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Main User Flow

1. Upload video or audio in `/dashboard/analyze`
2. Review verdict and forensic evidence
3. For video, inspect the integrated frame heatmap timeline
4. Generate a certificate or PDF report
5. Open `/dashboard/history` to review all saved reports

## Notes
- Model weights are downloaded from HuggingFace on first backend startup
- Generated reports are saved locally under `backend/generated_reports`
- The public key for report signature verification is generated alongside report artifacts
