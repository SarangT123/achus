from fastapi import APIRouter, Form
from fastapi.responses import FileResponse
from core.schemas import ApiResponse

from . import service

router = APIRouter(prefix="/api/poster-maker", tags=["Poster Maker"])

metadata = {
    "name": "Poster Maker",
    "icon": "poster",
    "description": "Fill in a form (Title, Subtitle, Date, Venue) and get a high-res print-ready PDF poster.",
    "order": 4,
}


@router.get("/templates", response_model=ApiResponse)
async def list_templates():
    return ApiResponse(data={
        "templates": [
            {"id": "event", "name": "Event"},
            {"id": "workshop", "name": "Workshop"},
            {"id": "notice", "name": "Notice"},
            {"id": "celebration", "name": "Celebration"},
        ],
        "themes": [
            {"id": "modern", "name": "Modern", "colors": ["#2563EB", "#EFF6FF"]},
            {"id": "classic", "name": "Classic", "colors": ["#1E293B", "#F8FAFC"]},
            {"id": "nature", "name": "Nature", "colors": ["#059669", "#ECFDF5"]},
            {"id": "celebration", "name": "Celebration", "colors": ["#D97706", "#FFFBEB"]},
        ],
    })


@router.post("/generate")
async def generate_poster(
    title: str = Form(...),
    subtitle: str = Form(""),
    date: str = Form(...),
    venue: str = Form(...),
    template: str = Form("event"),
    theme: str = Form("modern"),
):
    try:
        result = service.generate_poster(title, subtitle, date, venue, template, theme)
        return FileResponse(str(result), media_type="application/pdf",
                            filename=f"poster_{template}.pdf")
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


async def setup():
    pass


async def teardown():
    pass
