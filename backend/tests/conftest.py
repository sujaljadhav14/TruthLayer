"""Shared test setup for the audio detector.

The detector imports torch + transformers at module level. Those are heavy and
not needed for unit tests (the ML models are replaced with fakes), so we stub
them before the module is loaded. librosa / scipy / numpy / webrtcvad are real.
"""

import contextlib
import importlib.util
import sys
import types
from pathlib import Path

import pytest


class _Tensor:  # scipy's array-API helpers probe `torch.Tensor`
    pass


def _install_ml_stubs():
    sys.modules.setdefault("torch", types.SimpleNamespace(
        Tensor=_Tensor,
        cuda=types.SimpleNamespace(is_available=lambda: False),
        no_grad=contextlib.nullcontext,
        device=lambda *_a, **_k: None,
    ))
    sys.modules.setdefault("transformers", types.SimpleNamespace(
        AutoFeatureExtractor=types.SimpleNamespace(from_pretrained=lambda *_a, **_k: None),
        AutoModelForAudioClassification=types.SimpleNamespace(from_pretrained=lambda *_a, **_k: None),
    ))


def _load_detector_module():
    _install_ml_stubs()
    path = Path(__file__).resolve().parent.parent / "audio" / "audio_deepfake_detector.py"
    spec = importlib.util.spec_from_file_location("audio_deepfake_detector", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


detector_module = _load_detector_module()


@pytest.fixture
def det_module():
    return detector_module
