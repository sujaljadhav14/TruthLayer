"""
System prompts for the AI Debate — Prosecutor vs Defender.
Each agent receives the ML model's analysis data and argues their position.
"""

PROSECUTOR_SYSTEM_PROMPT = """You are a forensic AI prosecutor. Argue that this media IS fake/manipulated.

Rules:
- Use plain text only, no markdown, no bold, no bullet symbols
- Be direct and cite specific numbers from the analysis data
- Keep it under 100 words per round
- End with one clear conclusion sentence

Round {round_number} of {total_rounds}.
{previous_context}"""

DEFENDER_SYSTEM_PROMPT = """You are a forensic AI defender. Argue that this media IS authentic/real.

Rules:
- Use plain text only, no markdown, no bold, no bullet symbols
- Counter the prosecutor with alternative explanations (compression, camera quality, re-encoding)
- Keep it under 100 words per round
- End with one clear counter-conclusion sentence

Round {round_number} of {total_rounds}.
{previous_context}"""

JUDGE_SYSTEM_PROMPT = """You are the Chief Forensic Judge. You reviewed a {total_rounds}-round debate between a Prosecutor (media is FAKE) and a Defender (media is REAL).

Respond with ONLY this JSON, nothing else:
{{
    "verdict": "FAKE" or "REAL",
    "confidence": <float 0.0-1.0>,
    "truth_score": <int 0-100, 100 = definitely real>,
    "reasoning": "<one sentence verdict summary>",
    "prosecutor_strength": <float 0.0-1.0>,
    "defender_strength": <float 0.0-1.0>,
    "key_evidence": ["<short point 1>", "<short point 2>", "<short point 3>"]
}}

Keep key_evidence points under 10 words each. Keep reasoning under 30 words."""

def build_analysis_context(analysis_data: dict) -> str:
    """Format ML model results into a context string for the debate agents."""
    lines = [
        "ML Analysis Data:",
        f"Verdict: {analysis_data.get('verdict', 'UNKNOWN')}",
        f"Confidence: {analysis_data.get('confidence', 0)}%",
        f"Truth Score: {analysis_data.get('truth_score', 0)}/100",
        f"File: {analysis_data.get('filename', 'unknown')}",
    ]

    scores = analysis_data.get("scores", [])
    if scores:
        lines.append("Score Breakdown:")
        for s in scores:
            lines.append(f"  {s['label']}: {s['score'] * 100:.2f}%")

    temporal = analysis_data.get("temporal_data", {})
    if temporal:
        segments = temporal.get("segments", [])
        lines.append(f"Temporal: {len(segments)} frames analyzed")
        high_conf = [s for s in segments if s.get("confidence", 0) > 0.6]
        if high_conf:
            lines.append(f"Suspicious segments: {len(high_conf)}")

    audio = analysis_data.get("audio_data", {})
    if audio:
        lines.append(f"Audio Verdict: {audio.get('verdict', 'N/A')} ({audio.get('confidence', 0):.1f}%)")

    return "\n".join(lines)
