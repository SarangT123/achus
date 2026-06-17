from fastapi import APIRouter, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from core.schemas import ApiResponse
from core.config import settings
import shutil
from pathlib import Path

router = APIRouter(prefix="/api/storage", tags=["Cloud Storage"])

metadata = {
    "name": "Cloud Storage",
    "icon": "cloud",
    "description": "Upload, download, delete, and organize files into folders — like Google Drive on your laptop.",
    "order": 6,
}


def resolve_path(user_path: str) -> Path:
    base = Path(settings.storage_path).resolve()
    safe = base / user_path.lstrip("/")
    safe = safe.resolve()
    if not str(safe).startswith(str(base)):
        raise ValueError("Path traversal denied")
    return safe


@router.get("/list", response_model=ApiResponse)
async def list_files(path: str = Query("/")):
    try:
        target = resolve_path(path)
        if not target.exists():
            return ApiResponse(success=False, error="Path does not exist")
        if not target.is_dir():
            return ApiResponse(success=False, error="Path is not a directory")

        entries = []
        for item in sorted(target.iterdir()):
            entries.append({
                "name": item.name,
                "is_dir": item.is_dir(),
                "size": item.stat().st_size if item.is_file() else 0,
                "modified": item.stat().st_mtime,
            })
        return ApiResponse(data={"path": path, "entries": entries})
    except ValueError as e:
        return ApiResponse(success=False, error=str(e))


@router.post("/upload", response_model=ApiResponse)
async def upload_file(path: str = Form("/"), files: list[UploadFile] = File(...)):
    try:
        target_dir = resolve_path(path)
        target_dir.mkdir(parents=True, exist_ok=True)
        uploaded = []
        for file in files:
            dest = target_dir / file.filename
            with dest.open("wb") as f:
                shutil.copyfileobj(file.file, f)
            uploaded.append(file.filename)
        return ApiResponse(data={"uploaded": uploaded})
    except ValueError as e:
        return ApiResponse(success=False, error=str(e))


@router.get("/download/{path:path}")
async def download_file(path: str):
    try:
        file = resolve_path(path)
        if not file.exists() or file.is_dir():
            return ApiResponse(success=False, error="File not found")
        return FileResponse(str(file), filename=file.name)
    except ValueError as e:
        return ApiResponse(success=False, error=str(e))


@router.delete("/delete", response_model=ApiResponse)
async def delete_item(path: str = Form(...)):
    try:
        target = resolve_path(path)
        if not target.exists():
            return ApiResponse(success=False, error="Path does not exist")
        if target.is_dir():
            import shutil as sh
            sh.rmtree(target)
        else:
            target.unlink()
        return ApiResponse(data={"message": "Deleted"})
    except ValueError as e:
        return ApiResponse(success=False, error=str(e))


@router.post("/mkdir", response_model=ApiResponse)
async def create_directory(path: str = Form(...)):
    try:
        target = resolve_path(path)
        target.mkdir(parents=True, exist_ok=True)
        return ApiResponse(data={"message": "Directory created"})
    except ValueError as e:
        return ApiResponse(success=False, error=str(e))


@router.post("/move", response_model=ApiResponse)
async def move_item(source: str = Form(...), destination: str = Form(...)):
    try:
        src = resolve_path(source)
        dst = resolve_path(destination)
        if not src.exists():
            return ApiResponse(success=False, error="Source does not exist")
        src.rename(dst)
        return ApiResponse(data={"message": "Moved"})
    except ValueError as e:
        return ApiResponse(success=False, error=str(e))


async def setup():
    Path(settings.storage_path).mkdir(parents=True, exist_ok=True)


async def teardown():
    pass
