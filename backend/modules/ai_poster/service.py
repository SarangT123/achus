import json
import re
from pathlib import Path

import httpx

from core.config import settings


OLLAMA_EXTRACT_PROMPT = """You are a structured data extractor. Extract event information from the user's description.
Return ONLY valid JSON with these exact fields (no markdown, no explanation):
{"title": "event title", "subtitle": "optional subtitle or empty string", "date": "event date", "venue": "event location", "theme": "one of: modern, classic, nature, celebration", "template": "one of: event, workshop, notice, celebration"}

Description: {text}
"""


def _parse_ollama_response(raw: str) -> dict:
    cleaned = raw.strip()
    cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
    cleaned = re.sub(r'\s*```$', '', cleaned)
    start = cleaned.find('{')
    end = cleaned.rfind('}')
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start:end+1]
    return json.loads(cleaned)


async def extract_with_ollama(description: str) -> dict:
    prompt = OLLAMA_EXTRACT_PROMPT.format(text=description)

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{settings.ollama_url}/api/generate",
            json={
                "model": settings.ollama_model,
                "prompt": prompt,
                "stream": False,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        raw_text = data.get("response", "")

    result = _parse_ollama_response(raw_text)

    valid_themes = ("modern", "classic", "nature", "celebration")
    valid_templates = ("event", "workshop", "notice", "celebration")
    return {
        "title": result.get("title", ""),
        "subtitle": result.get("subtitle", ""),
        "date": result.get("date", ""),
        "venue": result.get("venue", ""),
        "theme": result.get("theme", "modern") if result.get("theme") in valid_themes else "modern",
        "template": result.get("template", "event") if result.get("template") in valid_templates else "event",
    }


async def check_ollama_health() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.ollama_url}/api/tags")
            return resp.status_code == 200
    except Exception:
        return False
