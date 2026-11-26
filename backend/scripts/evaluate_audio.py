"""
Evaluate the audio detector on a labeled folder structure.

Expected layout:
    dataset/
      real/
        *.wav|mp3|flac
      fake/
        *.wav|mp3|flac

Usage:
    python scripts/evaluate_audio.py --data dataset

The script prints a confusion matrix and basic precision/recall metrics.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "audio"))

from audio_deepfake_detector import DeepfakeDetector


def iter_audio_files(root: Path):
    for label in ("real", "fake"):
        class_dir = root / label
        if not class_dir.exists():
            continue
        for path in sorted(class_dir.rglob("*")):
            if path.is_file() and path.suffix.lower() in {".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac", ".wma", ".webm", ".mpeg", ".mpg"}:
                yield label, path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="Dataset root containing real/ and fake/ folders")
    args = parser.parse_args()

    data_root = Path(args.data).expanduser().resolve()
    if not data_root.exists():
        raise SystemExit(f"Dataset not found: {data_root}")

    detector = DeepfakeDetector()
    y_true = []
    y_pred = []
    total = 0

    for label, path in iter_audio_files(data_root):
        total += 1
        print(f"[{total}] {label.upper():4s} -> {path.name}")
        result = detector.detect(str(path))
        predicted = "fake" if result.get("fake_prob", 0.0) >= 0.5 or result.get("label") == "fake" else "real"
        y_true.append(label)
        y_pred.append(predicted)

    if not total:
        raise SystemExit("No labeled audio files found under real/ and fake/")

    tp = sum(1 for t, p in zip(y_true, y_pred) if t == "fake" and p == "fake")
    tn = sum(1 for t, p in zip(y_true, y_pred) if t == "real" and p == "real")
    fp = sum(1 for t, p in zip(y_true, y_pred) if t == "real" and p == "fake")
    fn = sum(1 for t, p in zip(y_true, y_pred) if t == "fake" and p == "real")

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    accuracy = (tp + tn) / total if total else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0

    print("\n=== Evaluation ===")
    print(f"Total     : {total}")
    print(f"TP/TN/FP/FN: {tp}/{tn}/{fp}/{fn}")
    print(f"Accuracy  : {accuracy:.4f}")
    print(f"Precision : {precision:.4f}")
    print(f"Recall    : {recall:.4f}")
    print(f"F1        : {f1:.4f}")


if __name__ == "__main__":
    main()
