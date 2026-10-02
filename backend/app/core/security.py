from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

password_hash = PasswordHash.recommended()
DUMMY_PASSWORD_HASH = password_hash.hash("NOVA dummy password for timing parity")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(user_id: int, session_version: int) -> tuple[str, int]:
    expires_in = settings.jwt_expire_minutes * 60
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub": str(user_id),
            "ver": session_version,
            "iss": "nova-store",
            "iat": now,
            "exp": now + timedelta(seconds=expires_in),
        },
        settings.jwt_secret,
        algorithm="HS256",
    )
    return token, expires_in


def get_current_user(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Please sign in to continue.",
    )
    token = request.cookies.get("nova_session")
    if not token:
        raise unauthorized
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            issuer="nova-store",
            options={"require": ["sub", "ver", "exp", "iat", "iss"]},
        )
        user_id = int(payload["sub"])
    except (InvalidTokenError, TypeError, ValueError, KeyError):
        raise unauthorized from None
    user = db.scalar(select(User).where(User.id == user_id))
    if user is None or payload["ver"] != user.session_version:
        raise unauthorized
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
