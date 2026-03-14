"""
Certificate generator with SHA-256 payload hashing and Ed25519 signatures.
Produces a tamper-evident fingerprint for each analysis and enables public-key verification.
"""

import base64
import hashlib
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey


KEY_DIR = Path(__file__).resolve().parent.parent / "generated_reports"
PRIVATE_KEY_PATH = KEY_DIR / "certificate_private_key.pem"
PUBLIC_KEY_PATH = KEY_DIR / "certificate_public_key.pem"


def _sha256(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()


def _load_or_create_keys() -> tuple[Ed25519PrivateKey, Ed25519PublicKey]:
    KEY_DIR.mkdir(parents=True, exist_ok=True)

    if PRIVATE_KEY_PATH.exists():
        private_key = serialization.load_pem_private_key(
            PRIVATE_KEY_PATH.read_bytes(),
            password=os.getenv("CERTIFICATE_KEY_PASSWORD", "").encode() or None,
        )
        if not isinstance(private_key, Ed25519PrivateKey):
            raise ValueError("Unsupported private key type for certificate signing")
        return private_key, private_key.public_key()

    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    PRIVATE_KEY_PATH.write_bytes(
        private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    PUBLIC_KEY_PATH.write_bytes(
        public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
    )
    return private_key, public_key


def _sign_payload(payload: str) -> str:
    private_key, _ = _load_or_create_keys()
    signature = private_key.sign(payload.encode("utf-8"))
    return base64.b64encode(signature).decode("ascii")


def _build_summary(
    analysis_data: dict,
    audio_data: dict | None = None,
    heatmap_data: dict | None = None,
) -> str:
    verdict = analysis_data.get("verdict", "UNKNOWN")
    confidence = float(analysis_data.get("confidence", 0))
    filename = analysis_data.get("filename", "unknown file")

    parts = [f"Forensic analysis completed for {filename}."]

    if verdict == "FAKE":
        parts.append(f"The model classified the media as manipulated with {confidence:.1f}% confidence.")
    elif verdict == "REAL":
        parts.append(f"The model classified the media as authentic with {confidence:.1f}% confidence.")
    else:
        parts.append("The model result was inconclusive.")

    if heatmap_data:
        suspicious = int(heatmap_data.get("suspicious_frame_count", 0))
        total = int(heatmap_data.get("total_frames_analyzed", 0))
        if total > 0:
            parts.append(f"Heatmap review flagged {suspicious} of {total} sampled frames as suspicious.")

    if audio_data:
        fake_prob = float(audio_data.get("fake_prob", 0))
        real_prob = float(audio_data.get("real_prob", 0))
        parts.append(
            f"Audio inspection measured {real_prob * 100:.1f}% authentic probability and {fake_prob * 100:.1f}% synthetic probability."
        )
        source_tool = audio_data.get("source_tool")
        if source_tool and source_tool != "Real Speech":
            parts.append(f"The strongest tool classification matched {source_tool}.")

    return " ".join(parts)


def generate_certificate(
    analysis_data: dict,
    audio_data: dict | None = None,
    heatmap_data: dict | None = None,
) -> dict:
    """Generate an Ed25519-signed digital certificate for an analysis."""
    cert_id = str(uuid.uuid4())
    issued_at = datetime.now(timezone.utc).isoformat()

    payload_data = {
        "cert_id": cert_id,
        "issued_at": issued_at,
        "filename": analysis_data.get("filename", "unknown"),
        "verdict": analysis_data.get("verdict", "UNKNOWN"),
        "confidence": analysis_data.get("confidence", 0),
        "truth_score": analysis_data.get("truth_score", 50),
    }
    if heatmap_data:
        payload_data["suspicious_frame_count"] = heatmap_data.get("suspicious_frame_count", 0)
        payload_data["total_frames_analyzed"] = heatmap_data.get("total_frames_analyzed", 0)
    if audio_data:
        payload_data["audio_label"] = audio_data.get("label", "unknown")
        payload_data["audio_fake_prob"] = audio_data.get("fake_prob", 0)
        payload_data["audio_real_prob"] = audio_data.get("real_prob", 0)

    canonical = json.dumps(payload_data, sort_keys=True, separators=(",", ":"))
    file_hash = _sha256(canonical)
    signature = _sign_payload(canonical)

    return {
        "certificate_id": cert_id,
        "issued_at": issued_at,
        "filename": analysis_data.get("filename", "unknown"),
        "verdict": analysis_data.get("verdict", "UNKNOWN"),
        "confidence": analysis_data.get("confidence", 0),
        "truth_score": analysis_data.get("truth_score", 50),
        "suspicious_frame_count": heatmap_data.get("suspicious_frame_count", 0) if heatmap_data else None,
        "total_frames_analyzed": heatmap_data.get("total_frames_analyzed", 0) if heatmap_data else None,
        "audio_label": audio_data.get("label") if audio_data else None,
        "audio_fake_prob": audio_data.get("fake_prob") if audio_data else None,
        "audio_real_prob": audio_data.get("real_prob") if audio_data else None,
        "file_hash": file_hash,
        "signature": signature,
        "algorithm": "Ed25519",
        "public_key_path": str(PUBLIC_KEY_PATH),
        "summary": _build_summary(analysis_data, audio_data=audio_data, heatmap_data=heatmap_data),
        "issuer": "TruthLens Forensic AI - HackVerse 2025",
    }


def verify_certificate(cert: dict) -> bool:
    """Verify a certificate's Ed25519 signature to check for tampering."""
    payload_data = {
        "cert_id": cert["certificate_id"],
        "issued_at": cert["issued_at"],
        "filename": cert["filename"],
        "verdict": cert["verdict"],
        "confidence": cert["confidence"],
        "truth_score": cert["truth_score"],
    }
    if cert.get("suspicious_frame_count") is not None:
        payload_data["suspicious_frame_count"] = cert.get("suspicious_frame_count", 0)
        payload_data["total_frames_analyzed"] = cert.get("total_frames_analyzed", 0)
    if cert.get("audio_label") is not None:
        payload_data["audio_label"] = cert.get("audio_label", "unknown")
        payload_data["audio_fake_prob"] = cert.get("audio_fake_prob", 0)
        payload_data["audio_real_prob"] = cert.get("audio_real_prob", 0)

    canonical = json.dumps(payload_data, sort_keys=True, separators=(",", ":"))
    expected_hash = _sha256(canonical)
    if expected_hash != cert.get("file_hash"):
        return False

    public_key = serialization.load_pem_public_key(PUBLIC_KEY_PATH.read_bytes())
    if not isinstance(public_key, Ed25519PublicKey):
        return False

    try:
        public_key.verify(base64.b64decode(cert.get("signature", "")), canonical.encode("utf-8"))
        return True
    except (InvalidSignature, ValueError):
        return False
