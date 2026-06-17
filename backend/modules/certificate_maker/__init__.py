import csv
import io
import zipfile
from pathlib import Path
from fastapi import APIRouter, Form, UploadFile, File
from fastapi.responses import FileResponse
from core.schemas import ApiResponse
from . import service

router = APIRouter(prefix="/api/certificate", tags=["Certificate Maker"])

metadata = {
    "name": "Certificate Maker",
    "icon": "poster",
    "description": "Generate completion certificates for students — single or bulk from CSV.",
    "order": 7,
}


@router.post("/generate")
async def generate_certificate(
    student_name: str = Form(...),
    course_name: str = Form(...),
    date: str = Form(""),
    description: str = Form(""),
    signature_name: str = Form(""),
    theme: str = Form("classic"),
    size: str = Form("a4-landscape"),
):
    try:
        result = service.generate_certificate(
            student_name=student_name,
            course_name=course_name,
            date=date,
            description=description,
            signature_name=signature_name,
            theme_id=theme,
            size=size,
        )
        return FileResponse(str(result), media_type="application/pdf",
                            filename="certificate.pdf")
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


@router.post("/bulk")
async def generate_bulk(
    file: UploadFile = File(...),
    theme: str = Form("classic"),
    size: str = Form("a4-landscape"),
):
    try:
        content = await file.read()
        reader = csv.DictReader(io.StringIO(content.decode()))
        entries = list(reader)

        if not entries:
            return ApiResponse(success=False, error="CSV is empty")

        files = service.generate_bulk(entries, theme_id=theme, size=size)

        if len(files) == 1:
            return FileResponse(str(files[0]), media_type="application/pdf",
                                filename="certificate.pdf")

        zip_path = Path(files[0].parent) / "certificates.zip"
        with zipfile.ZipFile(zip_path, "w") as zf:
            for f in files:
                zf.write(f, f.name)
                f.unlink()

        return FileResponse(str(zip_path), media_type="application/zip",
                            filename="certificates.zip")
    except Exception as e:
        return ApiResponse(success=False, error=str(e))


@router.get("/themes", response_model=ApiResponse)
async def list_themes():
    return ApiResponse(data={
        "themes": [
            {"id": "classic", "name": "Classic Gold", "description": "Elegant serif design with gold accents"},
            {"id": "modern", "name": "Modern Blue", "description": "Clean sans-serif with blue accent"},
            {"id": "colorful", "name": "Colorful Fun", "description": "Bright and playful for kids"},
        ],
        "sizes": [
            {"id": "a4-landscape", "name": "A4 Landscape"},
            {"id": "a4-portrait", "name": "A4 Portrait"},
        ],
    })


async def setup():
    pass


async def teardown():
    pass
