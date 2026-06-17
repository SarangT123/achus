import hashlib
import secrets
from dataclasses import dataclass
from typing import Optional


_token_store: dict[str, str] = {}


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hash: str) -> bool:
    return hash_password(password) == hash


def generate_token(username: str) -> str:
    token = secrets.token_hex(32)
    _token_store[token] = username
    return token


def validate_token(token: str) -> Optional[str]:
    return _token_store.get(token)


def remove_token(token: str):
    _token_store.pop(token, None)
