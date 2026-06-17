from fastapi import APIRouter, UploadFile, File, Form, Body
from fastapi.responses import FileResponse
from core.schemas import ApiResponse
from typing import List, Optional

from . import service

router = APIRouter(prefix="/api/pdf-tools", tags=["PDF Tools"])

metadata = {
    "name": "PDF Tools",
    "icon": "file-pdf",
    "description": "Merge, split, compress, convert, rotate, watermark, OCR, and more — all locally.",
    "order": 2,
}


@router.post("/merge")
async def merge_pdfs(files: List[UploadFile] = File(...)):
    try:
        result = service.merge_pdfs(files)
        return FileResponse(str(result), media_type="application/pdf", filename="merged.pdf")
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


@router.post("/split")
async def split_pdf(file: UploadFile = File(...), ranges: str = Form(...)):
    try:
        result = service.split_pdf(file, ranges)
        return FileResponse(str(result), media_type="application/pdf", filename="split.pdf")
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


@router.post("/compress")
async def compress_pdf(file: UploadFile = File(...), quality: int = Form(75)):
    try:
        result = service.compress_pdf(file, quality)
        return FileResponse(str(result), media_type="application/pdf", filename="compressed.pdf")
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


@router.post("/convert")
async def convert_file(file: UploadFile = File(...), target_format: str = Form(...)):
    try:
        result = service.convert_file(file, target_format)
        media_type = "application/zip" if result.suffix == ".zip" else "application/pdf"
        if result.suffix == ".txt":
            media_type = "text/plain"
        if result.suffix in (".png", ".jpg", ".jpeg"):
            media_type = f"image/{result.suffix.lstrip('.')}"
        return FileResponse(str(result), media_type=media_type, filename=result.name)
    except ValueError as e:
        return ApiResponse(success=False, error=str(e))
    except Exception as e:
        return ApiResponse(success=False, error=f"Conversion failed: {str(e)}")


@router.post("/rotate")
async def rotate_pdf(file: UploadFile = File(...), degrees: int = Form(90)):
    try:
        result = service.rotate_pdf(file, degrees)
        return FileResponse(str(result), media_type="application/pdf", filename="rotated.pdf")
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


@router.post("/extract")
async def extract_pages(file: UploadFile = File(...), pages: str = Form(...)):
    try:
        result = service.extract_pages(file, pages)
        return FileResponse(str(result), media_type="application/pdf", filename="extracted.pdf")
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


@router.post("/watermark")
async def add_watermark(file: UploadFile = File(...), text: str = Form("DRAFT"), opacity: float = Form(0.3)):
    try:
        result = service.add_watermark(file, text)
        return FileResponse(str(result), media_type="application/pdf", filename="watermarked.pdf")
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


@router.post("/page-numbers")
async def add_page_numbers(file: UploadFile = File(...), start: int = Form(1)):
    try:
        result = service.add_page_numbers(file, start)
        return FileResponse(str(result), media_type="application/pdf", filename="numbered.pdf")
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


@router.post("/reorder")
async def reorder_pages(file: UploadFile = File(...), order: str = Form(...)):
    try:
        result = service.reorder_pages(file, order)
        return FileResponse(str(result), media_type="application/pdf", filename="reordered.pdf")
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


@router.post("/ocr")
async def ocr_pdf(file: UploadFile = File(...)):
    try:
        result = service.ocr_pdf(file)
        return FileResponse(str(result), media_type="application/pdf", filename="ocr.pdf")
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


@router.post("/encrypt")
async def encrypt_pdf(file: UploadFile = File(...), password: str = Form(...)):
    try:
        result = service.encrypt_pdf(file, password)
        return FileResponse(str(result), media_type="application/pdf", filename="encrypted.pdf")
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


async def setup():
    pass


async def teardown():
    pass
