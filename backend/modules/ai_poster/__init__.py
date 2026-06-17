from fastapi import APIRouter, Form
from fastapi.responses import FileResponse
from core.schemas import ApiResponse
from modules.poster_maker import service as poster_service

from . import service as ai_service

router = APIRouter(prefix="/api/ai-poster", tags=["AI Poster"])

metadata = {
    "name": "AI Poster",
    "icon": "magic",
    "description": "Describe an event in plain text and the AI generates a poster design automatically.",
    "order": 5,
}


@router.post("/generate")
async def generate_ai_poster(description: str = Form(...)):
    ollama_ok = await ai_service.check_ollama_health()
    if not ollama_ok:
        return ApiResponse(
            success=False,
            error="Ollama is not running. Start it with 'ollama serve' and pull a model.",
        )

    try:
        extracted = await ai_service.extract_with_ollama(description)
    except Exception as e:
        return ApiResponse(success=False, error=f"AI extraction failed: {str(e)}")

    if not extracted.get("title"):
        return ApiResponse(success=False, error="Could not extract a title from the description. Please be more specific.")

    try:
        result = poster_service.generate_poster(
            title=extracted["title"],
            subtitle=extracted.get("subtitle", ""),
            date=extracted.get("date", ""),
            venue=extracted.get("venue", ""),
            template_id=extracted.get("template", "event"),
            theme_id=extracted.get("theme", "modern"),
        )
        return FileResponse(str(result), media_type="application/pdf",
                            filename=f"ai_poster_{template}.pdf")
    except Exception as e:
        return ApiResponse(success=False, error=f"Poster generation failed: {str(e)}")


@router.post("/refine")
async def refine_poster(
    description: str = Form(""),
    title: str = Form(""),
    subtitle: str = Form(""),
    date: str = Form(""),
    venue: str = Form(""),
    theme: str = Form("modern"),
    template: str = Form("event"),
):
    try:
        result = poster_service.generate_poster(
            title=title,
            subtitle=subtitle,
            date=date,
            venue=venue,
            template_id=template,
            theme_id=theme if theme in ("modern", "classic", "nature", "celebration") else "modern",
        )
        return FileResponse(str(result), media_type="application/pdf",
                            filename=f"ai_poster_{template}.pdf")
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


@router.get("/health", response_model=ApiResponse)
async def ai_health():
    ok = await ai_service.check_ollama_health()
    return ApiResponse(data={"ollama_running": ok, "model": "llama3.2"})


async def setup():
    pass


async def teardown():
    pass
