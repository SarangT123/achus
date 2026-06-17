from fastapi import APIRouter, Form, UploadFile, File
from fastapi.responses import FileResponse
from core.schemas import ApiResponse
from pathlib import Path
from . import service

router = APIRouter(prefix="/api/scan", tags=["Document Scanner"])

metadata = {
    "name": "Document Scanner",
    "icon": "box",
    "description": "Upload a photo of a document — auto-deskew, crop, enhance, and save as PDF.",
    "order": 9,
}


@router.post("/scan")
async def scan_document(
    file: UploadFile = File(...),
    deskew: bool = Form(True),
    autocrop: bool = Form(True),
    perspective: bool = Form(True),
    black_white: bool = Form(False),
    enhance: bool = Form(True),
):
    try:
        image_bytes = await file.read()
        result = service.scan_image(
            image_bytes,
            auto_deskew=deskew,
            auto_crop=autocrop,
            perspective=perspective,
            black_white=black_white,
            enhance=enhance,
        )
        name = file.filename or "document"
        stem = Path(name).stem
        return FileResponse(str(result), media_type="application/pdf",
                            filename=f"{stem}_scanned.pdf")
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


async def setup():
    pass


async def teardown():
    pass
