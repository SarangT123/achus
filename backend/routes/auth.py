from fastapi import APIRouter, Depends, Form, Header, HTTPException
from sqlalchemy import select
from pydantic import BaseModel

from core.database import get_session, User
from core.auth import hash_password, verify_password, generate_token, remove_token
from core.deps import get_current_user
from core.schemas import ApiResponse
from core.config import settings
from pathlib import Path

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=ApiResponse)
async def register(
    username: str = Form(...),
    password: str = Form(...),
    session=Depends(get_session),
):
    if len(username) < 2:
        return ApiResponse(success=False, error="Username must be at least 2 characters")
    if len(password) < 4:
        return ApiResponse(success=False, error="Password must be at least 4 characters")

    result = await session.execute(select(User).where(User.username == username))
    if result.scalar_one_or_none():
        return ApiResponse(success=False, error="Username already taken")

    user = User(username=username, password_hash=hash_password(password), role="user")
    session.add(user)
    await session.commit()

    storage_path = Path(settings.storage_path) / username
    storage_path.mkdir(parents=True, exist_ok=True)

    token = await generate_token(username)
    return ApiResponse(data={
        "token": token,
        "user": {"id": user.id, "username": user.username, "role": user.role},
    })


@router.post("/login", response_model=ApiResponse)
async def login(
    username: str = Form(...),
    password: str = Form(...),
    session=Depends(get_session),
):
    result = await session.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        return ApiResponse(success=False, error="Invalid username or password")

    token = await generate_token(username)
    return ApiResponse(data={
        "token": token,
        "user": {"id": user.id, "username": user.username, "role": user.role},
    })


@router.get("/me", response_model=ApiResponse)
async def me(current_user=Depends(get_current_user)):
    return ApiResponse(data={
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "created_at": str(current_user.created_at),
    })


@router.post("/logout", response_model=ApiResponse)
async def logout(
    current_user=Depends(get_current_user),
    authorization: str = Header(None),
):
    if authorization and authorization.startswith("Bearer "):
        await remove_token(authorization[7:])
    return ApiResponse(data={"message": "Logged out"})
