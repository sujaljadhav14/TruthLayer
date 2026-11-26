# TruthLayer — guide for AI agents and contributors

TruthLayer is a deepfake forensics web app (Hackverse 2026, team Byte Devs: Sujal, Samiksha, Rutuja, Bhoomi).
Users upload a video or audio file and get a verdict, the reasons behind it, a timeline/heatmap of where
manipulation was found, and an Ed25519-signed PDF report with a share link.

> **Start every session by reading [`docs/ROADMAP.md`](docs/ROADMAP.md).**
> **End every session that changed code by updating it** (move items between Done / Next, add a dated
> entry to the changelog). This is how work carries over between sessions and tools (Claude, VS Code
> agents, teammates). If you change commands, structure or rules, update this file too.

## Stack

| Part | Tech | Where |
|---|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4, `motion`, `lucide-react`, Clerk auth | `frontend/` |
| API proxy | Next.js route handlers forward to FastAPI (`FASTAPI_URL`, default `http://localhost:8001`) | `frontend/app/api/` |
| Backend | FastAPI on port **8001** | `backend/main.py` |
| Video model | ResNeXt50 + LSTM (20-frame sequences), Grad-CAM heatmaps | `backend/model/`, `backend/api/heatmap.py` |
| Audio pipeline | 8 steps: ffmpeg → WebRTC VAD → MFCC → speaker check (Resemblyzer, optional) → 2 wav2vec2 models on speech → 8 frequency signals → breathing → weighted score | `backend/audio/audio_deepfake_detector.py` |
| Reports | SHA-256 + Ed25519 certificate, PDF (fpdf2), QR share links | `backend/reports/` |
| AI debate | Ollama (local LLM) prosecutor/defender — currently not shown in the UI | `backend/ai_debate/` |

## Run it

```bash
# Backend (Python 3.12). First run downloads ~1.5 GB of models; needs HF_TOKEN in backend/.env
cd backend && py -3.12 -m venv venv && venv\Scripts\pip install -r requirements.txt
venv\Scripts\python main.py            # http://localhost:8001  (docs at /docs)

# Frontend
cd frontend && npm install && npm run dev   # http://localhost:3000
```

ffmpeg must be on PATH for audio (otherwise librosa loads files directly, fewer formats).
Clerk runs in keyless dev mode if no keys are set; `/dashboard/*` requires sign-in.

## Checks (run before saying something works)

```bash
cd backend && venv\Scripts\python -m pytest tests -q     # fast: torch/transformers are stubbed, ML is faked
cd frontend && npx tsc --noEmit                          # type check
```

The backend tests need only `numpy scipy librosa soundfile webrtcvad-wheels pytest` — no model downloads.
`tests/test_audio_pipeline.py` runs the real `detect()` with a fake "always fake" model; if the pipeline
ever drops or replaces the ML score, it fails. Keep it that way when changing the audio pipeline.

## Rules that matter for this project

1. **The verdict must never contradict the numbers.** If the label says FAKE, the fake % shown must be ≥ 50.
   Any override must also move the score (see `build_verdict`). Verdict strings are user-facing
   (`AI-GENERATED` / `AUTHENTIC` / `UNCERTAIN`) — no debug tags like `[X]`.
2. **Only claim what the code does.** No image detection, no link/URL import, no "models updated weekly",
   no fake testimonials or pricing. Sample data on the landing page must be labelled as an illustrative example.
3. **Explain, don't just score.** Results lead with a plain-English summary and the top reasons;
   technical detail sits behind a toggle.
4. Frequency-signal thresholds were calibrated on full files with silence (`noise_floor` needs silent
   parts). Run signals on the full audio; only the ML models are speech-focused.
5. Score weights and override thresholds are env-tunable (`TRUTHLENS_*` in the detector). Don't retune
   them without an evaluation run (`backend/scripts/evaluate_audio.py --data <real/ fake/ folders>`).

## Design system (Vigil-inspired editorial look, see `docs/ROADMAP.md` → UI)

- Tokens live in `frontend/app/globals.css` under `@theme`: `ink` (near-black), `paper` (warm cream),
  `signal` (green = authentic / brand), `alert` (red = fake), `caution` (amber = uncertain).
- Fonts via `next/font` in `app/layout.tsx`: display = Archivo (tight, heavy), body = Inter, mono = JetBrains Mono.
- Patterns: numbered section eyebrows (`01 — LABEL`), heavy headlines with one *italic* emphasis word,
  "chunky" buttons with a hard offset shadow (`.btn-chunky`), halftone dot textures (`.halftone`),
  paper cards with 1.5px ink borders on light sections.
- Reusable pieces: `components/landing/*` (landing sections), `components/analysis/*` (result views).

## Repo map

```
backend/
  main.py                    FastAPI app, video /analyze, audio /analyze-audio, model loading
  audio/audio_deepfake_detector.py   audio pipeline (DeepfakeDetector.detect)
  api/heatmap.py             frame-level Grad-CAM endpoint
  reports/                   certificate signing, PDF, history, share links
  complaints/ ai_debate/     complaint filing, LLM debate (not in UI)
  scripts/                   prefetch_models, benchmark_audio, evaluate_audio
  tests/                     pytest (conftest stubs torch/transformers)
frontend/
  app/page.tsx               landing page (sections in components/landing/)
  app/dashboard/             home, analyze, history, complaint
  app/api/                   proxies to FastAPI
  components/analysis/       verdict summary + result views used by analyze page and landing demo
docs/ROADMAP.md              status, next tasks, changelog  ← keep updated
```

## Git

- Work on a feature branch (`feature/<area>-<short>`), merge into `main`. Don't commit or push unless asked.
- Commit messages: `feat: …`, `fix: …`, `chore: …`, `docs: …`. **No `Co-Authored-By` / AI attribution lines.**
- `backend/.env` is intentionally committed (private repo, team decision). Never make the repo public
  without removing it and rotating `HF_TOKEN`.
- The `gh` CLI isn't installed on the main dev machine; merges are done locally (`git merge --no-ff`).

## Gotchas

- The landing illustration (`components/landing/ScannerArt.tsx`) is rendered twice (mobile + desktop), so
  SVG ids must be unique per instance (`useId`) — duplicate `clipPath` ids resolve to the hidden copy.
- Animate SVG with CSS transforms/transitions, not `motion` attribute animation (cx/cy came out `undefined`).
- If the dev server serves stale client JS after big edits, stop it, delete `frontend/.next`, restart.
