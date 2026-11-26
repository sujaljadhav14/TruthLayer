"""
Benchmark script for audio deepfake detector.
Usage:
    python benchmark_audio.py <audio_file>

Prints wall-clock timing for detector initialization and per-file analysis.
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "audio"))
from audio_deepfake_detector import DeepfakeDetector


def main():
    if len(sys.argv) < 2:
        print("Usage: python benchmark_audio.py <audio_file>")
        sys.exit(1)
    files = sys.argv[1:]
    valid = [f for f in files if Path(f).exists()]
    if not valid:
        print("No valid files provided")
        sys.exit(1)

    t0 = time.perf_counter()
    det = DeepfakeDetector()
    t1 = time.perf_counter()
    print(f"Initialized detector in {t1-t0:.2f}s")

    for f in valid:
        print(f"\nBenchmarking: {f}")
        s = time.perf_counter()
        r = det.detect(f)
        e = time.perf_counter()
        print(f"Analysis time: {e-s:.2f}s")
        # Print verdict summary
        print(f"Result: {r.get('verdict')} | fake_prob={r.get('fake_prob', r.get('authenticity_score',{}).get('fake',None))}")

if __name__ == '__main__':
    main()
