"""
Complaint tracking API routes.
"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["Complaints"])

COMPLAINTS_DIR = Path(__file__).resolve().parent.parent / "generated_complaints"
COMPLAINTS_DIR.mkdir(parents=True, exist_ok=True)


class ComplaintRequest(BaseModel):
    owner: dict
    report_id: Optional[str] = None
    recipient_email: str
    cc_email: Optional[str] = None
    subject: str
    narrative: str
    incident: dict
    report_context: Optional[dict] = None
    status: Optional[str] = "draft"


class ComplaintStatusUpdate(BaseModel):
    status: str


def _complaint_path(complaint_id: str) -> Path:
    return COMPLAINTS_DIR / f"{complaint_id}.json"


def _load_complaint(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _complaint_record(payload: dict) -> dict:
    return {
        "complaint_id": payload.get("complaint_id"),
        "report_id": payload.get("report_id"),
        "recipient_email": payload.get("recipient_email"),
        "cc_email": payload.get("cc_email"),
        "subject": payload.get("subject"),
        "status": payload.get("status"),
        "created_at": payload.get("created_at"),
        "submitted_at": payload.get("submitted_at"),
        "report_filename": (payload.get("report_context") or {}).get("filename"),
        "report_verdict": (payload.get("report_context") or {}).get("verdict"),
    }


def _owner_matches(payload: dict, owner_id: str | None) -> bool:
    if owner_id is None:
        return True
    return (payload.get("owner") or {}).get("user_id") == owner_id


def _find_complaint(complaint_id: str, owner_id: str | None = None) -> Path | None:
    path = _complaint_path(complaint_id)
    if not path.exists():
        return None
    payload = _load_complaint(path)
    if not _owner_matches(payload, owner_id):
        return None
    return path


@router.post("/complaints")
async def create_complaint(request: ComplaintRequest):
    complaint_id = uuid.uuid4().hex
    now = datetime.now(timezone.utc).isoformat()
    payload = {
        "complaint_id": complaint_id,
        "created_at": now,
        "updated_at": now,
        "submitted_at": now if request.status == "submitted" else None,
        "owner": request.owner,
        "report_id": request.report_id,
        "recipient_email": request.recipient_email,
        "cc_email": request.cc_email,
        "subject": request.subject,
        "narrative": request.narrative,
        "incident": request.incident,
        "report_context": request.report_context,
        "status": request.status or "draft",
    }
    path = _complaint_path(complaint_id)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return {
        "complaint": payload,
        "complaint_record": _complaint_record(payload),
    }


@router.get("/complaints")
async def list_complaints(owner_id: Optional[str] = None, report_id: Optional[str] = None):
    complaints = []
    for path in COMPLAINTS_DIR.glob("*.json"):
        try:
            payload = _load_complaint(path)
        except Exception:
            continue
        if not _owner_matches(payload, owner_id):
            continue
        if report_id and payload.get("report_id") != report_id:
            continue
        complaints.append(_complaint_record(payload))
    complaints.sort(key=lambda item: item.get("created_at") or "", reverse=True)
    return {"complaints": complaints, "count": len(complaints)}


@router.get("/complaints/{complaint_id}")
async def get_complaint(complaint_id: str, owner_id: Optional[str] = None):
    path = _find_complaint(complaint_id, owner_id=owner_id)
    if path is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return _load_complaint(path)


@router.patch("/complaints/{complaint_id}")
async def update_complaint_status(complaint_id: str, request: ComplaintStatusUpdate, owner_id: Optional[str] = None):
    path = _find_complaint(complaint_id, owner_id=owner_id)
    if path is None:
        raise HTTPException(status_code=404, detail="Complaint not found")

    payload = _load_complaint(path)
    payload["status"] = request.status
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    if request.status == "submitted" and not payload.get("submitted_at"):
        payload["submitted_at"] = payload["updated_at"]
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return {
        "complaint": payload,
        "complaint_record": _complaint_record(payload),
    }
