"""
Heatmap generation with Grad-CAM for DeepFake detection.
Produces per-frame spatial activation maps showing WHERE the model detects manipulation.
"""

import io
import base64
import numpy as np
import cv2
import torch
import torch.nn.functional as F
from PIL import Image


def _upsample_cam(cam: np.ndarray, size: tuple[int, int]) -> np.ndarray:
    """Resize and normalize a class activation map to [0, 1]."""
    cam = cv2.resize(cam, (size[1], size[0]))
    cam -= cam.min()
    if cam.max() > 0:
        cam /= cam.max()
    return cam


def generate_gradcam(
    model,
    frames_tensor: torch.Tensor,
    target_class: int = 1,  # 1 = FAKE
) -> list[np.ndarray]:
    """
    Run Grad-CAM on the ResNeXt50 backbone for each frame.

    Args:
        model: DeepFakeDetector instance (eval mode)
        frames_tensor: (1, seq_len, 3, H, W) preprocessed frames
        target_class: 0=REAL, 1=FAKE

    Returns:
        List of (H, W) float32 arrays in [0, 1] — one per frame
    """
    batch_size, seq_len, c, h, w = frames_tensor.shape

    # Storage for hooks
    activations: list[torch.Tensor] = []
    gradients: list[torch.Tensor] = []

    # Register hooks on the last conv block of the ResNeXt50 backbone
    # model.model is nn.Sequential(*list(resnext50.children())[:-2])
    # The last element is layer4
    target_layer = model.model[-1]  # ResNeXt50 layer4

    def fwd_hook(module, inp, out):
        activations.clear()
        activations.append(out.detach())

    def bwd_hook(module, grad_in, grad_out):
        gradients.clear()
        gradients.append(grad_out[0].detach())

    fwd_h = target_layer.register_forward_hook(fwd_hook)
    bwd_h = target_layer.register_full_backward_hook(bwd_hook)

    try:
        frames_flat = frames_tensor.view(batch_size * seq_len, c, h, w)
        frames_flat.requires_grad_(False)

        # Forward pass — need gradients
        model.zero_grad()
        fmap_out = model.model(frames_flat)          # (B*T, 2048, fH, fW)
        pooled = model.avgpool(fmap_out)              # (B*T, 2048, 1, 1)
        x_seq = pooled.view(batch_size, seq_len, 2048)
        x_lstm, _ = model.lstm(x_seq, None)
        logits = model.linear1(x_lstm[:, -1, :])     # (1, 2)

        # Backward for target class
        logits[0, target_class].backward()

    finally:
        fwd_h.remove()
        bwd_h.remove()

    # Compute Grad-CAM for each frame
    acts = activations[0]       # (B*T, 2048, fH, fW)
    grads = gradients[0]        # (B*T, 2048, fH, fW)

    # Global average pool gradients → weights
    weights = grads.mean(dim=(2, 3), keepdim=True)   # (B*T, 2048, 1, 1)
    cam_maps = (weights * acts).sum(dim=1)             # (B*T, fH, fW)
    cam_maps = F.relu(cam_maps).cpu().numpy()

    heatmaps = []
    for i in range(seq_len):
        heatmap = _upsample_cam(cam_maps[i], (h, w))
        heatmaps.append(heatmap)

    return heatmaps


def frame_to_base64(frame_rgb: np.ndarray, heatmap: np.ndarray, alpha: float = 0.45) -> str:
    """
    Overlay a Grad-CAM heatmap on the original frame and return as base64 PNG.

    Args:
        frame_rgb: (H, W, 3) uint8 RGB image
        heatmap: (H, W) float32 in [0, 1]
        alpha: blend factor for heatmap overlay
    """
    # Colormap: jet heatmap (blue=safe, red=manipulated)
    heatmap_uint8 = (heatmap * 255).astype(np.uint8)
    heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    heatmap_color = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)

    # Resize heatmap to match frame
    if heatmap_color.shape[:2] != frame_rgb.shape[:2]:
        heatmap_color = cv2.resize(heatmap_color, (frame_rgb.shape[1], frame_rgb.shape[0]))

    # Blend
    overlay = cv2.addWeighted(frame_rgb, 1 - alpha, heatmap_color, alpha, 0)

    # Encode to base64
    img = Image.fromarray(overlay)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=75)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def per_frame_fake_scores(
    model,
    frames_tensor: torch.Tensor,
) -> tuple[list[float], float]:
    """
    Compute per-frame suspicion scores that are CONSISTENT with the overall verdict.

    Strategy:
    - Use L2 norm of each frame's ResNeXt50 feature vector as a relative
      suspicion proxy (which frames the CNN was most "activated" by).
    - Scale these normalized norms by the overall LSTM fake probability,
      so if the model says REAL (low fake prob), ALL frame scores are also low.

    Returns:
        (per_frame_scores, overall_fake_prob)
        per_frame_scores: list of floats in [0, 1] — one per frame
        overall_fake_prob: float in [0, 1]
    """
    batch_size, seq_len, c, h, w = frames_tensor.shape
    frames_flat = frames_tensor.view(batch_size * seq_len, c, h, w)

    with torch.no_grad():
        fmap = model.model(frames_flat)           # (B*T, 2048, fH, fW)
        pooled = model.avgpool(fmap)               # (B*T, 2048, 1, 1)
        pooled = pooled.view(seq_len, 2048)        # (T, 2048)

        # L2 norm of each frame's CNN feature vector as suspicion proxy
        norms = torch.norm(pooled, dim=1)          # (T,) — relative activation per frame
        norms = norms - norms.min()
        if norms.max() > 0:
            norms = norms / norms.max()            # normalize to [0, 1]

        # Overall verdict from the LSTM final step (the only meaningful step)
        x_seq = pooled.unsqueeze(0)                # (1, T, 2048)
        lstm_out, _ = model.lstm(x_seq, None)
        final_logits = model.linear1(lstm_out[0, -1, :])  # (2,) — last step only
        overall_probs = F.softmax(final_logits, dim=0)
        overall_fake_prob = float(overall_probs[1].item())  # FAKE class

        # Scale norms by overall fake probability:
        # → If REAL (overall_fake_prob ≈ 0): all frame scores ≈ 0 (green timeline)
        # → If FAKE (overall_fake_prob ≈ 1): frame scores 0–1 highlight suspicious frames
        scaled = norms.cpu().numpy() * overall_fake_prob

    return [round(float(s), 4) for s in scaled], overall_fake_prob
