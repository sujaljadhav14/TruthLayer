"""
Test script for the 8 frequency signal functions in audio_deepfake_detector.

Generates two synthetic audio arrays using raw numpy (no librosa generation,
no ML models, no real audio files):
  - "fake-like" audio: pure 440 Hz sine, constant amplitude, zero noise
  - "real-like" audio: sine + harmonics + noise + amplitude variation + HF content

All 8 signals use the convention: 0.0 = authentic, 1.0 = fake.
The fake-like audio should score HIGHER (closer to 1.0) than the real-like audio.
"""

import sys
import os
import numpy as np

# ---------------------------------------------------------------------------
# Synthetic audio generation (pure numpy, no librosa)
# ---------------------------------------------------------------------------

SR = 22050          # must match TARGET_SR in the detector
DURATION = 5.0      # seconds
N_SAMPLES = int(SR * DURATION)
t = np.linspace(0, DURATION, N_SAMPLES, endpoint=False).astype(np.float32)


def make_fake_audio() -> np.ndarray:
    """
    Simulate AI-generated audio: a perfectly clean 440 Hz sine wave.
    - No harmonics, no noise, constant amplitude.
    - Spectrally sparse (energy only at 440 Hz -> very low HF energy).
    - Extremely flat amplitude envelope -> low shimmer.
    - Very clean silence-like regions -> low noise floor dB.
    """
    signal = 0.8 * np.sin(2 * np.pi * 440 * t)
    return signal.astype(np.float32)


def make_real_audio() -> np.ndarray:
    """
    Simulate natural human speech characteristics:
    - Fundamental at 150 Hz with harmonics (speech-like spectrum).
    - Amplitude modulation at ~3-5 Hz (syllabic rhythm / tremor).
    - Broadband noise (breath noise, room tone).
    - High-frequency fricative bursts above 4 kHz.
    - Micro-variations in pitch (jitter) and amplitude (shimmer).
    """
    rng = np.random.RandomState(42)

    # Fundamental + harmonics (simulates voiced speech)
    f0 = 150.0
    # Slight pitch jitter: f0 wanders +/- 3 Hz slowly
    jitter = 3.0 * np.sin(2 * np.pi * 0.7 * t) + 1.5 * np.sin(2 * np.pi * 1.3 * t)
    phase = 2 * np.pi * np.cumsum((f0 + jitter) / SR)

    signal = 0.50 * np.sin(phase)               # fundamental
    signal += 0.25 * np.sin(2 * phase)           # 2nd harmonic
    signal += 0.15 * np.sin(3 * phase)           # 3rd harmonic
    signal += 0.08 * np.sin(4 * phase)           # 4th harmonic
    signal += 0.04 * np.sin(5 * phase)           # 5th harmonic

    # Amplitude modulation: syllabic envelope at ~4 Hz
    envelope = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 4.0 * t))
    # Additional slow tremor at ~5.5 Hz
    envelope *= 0.85 + 0.15 * np.sin(2 * np.pi * 5.5 * t + 0.3)
    signal *= envelope

    # Micro-shimmer: random amplitude perturbations per ~10 ms frame
    frame_len = int(0.010 * SR)  # 10 ms
    n_frames = N_SAMPLES // frame_len + 1
    shimmer_gains = 1.0 + 0.12 * rng.randn(n_frames)
    shimmer_env = np.repeat(shimmer_gains, frame_len)[:N_SAMPLES]
    signal *= shimmer_env

    # Broadband noise (room tone + breath noise)
    noise = 0.06 * rng.randn(N_SAMPLES).astype(np.float32)
    signal += noise

    # High-frequency fricative bursts (simulates /s/, /f/, etc.)
    # Insert ~8 bursts of band-limited noise above 4 kHz
    for _ in range(8):
        start = rng.randint(0, N_SAMPLES - int(0.12 * SR))
        length = int((0.05 + 0.07 * rng.rand()) * SR)
        burst = 0.15 * rng.randn(length).astype(np.float32)
        # Simple high-pass: subtract a smoothed version (acts as crude HP filter)
        kernel_size = int(SR / 4000)  # cutoff ~ 4 kHz
        if kernel_size > 1:
            kernel = np.ones(kernel_size, dtype=np.float32) / kernel_size
            smoothed = np.convolve(burst, kernel, mode='same')
            burst = burst - smoothed
        signal[start:start + length] += burst * 2.0

    # Insert brief silence gaps (simulates pauses between words)
    for _ in range(4):
        gap_start = rng.randint(int(0.3 * SR), N_SAMPLES - int(0.5 * SR))
        gap_len = int((0.15 + 0.2 * rng.rand()) * SR)
        # Fade edges to avoid click
        fade = int(0.01 * SR)
        if gap_len > 2 * fade:
            signal[gap_start + fade: gap_start + gap_len - fade] *= 0.03
            # Add a tiny bit of room noise in the gap
            signal[gap_start + fade: gap_start + gap_len - fade] += \
                0.008 * rng.randn(gap_len - 2 * fade).astype(np.float32)

    # Normalize to peak ~0.9
    peak = np.max(np.abs(signal))
    if peak > 0:
        signal = signal * (0.9 / peak)

    return signal.astype(np.float32)


