from fastapi import APIRouter, Form
from fastapi.responses import Response
from core.schemas import ApiResponse

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
            {"id": "event", "name": "Event", "thumbnail": None},
            {"id": "workshop", "name": "Workshop", "thumbnail": None},
            {"id": "notice", "name": "Notice", "thumbnail": None},
            {"id": "celebration", "name": "Celebration", "thumbnail": None},
        ],
        "themes": [
            {"id": "modern", "name": "Modern", "colors": ["#2563EB", "#DBEAFE"]},
            {"id": "classic", "name": "Classic", "colors": ["#1E293B", "#F8FAFC"]},
            {"id": "nature", "name": "Nature", "colors": ["#059669", "#D1FAE5"]},
            {"id": "celebration", "name": "Celebration", "colors": ["#D97706", "#FEF3C7"]},
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
    return ApiResponse(success=False, error="Not implemented yet")


async def setup():
    pass


async def teardown():
    pass
