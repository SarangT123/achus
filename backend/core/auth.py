import hashlib
import secrets
from typing import Optional
from sqlalchemy import select, delete

from .database import UserSession, get_session


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hash: str) -> bool:
    return hash_password(password) == hash


async def generate_token(username: str) -> str:
    token = secrets.token_hex(32)
    async for session in get_session():
        session.add(UserSession(token=token, username=username))
        await session.commit()
        break
    return token


async def validate_token(token: str) -> Optional[str]:
    async for session in get_session():
        result = await session.execute(select(UserSession).where(UserSession.token == token))
        row = result.scalar_one_or_none()
        return row.username if row else None


def remove_token(token: str):
    pass
