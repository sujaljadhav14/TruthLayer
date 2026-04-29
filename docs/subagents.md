# AI Subagents — Roles & Prompt Templates

Overview:
Three subagents to automate routine tasks and support the solo founder.

1) DataOps Agent
- Purpose: ingest, cluster failures, pre-label suggestions, synthetic augmentation, maintain hard-case sets.
- Inputs: raw media in `data/queue/`, metadata DB, error logs.
- Outputs: pre-labeled JSON files in `data/queue/`, augmentation artifacts, dataset snapshots for retraining.
- Prompt template:
  "Given these media files and associated metadata, cluster by artifact type, propose labels with confidence, and output JSON for review. Provide augmentation recipes for under-represented classes."

2) ML Engineer Agent
- Purpose: prototype ensembles, run calibration, eval scripts, produce model artifact + test results.
- Inputs: labeled datasets, model checkpoints, evaluation split.
- Outputs: evaluation reports, calibrated model weights, calibration tables.
- Prompt template:
  "Run ensemble training combining frame-level, temporal, and audio models. Produce calibration metrics, confusion matrix, and recommended threshold values for abstain policy."

3) Analyst Copilot
- Purpose: convert evidence graph into human-readable investigation reports; suggest next checks.
- Inputs: inference JSON (verdict, evidence signals with timestamps, confidence).
- Outputs: short investigation report, recommended follow-up steps, suggested label.
- Prompt template:
  "Given this evidence graph and media link, draft a concise investigation report (1-2 paragraphs), list top 3 evidence items with timestamps, and recommend next checks."

Integration notes:
- Each subagent should produce outputs in structured JSON placed under `data/queue/`.
- Maintain an audit log `data/queue/audit.log` for each action.
- Human-in-the-loop actions write results to `data/reviewed/` with reviewer label and notes.
