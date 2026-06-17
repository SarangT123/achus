from fastapi import APIRouter, Depends, Form, Query
from sqlalchemy import select, delete
from pathlib import Path
import shutil
import os
import time

import psutil

from core.database import get_session, User, Module
from core.auth import hash_password
from core.deps import require_admin
from core.schemas import ApiResponse
from core.config import settings
from core.module_loader import discover_modules

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


@router.patch("/users/{user_id}", response_model=ApiResponse)
async def update_user(
    user_id: int,
    username: str = Form(""),
    password: str = Form(""),
    role: str = Form(""),
    session=Depends(get_session),
    admin=Depends(require_admin),
):
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return ApiResponse(success=False, error="User not found")

    if role and role not in ("user", "admin"):
        return ApiResponse(success=False, error="Role must be 'user' or 'admin'")

    if role and role != user.role:
        if user.role == "admin" and role == "user":
            admin_count = await session.execute(select(User).where(User.role == "admin"))
            if len(admin_count.scalars().all()) <= 1:
                return ApiResponse(success=False, error="Cannot demote the last admin")
        user.role = role

    if username and username != user.username:
        existing = await session.execute(select(User).where(User.username == username))
        if existing.scalar_one_or_none():
            return ApiResponse(success=False, error="Username already taken")
        old_dir = Path(settings.storage_path) / user.username
        new_dir = Path(settings.storage_path) / username
        user.username = username
        if old_dir.exists():
            old_dir.rename(new_dir)

    if password:
        user.password_hash = hash_password(password)

    await session.commit()
    return ApiResponse(data={
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "message": "User updated",
    })


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


@router.get("/modules", response_model=ApiResponse)
async def list_modules(
    session=Depends(get_session),
    admin=Depends(require_admin),
):
    discovered = discover_modules()
    result = await session.execute(select(Module).order_by(Module.id))
    db_modules = {m.id: m for m in result.scalars().all()}

    modules_list = []
    for name in discovered:
        m = db_modules.get(name)
        modules_list.append({
            "id": name,
            "name": m.name if m else name.replace("_", " ").title(),
            "enabled": bool(m.enabled) if m else True,
        })
    return ApiResponse(data=modules_list)


@router.post("/modules/{module_id}/toggle", response_model=ApiResponse)
async def toggle_module(
    module_id: str,
    session=Depends(get_session),
    admin=Depends(require_admin),
):
    result = await session.execute(select(Module).where(Module.id == module_id))
    m = result.scalar_one_or_none()
    if not m:
        return ApiResponse(success=False, error=f"Module '{module_id}' not found")

    m.enabled = not m.enabled
    await session.commit()
    return ApiResponse(data={
        "id": m.id,
        "enabled": bool(m.enabled),
        "message": f"Module '{m.id}' {'enabled' if m.enabled else 'disabled'}. Restart server to apply.",
    })


LOGFILE = Path(settings.storage_path).parent / "achus.log"


@router.get("/system", response_model=ApiResponse)
async def system_info(admin=Depends(require_admin)):
    cpu = psutil.cpu_percent(interval=0.5)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    boot = int(time.time() - psutil.boot_time())
    d, rem = divmod(boot, 86400); h, rem = divmod(rem, 3600); m, _ = divmod(rem, 60)

    return ApiResponse(data={
        "cpu": {"usage_percent": cpu, "cores": os.cpu_count()},
        "memory": {
            "total_gb": round(mem.total / 1e9, 1),
            "used_gb": round(mem.used / 1e9, 1),
            "percent": mem.percent,
        },
        "disk": {
            "total_gb": round(disk.total / 1e9, 1),
            "used_gb": round(disk.used / 1e9, 1),
            "percent": disk.percent,
        },
        "uptime": f"{d}d {h}h {m}m",
        "python": os.sys.version,
    })


@router.get("/logs", response_model=ApiResponse)
async def get_logs(
    lines: int = Query(100, le=500),
    admin=Depends(require_admin),
):
    log_path = LOGFILE.resolve()
    if not log_path.exists():
        return ApiResponse(data={"lines": [], "path": str(log_path)})

    with open(log_path, "r") as f:
        all_lines = f.readlines()
    tail = all_lines[-lines:]
    return ApiResponse(data={
        "lines": tail,
        "total": len(all_lines),
        "showing": len(tail),
        "path": str(log_path),
    })


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
