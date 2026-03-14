"""
Forensic Report & Certificate API routes.

POST /api/report/generate - generate JSON report + certificate
POST /api/report/pdf - generate and download PDF report
POST /api/report/verify - verify certificate signature
"""

import json
import re
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from .certificate import generate_certificate, verify_certificate
from .generator import generate_pdf_report

router = APIRouter(tags=["Reports"])

REPORTS_DIR = Path(__file__).resolve().parent.parent / "generated_reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


class ReportRequest(BaseModel):
    analysis_data: dict
    audio_data: Optional[dict] = None
    heatmap_data: Optional[dict] = None


def _safe_stem(filename: str) -> str:
    stem = Path(filename).stem or "analysis"
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("._-")
    return stem or "analysis"


def _report_payload(request: ReportRequest, cert: dict) -> dict:
    return {
        "certificate": cert,
        "analysis": request.analysis_data,
        "audio": request.audio_data,
        "heatmap": request.heatmap_data,
        "report_type": "forensic_analysis_v1",
    }


def _save_report_json(payload: dict, cert: dict) -> Path:
    base_name = f"{_safe_stem(cert.get('filename', 'analysis'))}_{cert['certificate_id'][:8]}"
    json_path = REPORTS_DIR / f"{base_name}.json"
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return json_path


def _save_report_pdf(pdf_bytes: bytes, cert: dict) -> Path:
    base_name = f"{_safe_stem(cert.get('filename', 'analysis'))}_{cert['certificate_id'][:8]}"
    pdf_path = REPORTS_DIR / f"{base_name}.pdf"
    pdf_path.write_bytes(pdf_bytes)
    return pdf_path


def _report_record_from_path(json_path: Path) -> dict:
    payload = json.loads(json_path.read_text(encoding="utf-8"))
    cert = payload.get("certificate", {})
    analysis = payload.get("analysis", {})
    pdf_path = json_path.with_suffix(".pdf")
    return {
        "report_id": cert.get("certificate_id"),
        "filename": cert.get("filename") or analysis.get("filename") or json_path.stem,
        "issued_at": cert.get("issued_at"),
        "verdict": cert.get("verdict") or analysis.get("verdict"),
        "confidence": cert.get("confidence") or analysis.get("confidence"),
        "truth_score": cert.get("truth_score") or analysis.get("truth_score"),
        "summary": cert.get("summary"),
        "json_filename": json_path.name,
        "pdf_filename": pdf_path.name if pdf_path.exists() else None,
        "has_audio": payload.get("audio") is not None,
        "has_heatmap": payload.get("heatmap") is not None,
    }


def _find_report_json(report_id: str) -> Path | None:
    for json_path in REPORTS_DIR.glob("*.json"):
        try:
            payload = json.loads(json_path.read_text(encoding="utf-8"))
        except Exception:
            continue
        cert = payload.get("certificate", {})
        if cert.get("certificate_id") == report_id:
            return json_path
    return None


@router.post("/report/generate")
async def generate_report(request: ReportRequest):
    """Generate a full forensic report + digital certificate and save it locally."""
    try:
        cert = generate_certificate(
            analysis_data=request.analysis_data,
            audio_data=request.audio_data,
            heatmap_data=request.heatmap_data,
        )
        payload = _report_payload(request, cert)
        json_path = _save_report_json(payload, cert)
        payload["stored_json_path"] = str(json_path)
        payload["report_record"] = _report_record_from_path(json_path)
        return payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@router.post("/report/pdf")
async def generate_pdf(request: ReportRequest):
    """Generate a forensic PDF report, save it locally, and return it for download."""
    try:
        cert = generate_certificate(
            analysis_data=request.analysis_data,
            audio_data=request.audio_data,
            heatmap_data=request.heatmap_data,
        )
        payload = _report_payload(request, cert)
        _save_report_json(payload, cert)
        pdf_bytes = generate_pdf_report(
            analysis_data=request.analysis_data,
            certificate=cert,
            audio_data=request.audio_data,
            heatmap_data=request.heatmap_data,
        )
        pdf_path = _save_report_pdf(pdf_bytes, cert)
        filename = pdf_path.name
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Report-Path": str(pdf_path),
            },
        )
    except RuntimeError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@router.post("/report/verify")
async def verify_report(body: dict):
    """Verify a certificate's HMAC signature to check for tampering."""
    cert = body.get("certificate")
    if not cert:
        raise HTTPException(status_code=400, detail="No certificate provided")
    valid = verify_certificate(cert)
    return {
        "valid": valid,
        "certificate_id": cert.get("certificate_id"),
        "message": "Certificate is authentic and untampered." if valid else "Certificate signature mismatch - possible tampering detected.",
    }


@router.get("/reports")
async def list_reports():
    """List saved forensic reports."""
    records = []
    for json_path in REPORTS_DIR.glob("*.json"):
        try:
            records.append(_report_record_from_path(json_path))
        except Exception:
            continue
    records.sort(key=lambda item: item.get("issued_at") or "", reverse=True)
    return {"reports": records, "count": len(records)}


@router.get("/reports/{report_id}")
async def get_report(report_id: str):
    """Fetch a saved forensic report payload by certificate id."""
    json_path = _find_report_json(report_id)
    if json_path is None:
        raise HTTPException(status_code=404, detail="Report not found")

    payload = json.loads(json_path.read_text(encoding="utf-8"))
    payload["report_record"] = _report_record_from_path(json_path)
    payload["stored_json_path"] = str(json_path)
    pdf_path = json_path.with_suffix(".pdf")
    payload["stored_pdf_path"] = str(pdf_path) if pdf_path.exists() else None
    return payload
