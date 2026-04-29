# System Architecture — Video+Audio Analyzer

Overview:
- Goal: reliable multimodal manipulation detection with explainability, human-in-loop, and pilot-ready APIs.

Components:
- Ingest: uploader, ffmpeg-based preprocessing, metadata extractor.
- Storage: S3-compatible object store for raw media, Postgres for metadata, vector DB for embeddings.
- Preprocessing: frame extractor, audio extractor, feature pipelines (MFCC, spectrograms, face embeddings).
- Inference:
  - Video frame model (CNN/transformer)
  - Temporal consistency model (3D conv / transformer)
  - Audio model (Whisper + classifier / speaker-liveness)
  - Metadata/anomaly model
  - Fusion & calibration layer producing: verdict {real, fake, uncertain} + evidence graph + confidence
- Human-in-the-loop: review queue, label capture, feedback for retraining.
- Serving: FastAPI + Uvicorn for API; optional Streamlit/React dashboard.
- CI/CD & Monitoring: GitHub Actions, canary deploys, Prometheus/Grafana, alerting.
- Security: RBAC, audit logs, encrypted storage, data retention policies.

Operational notes:
- Abstain policy: set thresholds for auto-accept / review / decline.
- Canary training: shadow evaluation before promotion.
