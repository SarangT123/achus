from fastapi import Header, Depends, HTTPException
from sqlalchemy import select

from .database import get_session, User
from .auth import validate_token


async def get_current_user(
    authorization: str = Header(None),
    session=Depends(get_session),
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")

    token = authorization[7:]
    username = await validate_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    result = await session.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
