from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import Response, FileResponse
from core.schemas import ApiResponse

from . import service

router = APIRouter(prefix="/api/image-compression", tags=["Image Compression"])

metadata = {
    "name": "Image Compression",
    "icon": "compress",
    "description": "Upload an image with a target file size. Binary-search compression to hit it exactly.",
    "order": 3,
}

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}


@router.post("/compress")
async def compress_image(file: UploadFile = File(...), target_size: int = Form(500)):
    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        return ApiResponse(success=False, error=f"Unsupported format. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")

    try:
        result = service.compress_image(file, target_size)
        media_type = f"image/{result.suffix.lstrip('.')}"
        if media_type == "image/jpg":
            media_type = "image/jpeg"
        return FileResponse(str(result), media_type=media_type, filename=result.name)
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


async def setup():
    pass


async def teardown():
    pass
