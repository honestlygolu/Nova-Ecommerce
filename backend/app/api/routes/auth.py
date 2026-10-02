import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    CurrentUser,
    create_access_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.password_reset import PasswordReset
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UserRead,
)
from app.services.email import send_password_reset_email
from app.services.rate_limits import clear_auth_rate_limit, enforce_auth_rate_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
DbSession = Annotated[Session, Depends(get_db)]
RESET_EMAIL_UNAVAILABLE = "Password recovery email is not configured. Please contact the site owner."


def require_csrf(request: Request) -> None:
    origin = request.headers.get("origin")
    csrf_cookie = request.cookies.get("nova_csrf")
    csrf_header = request.headers.get("x-csrf-token")
    cookie_token, separator, cookie_signature = (csrf_cookie or "").rpartition(".")
    expected_signature = hmac.new(
        settings.csrf_secret.encode("utf-8"),
        cookie_token.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if (
        origin not in settings.allowed_frontend_origins
        or not csrf_cookie
        or not csrf_header
        or not separator
        or not hmac.compare_digest(cookie_signature, expected_signature)
        or not secrets.compare_digest(csrf_cookie, csrf_header)
    ):
        raise HTTPException(status_code=403, detail="Your session has expired. Refresh and try again.")


CsrfProtected = Annotated[None, Depends(require_csrf)]


def set_session_cookie(response: Response, user: User) -> None:
    token, expires_in = create_access_token(user.id, user.session_version)
    response.set_cookie(
        key="nova_session",
        value=token,
        max_age=expires_in,
        httponly=True,
        secure=settings.cookie_secure or settings.is_production,
        samesite="lax",
        path="/api",
    )


def normalize_email(email: str) -> str:
    return email.strip().lower()


def deliver_reset_email(email: str, reset_url: str) -> None:
    try:
        send_password_reset_email(email, reset_url)
    except Exception:
        logger.exception("Could not deliver a NOVA password reset email")


@router.get("/csrf")
def issue_csrf_token(response: Response):
    raw_token = secrets.token_urlsafe(32)
    signature = hmac.new(
        settings.csrf_secret.encode("utf-8"),
        raw_token.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    token = f"{raw_token}.{signature}"
    response.set_cookie(
        key="nova_csrf",
        value=token,
        max_age=60 * 60 * 12,
        httponly=False,
        secure=settings.cookie_secure or settings.is_production,
        samesite="lax",
        path="/api",
    )
    return {"csrfToken": token}


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, response: Response, db: DbSession, request: Request, _: CsrfProtected):
    email = normalize_email(str(data.email))
    enforce_auth_rate_limit(
        db, request, scope="register", identity=email, identity_limit=5, ip_limit=15
    )
    user = User(
        name=data.name.strip(),
        email=email,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists.") from None
    db.refresh(user)
    clear_auth_rate_limit(db, request, scope="register", identity=email)
    set_session_cookie(response, user)
    return AuthResponse(user=UserRead.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(data: LoginRequest, response: Response, db: DbSession, request: Request, _: CsrfProtected):
    email = normalize_email(str(data.email))
    enforce_auth_rate_limit(
        db, request, scope="login", identity=email, identity_limit=5, ip_limit=30
    )
    user = db.scalar(select(User).where(User.email == email))
    stored_hash = user.hashed_password if user else DUMMY_PASSWORD_HASH
    valid_password = verify_password(data.password, stored_hash)
    if user is None or not valid_password:
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    clear_auth_rate_limit(db, request, scope="login", identity=email)
    set_session_cookie(response, user)
    return AuthResponse(user=UserRead.model_validate(user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response, _: CsrfProtected):
    response.delete_cookie(
        key="nova_session",
        secure=settings.cookie_secure or settings.is_production,
        httponly=True,
        samesite="lax",
        path="/api",
    )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserRead)
def read_current_user(user: CurrentUser):
    return user


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
def forgot_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
    request: Request,
    _: CsrfProtected,
):
    if not settings.smtp_host:
        raise HTTPException(status_code=503, detail=RESET_EMAIL_UNAVAILABLE)

    email = normalize_email(str(data.email))
    enforce_auth_rate_limit(
        db, request, scope="password-recovery", identity=email, identity_limit=3, ip_limit=15
    )
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        return {"message": "If an account exists, a reset link has been sent."}

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.execute(
        update(PasswordReset)
        .where(PasswordReset.user_id == user.id, PasswordReset.used_at.is_(None))
        .values(used_at=datetime.now(timezone.utc))
    )
    reset_record = PasswordReset(user_id=user.id, token_hash=token_hash, expires_at=expires_at)
    db.add(reset_record)
    db.commit()

    reset_url = f"{settings.frontend_url.rstrip('/')}/reset-password?token={raw_token}"
    background_tasks.add_task(deliver_reset_email, user.email, reset_url)

    return {"message": "If an account exists, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: DbSession, request: Request, _: CsrfProtected):
    token_hash = hashlib.sha256(data.token.encode("utf-8")).hexdigest()
    enforce_auth_rate_limit(
        db, request, scope="password-reset", identity=token_hash, identity_limit=5, ip_limit=30
    )
    reset_record = db.scalar(
        select(PasswordReset).where(PasswordReset.token_hash == token_hash).with_for_update()
    )
    now = datetime.now(timezone.utc)
    if (
        reset_record is None
        or reset_record.used_at is not None
        or reset_record.expires_at <= now
    ):
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired.")

    user = db.get(User, reset_record.user_id)
    if user is None:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired.")
    user.hashed_password = hash_password(data.password)
    user.session_version += 1
    reset_record.used_at = now
    db.execute(
        update(PasswordReset)
        .where(
            PasswordReset.user_id == user.id,
            PasswordReset.used_at.is_(None),
            PasswordReset.id != reset_record.id,
        )
        .values(used_at=now)
    )
    db.commit()
    clear_auth_rate_limit(db, request, scope="password-reset", identity=token_hash)
    return {"message": "Password updated. You can now sign in."}
