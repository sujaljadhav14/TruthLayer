"""
AI Debate API routes.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from .debate_engine import get_debate_engine

router = APIRouter(tags=["AI Debate"])


class DebateRequest(BaseModel):
    analysis_data: dict
    analysis_id: Optional[str] = "manual"
    rounds: Optional[int] = 3


@router.post("/debate")
async def run_debate(request: DebateRequest):
    """Trigger a Prosecutor vs Defender AI debate on analysis results."""
    engine = get_debate_engine(total_rounds=request.rounds or 3)

    try:
        result = await engine.run_debate(
            analysis_data=request.analysis_data,
            analysis_id=request.analysis_id or "manual",
        )
        return result.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Debate failed: {str(e)}")


@router.get("/debate/status")
async def debate_status():
    """Check Ollama availability."""
    from .ollama_client import get_ollama_client

    ollama = get_ollama_client()
    available = await ollama.is_available()

    return {
        "ollama_available": available,
        "ollama_model": ollama.model,
        "status": "ready" if available else "offline",
    }
