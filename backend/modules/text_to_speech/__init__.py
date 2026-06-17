from fastapi import APIRouter, Form
from fastapi.responses import FileResponse
from core.schemas import ApiResponse
from . import service

router = APIRouter(prefix="/api/tts", tags=["Text to Speech"])

metadata = {
    "name": "Text to Speech",
    "icon": "magic",
    "description": "Convert text to speech — play in browser or download as MP3.",
    "order": 8,
}


@router.get("/voices", response_model=ApiResponse)
async def list_voices():
    voices = await service.list_voices()
    return ApiResponse(data={"voices": voices})


@router.post("/speak")
async def speak(
    text: str = Form(...),
    voice: str = Form("en-US-AriaNeural"),
    rate: int = Form(0),
):
    if not text.strip():
        return ApiResponse(success=False, error="Text cannot be empty")
    try:
        result = await service.speak(text, voice=voice, rate=rate)
        return FileResponse(str(result), media_type="audio/mpeg",
                            filename="speech.mp3")
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


async def setup():
    pass


async def teardown():
    pass
