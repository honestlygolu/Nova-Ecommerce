import hashlib
from datetime import datetime, timedelta, timezone
from ipaddress import ip_address

from fastapi import HTTPException, Request
from sqlalchemy import case, delete, or_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.auth_rate_limit import AuthRateLimit
from app.core.config import settings

WINDOW = timedelta(minutes=15)


def rate_limit_hash(scope: str, client_host: str, identity: str) -> str:
    material = f"{scope}:{client_host}:{identity.casefold()}".encode("utf-8")
    return hashlib.sha256(material).hexdigest()


def resolve_client_host(request: Request) -> str:
    peer = request.client.host if request.client else "unknown"
    if settings.trusted_proxy_count == 0:
        return peer
    forwarded = request.headers.get("x-forwarded-for", "")
    chain = [address.strip() for address in forwarded.split(",") if address.strip()]
    if len(chain) < settings.trusted_proxy_count:
        return peer
    candidate = chain[-settings.trusted_proxy_count]
    try:
        return ip_address(candidate).compressed
    except ValueError:
        return peer


def enforce_auth_rate_limit(
    db: Session,
    request: Request,
    *,
    scope: str,
    identity: str,
    identity_limit: int,
    ip_limit: int,
) -> None:
    client_host = resolve_client_host(request)
    now = datetime.now(timezone.utc)
    cutoff = now - WINDOW
    blocked = False
    db.execute(
        delete(AuthRateLimit).where(
            AuthRateLimit.window_started_at < cutoff - WINDOW,
            or_(AuthRateLimit.blocked_until.is_(None), AuthRateLimit.blocked_until <= now),
        )
    )

    for key_hash, limit in (
        (rate_limit_hash(scope, "account", f"identity:{identity}"), identity_limit),
        (rate_limit_hash(scope, client_host, "ip"), ip_limit),
    ):
        active_block = AuthRateLimit.blocked_until.is_not(None) & (AuthRateLimit.blocked_until > now)
        expired_window = AuthRateLimit.window_started_at <= cutoff
        statement = insert(AuthRateLimit).values(
            key_hash=key_hash,
            attempts=1,
            window_started_at=now,
        ).on_conflict_do_update(
            index_elements=[AuthRateLimit.key_hash],
            set_={
                "attempts": case(
                    (active_block, AuthRateLimit.attempts),
                    (expired_window, 1),
                    else_=AuthRateLimit.attempts + 1,
                ),
                "window_started_at": case(
                    (expired_window, now),
                    else_=AuthRateLimit.window_started_at,
                ),
                "blocked_until": case(
                    (active_block, AuthRateLimit.blocked_until),
                    (expired_window, None),
                    (AuthRateLimit.attempts >= limit, now + WINDOW),
                    else_=None,
                ),
            },
        ).returning(AuthRateLimit.blocked_until)
        blocked_until = db.execute(statement).scalar_one()
        blocked = blocked or (blocked_until is not None and blocked_until > now)

    db.commit()
    if blocked:
        raise HTTPException(status_code=429, detail="Too many attempts. Please wait a few minutes and try again.")


def clear_auth_rate_limit(db: Session, request: Request, *, scope: str, identity: str) -> None:
    client_host = resolve_client_host(request)
    hashes = (
        rate_limit_hash(scope, "account", f"identity:{identity}"),
        rate_limit_hash(scope, client_host, "ip"),
    )
    db.execute(delete(AuthRateLimit).where(AuthRateLimit.key_hash.in_(hashes)))
    db.commit()
