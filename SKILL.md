# AA Agent Overview — TruthLens

Purpose: single-source-of-truth for autonomous agents and contributors. Contains project status, module breakdown, prioritized tasks, branching & testing workflow, and next actions so any agent or developer can continue work without context gaps.

## Snapshot
- Project: TruthLens — forensic deepfake detection (video + audio + reports + AI debate)
- Status: Hackathon prototype with working FastAPI backend and Next.js frontend. Key gaps: reproducible dev setup, model prefetching, performance optimizations, test coverage, and production-grade signing/key management.

## Modules (owner, branch pattern, status)
- Backend - Video (`backend/model`, `backend/main.py`)
  - Branch: `feature/backend/video-<short>`
  - Status: Partially implemented (ResNeXt+LSTM). Needs tests, model caching improvements, and Grad-CAM perf tuning.

- Backend - Audio (`backend/audio/audio_deepfake_detector.py`)
  - Branch: `feature/backend/audio-<short>`
  - Status: Core pipeline present. High-priority: implement chunked VAD + aggregator, lightweight screener, parallel inference, benchmarking, and retraining with modern TTS samples.

- Backend - AI Debate (`backend/ai_debate`)
  - Branch: `feature/backend/debate-ollama`
  - Status: Uses Ollama client; add fallback, mocks for CI, and reliability improvements.

- Backend - Reports & Signing (`backend/reports`)
  - Branch: `feature/backend/reports-signing`
  - Status: Signing implemented; move keys to KMS for production and add CI signature verification test.

- API & Routes (`backend/*/routes.py`)
  - Branch: `feature/backend/api-cleanup`
  - Status: Working; add input validation, rate-limiting, and improved error messages.

- Frontend (`frontend/app`, `frontend/components`)
  - Branch: `feature/frontend/<short>`
  - Status: UI mostly implemented; add error-handling for long jobs, progress UI, and share/preview workflows.

- Infra & DevOps
  - Branch: `feature/infra/docker-compose`
  - Status: Missing reproducible Docker/dev compose and prefetch scripts. High-priority for onboarding.

- Tests & CI
  - Branch: `chore/tests/add-ci`
  - Status: Minimal tests. Add unit, integration, signature, and smoke benchmarks.

## Prioritized Task List (short-term)
1. `feature/infra/docker-compose` — add `Dockerfile` for backend, `docker-compose.yml`, and mounting `model_cache` volume.
2. `feature/infra/prefetch` — add `backend/scripts/prefetch_models.py` to download HF weights into `backend/model_cache/` using `HF_TOKEN`.
3. `feature/backend/audio-vad` — implement chunked VAD + per-chunk scoring + aggregator and lightweight heuristic screener (HF energy + spectral flatness).
4. `feature/backend/benchmark` — add `backend/scripts/benchmark_audio.py` to profile VAD, feature extraction, inference, aggregation.
5. `chore/tests/add-ci` — add basic GitHub Actions workflow: lint, `GET /health` smoke test, run backend unit tests.
6. `feature/backend/signing-kms` — add CI test to sign+verify sample report and document KMS migration steps.

## Branching & Workflow (required process)
- For each module/task: create a new branch named `feature/<area>/<short-desc>` or `chore/<short>` for non-feature work.
- Work only on that branch. Write focused commits with clear messages.
- Add unit tests in `backend/tests/` or `frontend/tests/` next to code changes.
- Open a Pull Request to `main` with description, test results, and a short checklist (implemented, tests, docs updated).
- CI must pass before merge. Use `squash` or `rebase` merges to keep main tidy.

## Testing Guidelines
- Unit tests: Python `pytest` tests in `backend/tests/`. Use small audio/video fixtures in `backend/tests/fixtures/`.
- Integration tests: a smoke test that starts the backend and calls `/health`, `/analyze-audio` (with a tiny sample), and `/analyze` (small video). Place in `ci/` for GitHub Actions.
- Benchmark tests: use `backend/scripts/benchmark_audio.py` to record per-stage timings and output JSON `benchmarks/` for tracking.
- Signature tests: generate a sample JSON report and verify Ed25519 signature via a CI job.

## Agent Handoff Format (how agents should update this file)
- When an agent finishes a task, add a bullet under the module with: date, PR link, brief notes, test status, artifacts produced.
- If blocked, add `BLOCKED` with reason and suggested next step.

## Example Module Entry (template)
### Audio - Chunked VAD (feature/backend/audio-vad)
- Owner: @agent-a
- Status: TODO
- PR: (fill on completion)
- Tests: `backend/tests/test_audio_vad.py` (unit) — TODO
- Notes: implement `AudioProcessor.chunk_and_score()` that returns chunk-level scores and an aggregated verdict.

## Next Actions (pick one to start)
- A: Create `feature/infra/prefetch` and add `prefetch_models.py` + update `backend/.env.example` (recommended first step).
- B: Start `feature/backend/audio-vad` — implement chunked VAD + aggregator and add benchmark harness. (recommended if main priority is accuracy and speed)

---
Keep this file updated. Agents and developers should read this before creating a branch.
