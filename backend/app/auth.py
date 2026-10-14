"""Password hashing (PBKDF2-HMAC-SHA256) and JWT issuing/verification."""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import re
import time

import jwt

from .errors import AuthError, DomainError

USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,32}$")


def hash_password(password: str, iterations: int = 200_000) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    b64 = lambda b: base64.b64encode(b).decode()
    return f"pbkdf2_sha256${iterations}${b64(salt)}${b64(digest)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _, iters, salt_b64, hash_b64 = stored.split("$")
        expected = base64.b64decode(hash_b64)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt_b64), int(iters))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(digest, expected)


def validate_credentials(username: str, password: str) -> None:
    if not USERNAME_RE.match(username):
        raise DomainError("Username must be 3-32 characters: letters, digits, '_', '.', '-'")
    if len(password) < 8:
        raise DomainError("Password must be at least 8 characters")


def issue_token(user_id: int, username: str, secret: str, ttl_minutes: int) -> str:
    now = int(time.time())
    return jwt.encode({"sub": str(user_id), "usr": username, "iat": now,
                       "exp": now + ttl_minutes * 60}, secret, algorithm="HS256")


def decode_token(token: str, secret: str) -> dict:
    try:
        return jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError("Invalid token") from exc
