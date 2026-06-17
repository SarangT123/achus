from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import Response
from core.schemas import ApiResponse
from core.config import settings
from PIL import Image
import shutil
import tempfile
from pathlib import Path

router = APIRouter(prefix="/api/image-compression", tags=["Image Compression"])

metadata = {
    "name": "Image Compression",
    "icon": "compress",
    "description": "Upload an image with a target file size. Binary-search compression to hit it exactly.",
    "order": 3,
}


@router.post("/compress", response_model=ApiResponse)
async def compress_image(file: UploadFile = File(...), target_size: int = Form(500)):
    return ApiResponse(success=False, error="Not implemented yet")


async def setup():
    pass


async def teardown():
    pass
