"""
AI Debate Engine — 3-round structured debate between Prosecutor and Defender.
Uses local Ollama instance.
"""

import time
import traceback
from typing import Optional
from dataclasses import dataclass, field, asdict

from .prompts import (
    PROSECUTOR_SYSTEM_PROMPT,
    DEFENDER_SYSTEM_PROMPT,
    JUDGE_SYSTEM_PROMPT,
    build_analysis_context,
)
from .ollama_client import get_ollama_client


@dataclass
class DebateRound:
    round_number: int
    prosecutor_argument: str
    defender_argument: str


@dataclass
class DebateResult:
    analysis_id: str
    provider: str  # "ollama" or "skipped"
    duration_ms: int = 0
    rounds: list = field(default_factory=list)
    total_rounds: int = 3
    verdict: str = "UNKNOWN"
    confidence: float = 0.5
    truth_score: int = 50
    reasoning: str = ""
    prosecutor_strength: float = 0.5
    defender_strength: float = 0.5
    key_evidence: list = field(default_factory=list)
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


class DebateEngine:
    """Orchestrates the Prosecutor vs Defender AI debate."""

    def __init__(self, total_rounds: int = 3):
        self.total_rounds = total_rounds

    async def run_debate(
        self,
        analysis_data: dict,
        analysis_id: str = "unknown",
    ) -> DebateResult:
        """Run the full debate using Ollama."""
        start_time = time.time()
        context = build_analysis_context(analysis_data)

        ollama = get_ollama_client()
        if await ollama.is_available():
            try:
                print("[AI Debate] Using Ollama...")
                result = await self._run_with_client(
                    client=ollama,
                    context=context,
                    analysis_id=analysis_id,
                    provider="ollama",
                )
                result.duration_ms = int((time.time() - start_time) * 1000)
                return result
            except Exception as e:
                print(f"[AI Debate] Ollama failed: {e}")
                traceback.print_exc()

        return DebateResult(
            analysis_id=analysis_id,
            provider="skipped",
            verdict=analysis_data.get("verdict", "UNKNOWN"),
            confidence=analysis_data.get("confidence", 0) / 100.0,
            truth_score=analysis_data.get("truth_score", 50),
            reasoning="AI debate skipped, Ollama not available.",
            duration_ms=int((time.time() - start_time) * 1000),
            error="Ollama was not available. Make sure Ollama is running.",
        )

    async def _run_with_client(self, client, context, analysis_id, provider) -> DebateResult:
        """Run the full debate with a specific AI client."""
        rounds = []
        debate_transcript = ""

        for round_num in range(1, self.total_rounds + 1):
            previous_ctx = ""
            if debate_transcript:
                previous_ctx = f"\nPrevious rounds:\n{debate_transcript}"

            prosecutor_prompt = PROSECUTOR_SYSTEM_PROMPT.format(
                round_number=round_num,
                total_rounds=self.total_rounds,
                previous_context=previous_ctx,
            )
            prosecutor_arg = await client.generate(
                system_prompt=prosecutor_prompt,
                user_message=f"{context}\n\nPresent Round {round_num} prosecution.",
                temperature=0.7,
            )

            debate_so_far = f"{previous_ctx}\nRound {round_num} Prosecutor: {prosecutor_arg}"
            defender_prompt = DEFENDER_SYSTEM_PROMPT.format(
                round_number=round_num,
                total_rounds=self.total_rounds,
                previous_context=debate_so_far,
            )
            defender_arg = await client.generate(
                system_prompt=defender_prompt,
                user_message=f"{context}\n\nProsecutor argued: {prosecutor_arg}\n\nPresent Round {round_num} defense.",
                temperature=0.7,
            )

            rounds.append(DebateRound(
                round_number=round_num,
                prosecutor_argument=prosecutor_arg,
                defender_argument=defender_arg,
            ))

            debate_transcript += (
                f"Round {round_num}:\n"
                f"Prosecutor: {prosecutor_arg}\n"
                f"Defender: {defender_arg}\n\n"
            )

        judge_prompt = JUDGE_SYSTEM_PROMPT.format(total_rounds=self.total_rounds)
        verdict_data = await client.generate_json(
            system_prompt=judge_prompt,
            user_message=f"{context}\n\nDebate Transcript:\n{debate_transcript}\n\nDeliver verdict as JSON.",
            temperature=0.3,
        )

        return DebateResult(
            analysis_id=analysis_id,
            provider=provider,
            rounds=[asdict(r) for r in rounds],
            total_rounds=self.total_rounds,
            verdict=verdict_data.get("verdict", "UNKNOWN"),
            confidence=verdict_data.get("confidence", 0.5),
            truth_score=verdict_data.get("truth_score", 50),
            reasoning=verdict_data.get("reasoning", ""),
            prosecutor_strength=verdict_data.get("prosecutor_strength", 0.5),
            defender_strength=verdict_data.get("defender_strength", 0.5),
            key_evidence=verdict_data.get("key_evidence", []),
        )


_debate_engine: Optional[DebateEngine] = None


def get_debate_engine(total_rounds: int = 3) -> DebateEngine:
    """Get or create the debate engine singleton."""
    global _debate_engine
    if _debate_engine is None or _debate_engine.total_rounds != total_rounds:
        _debate_engine = DebateEngine(total_rounds=total_rounds)
    return _debate_engine
