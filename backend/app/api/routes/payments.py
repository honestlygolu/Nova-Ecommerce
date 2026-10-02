import hashlib
import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.db.session import get_db
from app.models.order import Order
from app.models.payment_event import PaymentEvent
from app.services.orders import complete_order_payment
from app.services.razorpay import verify_webhook_signature

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])
DbSession = Annotated[Session, Depends(get_db)]


@router.post("/razorpay/webhook")
async def razorpay_webhook(
    request: Request,
    db: DbSession,
    x_razorpay_signature: Annotated[str | None, Header()] = None,
    x_razorpay_event_id: Annotated[str | None, Header()] = None,
):
    if not settings.razorpay_webhook_secret:
        raise HTTPException(status_code=503, detail="Razorpay webhook secret is not configured.")
    raw_body = await request.body()
    signature = x_razorpay_signature or ""
    if not verify_webhook_signature(raw_body, signature):
        raise HTTPException(status_code=400, detail="Webhook signature is invalid.")
    try:
        event = json.loads(raw_body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(status_code=400, detail="Webhook payload is invalid.") from None

    event_type = str(event.get("event", "unknown"))[:80]
    event_id = (x_razorpay_event_id or hashlib.sha256(raw_body).hexdigest())[:128]
    existing = db.scalar(select(PaymentEvent.id).where(PaymentEvent.event_id == event_id))
    if existing is not None:
        return {"received": True, "duplicate": True}

    payload = event.get("payload", {})
    payment = payload.get("payment", {}).get("entity", {})
    refund = payload.get("refund", {}).get("entity", {})
    refund_notes = refund.get("notes")
    if not isinstance(refund_notes, dict):
        refund_notes = {}
    provider_order_id = payment.get("order_id")
    provider_payment_id = payment.get("id")
    order = None
    if event_type.startswith("refund."):
        provider_payment_id = refund.get("payment_id")
        if provider_payment_id:
            order = db.scalar(
                select(Order)
                .options(selectinload(Order.items))
                .where(Order.razorpay_payment_id == provider_payment_id)
                .with_for_update()
            )
        if order is None and refund_notes.get("order_number"):
            order = db.scalar(
                select(Order)
                .options(selectinload(Order.items))
                .where(Order.order_number == refund_notes["order_number"])
                .with_for_update()
            )
    elif provider_order_id:
        order = db.scalar(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.razorpay_order_id == provider_order_id)
            .with_for_update()
        )

    db.add(PaymentEvent(event_id=event_id, event_type=event_type, order_id=order.id if order else None))
    is_capture = event_type in {"payment.captured", "order.paid"}
    captured = payment.get("status") == "captured" or payment.get("captured") is True
    if order and is_capture and captured and provider_payment_id:
        amount_matches = int(payment.get("amount", -1)) == order.total_paise
        currency_matches = payment.get("currency") == "INR"
        if amount_matches and currency_matches:
            complete_order_payment(db, order, provider_payment_id)
        else:
            logger.error("Razorpay captured an amount that does not match NOVA order %s", order.order_number)
    refund_id = refund.get("id")
    persisted_refund_matches = bool(order and refund_id and order.razorpay_refund_id == refund_id)
    initial_refund_matches = bool(
        order
        and refund_id
        and not order.razorpay_refund_id
        and refund_notes.get("reason") == "payment_after_checkout_closed"
        and refund_notes.get("order_number") == order.order_number
        and str(refund_notes.get("full_refund_total_paise")) == str(order.total_paise)
        and int(refund.get("amount") or 0) > 0
        and provider_payment_id
        and (
            order.razorpay_payment_id == provider_payment_id
            or (order.razorpay_payment_id is None and order.status in {"cancelled", "expired"})
        )
    )
    is_late_checkout_refund = persisted_refund_matches or initial_refund_matches
    if order and event_type == "refund.created" and is_late_checkout_refund:
        order.razorpay_refund_id = refund_id
        order.status = "refund_pending"
        order.failure_reason = "Payment was captured after checkout closed. A full refund was started; wait for it to finish before trying again."
    elif order and event_type == "refund.processed" and refund.get("status") == "processed" and is_late_checkout_refund:
        order.razorpay_refund_id = refund_id
        if (
            persisted_refund_matches
            and order.status in {"refund_pending", "payment_review"}
        ) or initial_refund_matches:
            order.status = "refunded"
            order.failure_reason = "Payment was captured after checkout closed. The full refund was processed."
    elif (
        order
        and event_type == "refund.failed"
        and order.status in {"cancelled", "expired", "refund_pending", "payment_review"}
        and is_late_checkout_refund
    ):
        order.status = "payment_review"
        order.failure_reason = (
            "Payment was captured after checkout closed, but the refund failed. Please contact the store owner before trying again."
        )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"received": True, "duplicate": True}
    return {"received": True}
