# AI Architecture — Models & Pipelines

Modeling layers:
- Feature extraction:
  - Video: face embeddings (ArcFace), optical flow, frame anomaly features
  - Audio: MFCC, spectral artifacts, embeddings (pyannote), Whisper transcripts
  - Metadata: EXIF, container headers, upload provenance
- Per-modality detectors:
  - Frame-level classifier (Robust CNN / ViT)
  - Temporal model for coherence (I3D / TimeSformer)
  - Audio tamper detector (spectral CNN + voice-liveness)
  - Metadata anomaly detector (rules + ML)
- Fusion:
  - Evidence graph builder: attach signals with timestamps and weights
  - Weighted voting + contradiction detector -> produces final verdict and top evidence
- Calibration:
  - Platt scaling or isotonic calibration per model; maintain calibration store
- Human feedback loop:
  - Review capture -> label store -> periodic retrain with versioning
- Retrain pipeline:
  - Data validation -> augmentation (compression, re-encode, synthetic variants) -> scheduled retrain -> shadow tests -> canary -> deploy
- Explainability:
  - Produce reason codes (lip-sync mismatch, frame interpolation, spectral artifact, metadata mismatch) and timestamps for each flagged signal
