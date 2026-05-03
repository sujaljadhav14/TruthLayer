"""
Prefetch the backend Hugging Face model weights into the local cache.

Usage:
    python scripts/prefetch_models.py

Environment:
    HF_TOKEN   - required for authenticated downloads
    MODEL_ID   - optional, defaults to the current video model repo
"""

from __future__ import annotations

import os
from pathlib import Path

from huggingface_hub import hf_hub_download


BACKEND_DIR = Path(__file__).resolve().parent.parent
MODEL_CACHE_DIR = BACKEND_DIR / "model_cache"
WEIGHTS_FILE = "model_87_acc_20_frames_final_data.pt"


def main() -> None:
    token = os.getenv("HF_TOKEN")
    model_id = os.getenv("MODEL_ID", "tayyabimam/Deepfake")

    if not token:
        raise RuntimeError("HF_TOKEN not set. Add it to backend/.env before running prefetch_models.py")

    MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {WEIGHTS_FILE} from {model_id} into {MODEL_CACHE_DIR}...")

    downloaded = hf_hub_download(
        repo_id=model_id,
        filename=WEIGHTS_FILE,
        token=token,
        local_dir=str(MODEL_CACHE_DIR),
    )

    print(f"Saved to: {downloaded}")


if __name__ == "__main__":
    main()
