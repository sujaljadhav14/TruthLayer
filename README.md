# TruthLens - DeepFake Detection Platform

A forensic deepfake detection platform that combines deep learning video analysis with an AI-powered adversarial debate system to deliver transparent, explainable verdicts.

<!-- Add your screenshots here -->
<!-- ![Dashboard](docs/images/dashboard.png) -->
<!-- ![Analysis Result](docs/images/analysis.png) -->
<!-- ![AI Debate](docs/images/debate.png) -->

## Features

### Video Deepfake Detection
- Upload any video file (MP4, AVI, MOV)
- Analyzed using a ResNeXt-50 + LSTM neural network trained on deepfake datasets
- Returns verdict (REAL/FAKE), confidence score, and truth score
- Per-label score breakdown (FAKE vs REAL probabilities)

### AI Forensic Debate System
- Automatically triggered after every analysis
- 3-round adversarial debate between AI Prosecutor and Defender
- Prosecutor argues the video is manipulated, citing technical evidence
- Defender argues authenticity, providing counter-explanations
- AI Judge delivers a final verdict with reasoning and key evidence
- Powered by local Ollama (llama3) for privacy and zero API costs
- One-click "Copy Forensic Report" button for clean exportable summary

### Audio Analysis
- Extracts and analyzes audio track from uploaded media
- Spectral and temporal feature analysis using librosa
- Detects audio manipulation artifacts

### Authentication
- User sign-in/sign-up via Clerk
- Protected dashboard routes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS 4, Motion (Framer Motion) |
| Auth | Clerk |
| Backend | FastAPI, Uvicorn |
| ML Model | PyTorch, ResNeXt-50 + LSTM |
| AI Debate | Ollama (llama3), httpx |
| Audio | librosa, scipy, soundfile |
| Model Hub | HuggingFace Hub |

## Project Structure

```
backend/
  main.py              # FastAPI server entry point
  model/
    detector.py        # ResNeXt-50 + LSTM deepfake detector
    processor.py       # Video frame extraction and preprocessing
  ai_debate/
    debate_engine.py   # 3-round debate orchestrator
    ollama_client.py   # Ollama LLM client
    prompts.py         # Prosecutor/Defender/Judge system prompts
    routes.py          # /api/debate endpoints
  audio_analyzer/
    preprocessor.py    # Audio feature extraction
    models.py          # Data models
    routes.py          # /api/audio endpoints
  .env.example         # Environment variable template

frontend/
  app/
    dashboard/
      analyze/page.tsx # Main analysis page (upload + results + debate)
    api/
      analyze/route.ts # Proxy to FastAPI /analyze
      debate/route.ts  # Proxy to FastAPI /api/debate
  components/
    DebatePanel.tsx    # AI debate UI with report export
    AudioPanel.tsx     # Audio analysis UI
```

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Ollama installed and running (https://ollama.com)

### 1. Clone the repo
```bash
git clone https://github.com/Hackverse-Cybersecurity/hackverse-cybersecurity-wc01_bytedevs.git
cd hackverse-cybersecurity-wc01_bytedevs
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your HuggingFace token
```

### 3. Ollama setup (for AI Debate)
```bash
ollama pull llama3
ollama serve
```

### 4. Frontend setup
```bash
cd frontend
npm install
```

### 5. Run
Terminal 1 (backend):
```bash
cd backend
python main.py
```

Terminal 2 (frontend):
```bash
cd frontend
npm run dev
```

Open http://localhost:3000

## Environment Variables

### Backend (`backend/.env`)
```
HF_TOKEN=your_huggingface_token
MODEL_ID=tayyabimam/Deepfake
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

## How It Works

1. User uploads a video on the dashboard
2. Backend extracts frames, runs them through ResNeXt-50 + LSTM model
3. Returns REAL/FAKE verdict with confidence scores
4. AI Debate auto-starts: Ollama runs 3 rounds of Prosecutor vs Defender
5. Judge AI analyzes the debate transcript and delivers a final verdict
6. User can copy the full forensic report for documentation

## Team

**ByteDevs** - Hackverse Cybersecurity Challenge WC01