# ---------------------------------------------------------------------------
# Import signal functions from the detector
# ---------------------------------------------------------------------------

from audio.audio_deepfake_detector import (
    sig_hf_energy,
    sig_spectral_flatness,
    sig_flux_cv,
    sig_cpp,
    sig_shimmer,
    sig_noise_floor,
    sig_phase,
    sig_vocoder,
    run_signals,
    freq_combined,
)

SIGNAL_FNS = [
    ("sig_hf_energy",          sig_hf_energy),
    ("sig_spectral_flatness",  sig_spectral_flatness),
    ("sig_flux_cv",            sig_flux_cv),
    ("sig_cpp",                sig_cpp),
    ("sig_shimmer",            sig_shimmer),
    ("sig_noise_floor",        sig_noise_floor),
    ("sig_phase",              sig_phase),
    ("sig_vocoder",            sig_vocoder),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SEP = "-" * 88


def print_header(title: str) -> None:
    print(f"\n{'=' * 88}")
    print(f"  {title}")
    print(f"{'=' * 88}")


# ---------------------------------------------------------------------------
# TEST 1 -- Individual signal functions on both audio arrays
# ---------------------------------------------------------------------------

def test_individual_signals(fake_audio: np.ndarray, real_audio: np.ndarray):
    print_header("TEST 1: Individual Signal Functions (fake-like vs real-like)")

    print(f"\n  {'Signal':<28s} {'Fake':>8s} {'Real':>8s}   {'Expected':>14s}   Result")
    print(f"  {SEP}")

    pass_count = 0
    fail_count = 0

    for name, fn in SIGNAL_FNS:
        score_fake = float(np.clip(fn(fake_audio), 0.0, 1.0))
        score_real = float(np.clip(fn(real_audio), 0.0, 1.0))
        expected = "fake > real"
        passed = score_fake > score_real
        tag = "PASS" if passed else "FAIL"

        print(f"  {name:<28s} {score_fake:7.4f}  {score_real:7.4f}   {expected:>14s}   {tag}")

        if passed:
            pass_count += 1
        else:
            fail_count += 1

    print(f"  {SEP}")
    print(f"  Passed: {pass_count}/{pass_count + fail_count}")
    if fail_count:
        print(f"  ** {fail_count} signal(s) did not separate fake from real as expected.")
    else:
        print(f"  All 8 signals correctly separated fake-like from real-like audio.")

    return pass_count, fail_count


# ---------------------------------------------------------------------------
# TEST 2 -- run_signals() aggregation
# ---------------------------------------------------------------------------

def test_run_signals(fake_audio: np.ndarray, real_audio: np.ndarray):
    print_header("TEST 2: run_signals() on both audio arrays")

    print("\n  --- Fake-like audio ---")
    fake_sigs = run_signals(fake_audio)
    print("\n  --- Real-like audio ---")
    real_sigs = run_signals(real_audio)

    print(f"\n  {'Signal':<24s} {'Fake':>8s} {'Real':>8s}")
    print(f"  {'-' * 44}")
    for key in fake_sigs:
        print(f"  {key:<24s} {fake_sigs[key]:7.4f}  {real_sigs[key]:7.4f}")

    return fake_sigs, real_sigs


# ---------------------------------------------------------------------------
# TEST 3 -- freq_combined() scoring + penalty
# ---------------------------------------------------------------------------

def test_freq_combined(fake_sigs: dict, real_sigs: dict):
    print_header("TEST 3: freq_combined() scoring and penalty logic")

    fake_score, fake_override = freq_combined(fake_sigs)
    real_score, real_override = freq_combined(real_sigs)

    print(f"\n  Fake-like  ->  combined score = {fake_score:.4f}  (override={fake_override})")
    print(f"  Real-like  ->  combined score = {real_score:.4f}  (override={real_override})")

    # Check that fake scores higher
    passed_score = fake_score > real_score
    print(f"\n  fake_score > real_score ?  {'PASS' if passed_score else 'FAIL'}"
          f"  ({fake_score:.4f} vs {real_score:.4f})")

    # Check penalty: at least one fake signal should exceed 0.8
    strong_fake = [k for k, v in fake_sigs.items() if v > 0.8]
    passed_penalty = len(strong_fake) > 0
    print(f"  Fake audio has signals > 0.8 (penalty trigger)?  "
          f"{'PASS' if passed_penalty else 'FAIL'}"
          f"  (signals: {strong_fake if strong_fake else 'none'})")

    return passed_score, passed_penalty


# ---------------------------------------------------------------------------
# TEST 4 -- Voting: count how many signals vote "fake" (v > 0.55)
# ---------------------------------------------------------------------------

def test_voting(fake_sigs: dict, real_sigs: dict):
    print_header("TEST 4: Voting -- signals with score > 0.55 vote FAKE")

    fake_votes = sum(1 for v in fake_sigs.values() if v > 0.55)
    real_votes = sum(1 for v in real_sigs.values() if v > 0.55)
    total = len(fake_sigs)

    print(f"\n  Fake-like audio:  {fake_votes}/{total} signals vote FAKE")
    print(f"  Real-like audio:  {real_votes}/{total} signals vote FAKE")

    passed = fake_votes > real_votes
    print(f"\n  Fake audio has MORE fake votes?  "
          f"{'PASS' if passed else 'FAIL'}"
          f"  ({fake_votes} vs {real_votes})")

    return passed


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def main():
    print_header("Generating synthetic audio arrays (numpy only, no librosa)")
    print(f"  Sample rate : {SR} Hz")
    print(f"  Duration    : {DURATION} s")
    print(f"  Samples     : {N_SAMPLES}")

    fake_audio = make_fake_audio()
    real_audio = make_real_audio()

    print(f"\n  Fake-like audio: shape={fake_audio.shape}, "
          f"min={fake_audio.min():.4f}, max={fake_audio.max():.4f}, "
          f"std={fake_audio.std():.4f}")
    print(f"  Real-like audio: shape={real_audio.shape}, "
          f"min={real_audio.min():.4f}, max={real_audio.max():.4f}, "
          f"std={real_audio.std():.4f}")

    # ---- Run all tests ----

    pass1, fail1 = test_individual_signals(fake_audio, real_audio)
    fake_sigs, real_sigs = test_run_signals(fake_audio, real_audio)
    passed_score, passed_penalty = test_freq_combined(fake_sigs, real_sigs)
    passed_voting = test_voting(fake_sigs, real_sigs)

    # ---- Summary ----

    print_header("SUMMARY")
    results = [
        ("Individual signals (8 total)", f"{pass1}/8 passed"),
        ("freq_combined: fake > real",   "PASS" if passed_score else "FAIL"),
        ("Penalty triggers for fake",    "PASS" if passed_penalty else "FAIL"),
        ("Voting: fake has more votes",  "PASS" if passed_voting else "FAIL"),
    ]

    all_pass = (fail1 == 0 and passed_score and passed_penalty and passed_voting)

    for label, status in results:
        print(f"  {label:<40s}  {status}")

    print(f"\n  Overall: {'ALL TESTS PASSED' if all_pass else 'SOME TESTS FAILED'}")
    print()

    sys.exit(0 if all_pass else 1)


if __name__ == "__main__":
    main()
