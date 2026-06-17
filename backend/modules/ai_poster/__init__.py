from fastapi import APIRouter, Form
from core.schemas import ApiResponse
import json

router = APIRouter(prefix="/api/ai-poster", tags=["AI Poster"])

metadata = {
    "name": "AI Poster",
    "icon": "magic",
    "description": "Describe an event in plain text and the AI generates a poster design automatically.",
    "order": 5,
}

OLLAMA_EXTRACT_PROMPT = """Extract structured event information from the following description.
Return ONLY valid JSON with these exact fields:
- "title": string (event title)
- "subtitle": string (optional subtitle, empty string if none)
- "date": string (event date)
- "venue": string (event location)
- "theme": string (one of: "modern", "classic", "nature", "celebration")

Description: {text}
"""


@router.post("/generate", response_model=ApiResponse)
async def generate_ai_poster(description: str = Form(...)):
    return ApiResponse(success=False, error="Not implemented yet (Ollama integration)")
    # Steps once implemented:
    # 1. Call Ollama with OLLAMA_EXTRACT_PROMPT
    # 2. Parse JSON response
    # 3. Forward to poster_maker.generate_poster()
    # 4. Return the generated poster


@router.post("/refine", response_model=ApiResponse)
async def refine_poster(
    description: str = Form(""),
    title: str = Form(""),
    subtitle: str = Form(""),
    date: str = Form(""),
    venue: str = Form(""),
    theme: str = Form("modern"),
):
    return ApiResponse(success=False, error="Not implemented yet")


async def setup():
    pass


async def teardown():
    pass
