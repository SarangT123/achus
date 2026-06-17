from fastapi import APIRouter, Depends, Form
from sqlalchemy import select, delete
from pathlib import Path
import shutil

from core.database import get_session, User
from core.auth import hash_password
from core.deps import require_admin
from core.schemas import ApiResponse
from core.config import settings

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/users", response_model=ApiResponse)
async def list_users(
    session=Depends(get_session),
    admin=Depends(require_admin),
):
    result = await session.execute(select(User).order_by(User.created_at))
    users = result.scalars().all()
    return ApiResponse(data=[{
        "id": u.id,
        "username": u.username,
        "role": u.role,
        "created_at": str(u.created_at),
    } for u in users])


@router.post("/users", response_model=ApiResponse)
async def create_user(
    username: str = Form(...),
    password: str = Form(...),
    role: str = Form("user"),
    session=Depends(get_session),
    admin=Depends(require_admin),
):
    if len(username) < 2:
        return ApiResponse(success=False, error="Username too short")
    if len(password) < 4:
        return ApiResponse(success=False, error="Password too short")
    if role not in ("user", "admin"):
        return ApiResponse(success=False, error="Invalid role")

    existing = await session.execute(select(User).where(User.username == username))
    if existing.scalar_one_or_none():
        return ApiResponse(success=False, error="Username exists")

    user = User(username=username, password_hash=hash_password(password), role=role)
    session.add(user)
    await session.commit()

    (Path(settings.storage_path) / username).mkdir(parents=True, exist_ok=True)
    return ApiResponse(data={"id": user.id, "username": user.username, "role": user.role})


@router.delete("/users/{user_id}", response_model=ApiResponse)
async def delete_user(
    user_id: int,
    session=Depends(get_session),
    admin=Depends(require_admin),
):
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return ApiResponse(success=False, error="User not found")
    if user.role == "admin":
        # check if it's the last admin
        admin_count = await session.execute(select(User).where(User.role == "admin"))
        if len(admin_count.scalars().all()) <= 1:
            return ApiResponse(success=False, error="Cannot delete the last admin")

    await session.execute(delete(User).where(User.id == user_id))
    await session.commit()

    user_dir = Path(settings.storage_path) / user.username
    if user_dir.exists():
        shutil.rmtree(user_dir)

    return ApiResponse(data={"message": f"User {user.username} deleted"})


@router.get("/storage/{username}", response_model=ApiResponse)
async def list_user_storage(
    username: str,
    path: str = "/",
    admin=Depends(require_admin),
):
    base = (Path(settings.storage_path) / username).resolve()
    if not base.exists():
        return ApiResponse(data={"path": path, "entries": []})

    target = (base / path.lstrip("/")).resolve()
    if not str(target).startswith(str(base)):
        return ApiResponse(success=False, error="Path traversal denied")
    if not target.exists() or not target.is_dir():
        return ApiResponse(success=False, error="Path does not exist")

    entries = []
    for item in sorted(target.iterdir()):
        entries.append({
            "name": item.name,
            "is_dir": item.is_dir(),
            "size": item.stat().st_size if item.is_file() else 0,
            "modified": item.stat().st_mtime,
        })
    return ApiResponse(data={"path": path, "entries": entries, "username": username})


@router.delete("/storage/{username}", response_model=ApiResponse)
async def delete_user_file(
    username: str,
    path: str = Form(...),
    admin=Depends(require_admin),
):
    base = (Path(settings.storage_path) / username).resolve()
    target = (base / path.lstrip("/")).resolve()
    if not str(target).startswith(str(base)):
        return ApiResponse(success=False, error="Path traversal denied")
    if not target.exists():
        return ApiResponse(success=False, error="Path does not exist")
    if target.is_dir():
        shutil.rmtree(target)
    else:
        target.unlink()
    return ApiResponse(data={"message": "Deleted"})
