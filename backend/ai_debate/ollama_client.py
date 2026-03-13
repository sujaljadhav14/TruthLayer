"""
Ollama client for AI Debate.
Connects to a local Ollama instance for Prosecutor/Defender/Judge LLM calls.
"""

import os
import re
import json
import asyncio
from typing import Optional

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False


class OllamaClient:
    """Fallback AI client using local Ollama instance."""

    def __init__(self):
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.model = os.getenv("OLLAMA_MODEL", "llama3")

    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        """Send prompt to Ollama and return response text."""
        if not HTTPX_AVAILABLE:
            raise RuntimeError("httpx package not installed. Run: pip install httpx")

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                return data.get("message", {}).get("content", "")
            except Exception as e:
                raise RuntimeError(f"Ollama API error: {str(e)}") from e

    async def generate_json(
        self,
        system_prompt: str,
        user_message: str,
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> dict:
        """Send prompt and parse response as JSON."""
        raw = await self.generate(
            system_prompt=system_prompt,
            user_message=user_message,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        text = raw.strip()
        if "```" in text:
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines).strip()
        # Fall back to regex extraction of {...} in case of surrounding text
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            text = match.group(0)

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {
                "verdict": "UNKNOWN",
                "confidence": 0.5,
                "truth_score": 50,
                "reasoning": f"Could not parse response. Raw: {raw[:300]}",
                "prosecutor_strength": 0.5,
                "defender_strength": 0.5,
                "key_evidence": [],
            }

    async def is_available(self) -> bool:
        """Check if Ollama server is reachable."""
        if not HTTPX_AVAILABLE:
            return False
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False


# Module-level singleton
_ollama_client: Optional[OllamaClient] = None


def get_ollama_client() -> OllamaClient:
    """Get or create the singleton Ollama client."""
    global _ollama_client
    if _ollama_client is None:
        _ollama_client = OllamaClient()
    return _ollama_client
