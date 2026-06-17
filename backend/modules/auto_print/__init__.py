from fastapi import APIRouter, UploadFile, File
from core.printer_watcher import printer_watcher
from core.config import settings
from core.schemas import ApiResponse
import shutil
from pathlib import Path
import asyncio

router = APIRouter(prefix="/api/auto-print", tags=["Auto Print"])

metadata = {
    "name": "Auto Print",
    "icon": "printer",
    "description": "Drag-and-drop PDF printing with offline queue. Prints automatically when the USB printer reconnects.",
    "order": 1,
}


@router.get("/status", response_model=ApiResponse)
async def get_status():
    queue_dir = Path(settings.queue_path)
    queue_count = len(list(queue_dir.glob("*.pdf"))) if queue_dir.exists() else 0
    return ApiResponse(data={
        "online": printer_watcher.is_online,
        "queue_count": queue_count,
    })


@router.post("/upload", response_model=ApiResponse)
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        return ApiResponse(success=False, error="Only PDF files are accepted")

    queue_dir = Path(settings.queue_path)
    queue_dir.mkdir(parents=True, exist_ok=True)
    dest = queue_dir / file.filename

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    if printer_watcher.is_online:
        proc = await asyncio.create_subprocess_exec("lp", str(dest))
        await proc.communicate()
        if proc.returncode == 0:
            dest.unlink()
            return ApiResponse(data={"message": "Printed immediately", "queued": False})

    return ApiResponse(data={"message": "Queued for printing", "queued": True})


@router.get("/queue", response_model=ApiResponse)
async def list_queue():
    queue_dir = Path(settings.queue_path)
    if not queue_dir.exists():
        return ApiResponse(data=[])
    files = [{"filename": f.name, "size": f.stat().st_size, "modified": f.stat().st_mtime}
             for f in sorted(queue_dir.glob("*.pdf"))]
    return ApiResponse(data=files)


@router.delete("/queue/{filename}", response_model=ApiResponse)
async def remove_from_queue(filename: str):
    file = Path(settings.queue_path) / filename
    if file.exists():
        file.unlink()
        return ApiResponse(data={"message": "Removed from queue"})
    return ApiResponse(success=False, error="File not found in queue")


async def setup():
    pass


async def teardown():
    pass
