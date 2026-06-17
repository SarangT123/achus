from fastapi import APIRouter, Form, UploadFile, File
from fastapi.responses import FileResponse
from core.schemas import ApiResponse
from pathlib import Path

from . import service

router = APIRouter(prefix="/api/convert", tags=["File Converter"])

metadata = {
    "name": "File Converter",
    "icon": "box",
    "description": "Convert files between formats — images to PDF, documents to PDF, PDF to text, and more.",
    "order": 10,
}


@router.get("/formats", response_model=ApiResponse)
async def list_formats():
    cats = []
    for key, fmt in service.SUPPORTED.items():
        cats.append({
            "id": key,
            "label": fmt["label"],
            "from": fmt["from"],
            "to": fmt["to"] if isinstance(fmt["to"], list) else [fmt["to"]],
        })
    return ApiResponse(data={"categories": cats})


@router.post("/")
async def convert_file(
    file: UploadFile = File(...),
    category: str = Form(...),
    target_format: str = Form(""),
):
    try:
        ext = Path(file.filename).suffix[1:].lower()
        input_bytes = await file.read()

        if not input_bytes:
            return ApiResponse(success=False, error="Empty file")

        result = None

        if category == "image_to_pdf":
            result = service.convert_image_to_pdf(input_bytes, file.filename)
            return FileResponse(str(result), media_type="application/pdf",
                                filename=Path(file.filename).stem + ".pdf")

        elif category == "pdf_to_text":
            result = service.convert_pdf_to_text(input_bytes)
            return FileResponse(str(result), media_type="text/plain",
                                filename=Path(file.filename).stem + ".txt")

        elif category == "image_convert":
            if not target_format:
                return ApiResponse(success=False, error="target_format required")
            result = service.convert_image_format(input_bytes, target_format)
            mt = f"image/{'jpeg' if target_format in ('jpg', 'jpeg') else target_format}"
            return FileResponse(str(result), media_type=mt,
                                filename=Path(file.filename).stem + f".{target_format}")

        elif category == "office_to_pdf":
            result = service.convert_office_to_pdf(input_bytes, file.filename)
            return FileResponse(str(result), media_type="application/pdf",
                                filename=Path(file.filename).stem + ".pdf")

        elif category == "csv_to_pdf":
            delim = ","
            if ext == "tsv" or file.filename.endswith(".tsv"):
                delim = "\t"
            result = service.convert_csv_to_pdf(input_bytes, delimiter=delim)
            return FileResponse(str(result), media_type="application/pdf",
                                filename=Path(file.filename).stem + ".pdf")

        return ApiResponse(success=False, error=f"Unknown category: {category}")

    except RuntimeError as e:
        return ApiResponse(success=False, error=str(e))
    except Exception as e:
        return ApiResponse(success=False, error=f"Conversion failed: {str(e)}")


async def setup():
    pass


async def teardown():
    pass
