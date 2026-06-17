from fastapi import APIRouter, UploadFile, File
from core.printer_watcher import printer_watcher
from core.config import settings
from core.database import async_session, ConversionLog
from core.schemas import ApiResponse
import shutil
from pathlib import Path
import asyncio
import subprocess
from datetime import datetime

router = APIRouter(prefix="/api/auto-print", tags=["Auto Print"])

metadata = {
    "name": "Auto Print",
    "icon": "printer",
    "description": "Drag-and-drop PDF printing with offline queue. Prints automatically when the USB printer reconnects.",
    "order": 1,
}


async def _log_print(filename: str, success: bool, error: str = None):
    async with async_session() as session:
        log = ConversionLog(
            module="auto_print",
            operation="print",
            input_name=filename,
            success=1 if success else 0,
            error_message=error,
        )
        session.add(log)
        await session.commit()


async def _list_printers() -> list[dict]:
    try:
        proc = await asyncio.create_subprocess_exec(
            "lpstat", "-p", "-d",
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        output = stdout.decode().strip()
        if not output:
            return []

        printers = []
        default_printer = None
        for line in output.split("\n"):
            line = line.strip().lower()
            if line.startswith("system default destination:"):
                default_printer = line.split(":")[-1].strip()
                continue
            if line.startswith("printer ") and ("idle" in line or "printing" in line or "disabled" in line):
                parts = line.split()
                name = parts[1]
                status = "idle" if "idle" in line else "printing" if "printing" in line else "disabled"
                printers.append({
                    "name": name,
                    "status": status,
                    "is_default": name == default_printer,
                })
        return printers
    except Exception:
        return []


@router.get("/status", response_model=ApiResponse)
async def get_status():
    queue_dir = Path(settings.queue_path)
    queue_count = len(list(queue_dir.glob("*.pdf"))) if queue_dir.exists() else 0
    printers = await _list_printers()
    return ApiResponse(data={
        "online": printer_watcher.is_online,
        "queue_count": queue_count,
        "printers": printers,
    })


@router.post("/upload", response_model=ApiResponse)
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        return ApiResponse(success=False, error="Only PDF files are accepted")

    queue_dir = Path(settings.queue_path)
    queue_dir.mkdir(parents=True, exist_ok=True)

    # Handle duplicate filenames
    dest = queue_dir / file.filename
    counter = 1
    while dest.exists():
        stem = Path(file.filename).stem
        suffix = Path(file.filename).suffix
        dest = queue_dir / f"{stem}_{counter}{suffix}"
        counter += 1

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    if printer_watcher.is_online:
        proc = await asyncio.create_subprocess_exec(
            "lp", str(dest),
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode == 0:
            dest.unlink()
            await _log_print(file.filename, True)
            return ApiResponse(data={
                "message": "Printed immediately",
                "queued": False,
            })
        else:
            err_msg = stderr.decode().strip()
            await _log_print(file.filename, False, err_msg)
            return ApiResponse(data={
                "message": f"Print failed ({err_msg}). File queued.",
                "queued": True,
            })

    return ApiResponse(data={
        "message": "Printer offline. File queued — will print automatically when connected.",
        "queued": True,
    })


@router.get("/queue", response_model=ApiResponse)
async def list_queue():
    queue_dir = Path(settings.queue_path)
    if not queue_dir.exists():
        return ApiResponse(data=[])
    files = []
    for f in sorted(queue_dir.glob("*.pdf"), key=lambda p: p.stat().st_mtime):
        files.append({
            "filename": f.name,
            "size": f.stat().st_size,
            "modified": datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
        })
    return ApiResponse(data=files)


@router.delete("/queue/{filename}", response_model=ApiResponse)
async def remove_from_queue(filename: str):
    file = Path(settings.queue_path) / filename
    if file.exists():
        file.unlink()
        return ApiResponse(data={"message": "Removed from queue"})
    return ApiResponse(success=False, error="File not found in queue")


@router.post("/queue/clear", response_model=ApiResponse)
async def clear_queue():
    queue_dir = Path(settings.queue_path)
    if not queue_dir.exists():
        return ApiResponse(data={"message": "Queue is empty", "count": 0})
    count = 0
    for f in queue_dir.glob("*.pdf"):
        f.unlink()
        count += 1
    return ApiResponse(data={"message": f"Cleared {count} file(s)", "count": count})


@router.get("/history", response_model=ApiResponse)
async def print_history(limit: int = 20):
    async with async_session() as session:
        from sqlalchemy import select, desc
        result = await session.execute(
            select(ConversionLog)
            .where(ConversionLog.module == "auto_print")
            .order_by(desc(ConversionLog.created_at))
            .limit(limit)
        )
        logs = result.scalars().all()
        data = []
        for log in logs:
            data.append({
                "filename": log.input_name,
                "success": bool(log.success),
                "error": log.error_message,
                "timestamp": log.created_at.isoformat() if log.created_at else None,
            })
        return ApiResponse(data=data)


@router.get("/printers", response_model=ApiResponse)
async def list_printers():
    printers = await _list_printers()
    return ApiResponse(data=printers)


async def setup():
    pass


async def teardown():
    pass
