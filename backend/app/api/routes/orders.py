from datetime import datetime, timedelta, timezone
import hashlib
import json
from typing import Annotated
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.routes.auth import CsrfProtected
from app.core.config import settings
from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.cart_item import CartItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.user import User
from app.schemas.order import (
    CreateOrderRequest,
    OrderCreatedRead,
    OrderRead,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)
from app.services.orders import (
    ORDER_TTL,
    complete_order_payment,
    expire_pending_orders,
    new_order_number,
    order_checkout_dict,
    order_to_dict,
    release_reservations,
)
from app.services.razorpay import (
    PaymentConfigurationError,
    create_provider_order,
    get_razorpay_client,
    verify_checkout_signature,
)
from app.services.rate_limits import enforce_auth_rate_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orders", tags=["orders"])
DbSession = Annotated[Session, Depends(get_db)]


def load_user_order(db: Session, order_id: int, user_id: int) -> Order | None:
    return db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.user_id == user_id)
    )


@router.post("", response_model=OrderCreatedRead, status_code=status.HTTP_201_CREATED)
def create_order(
    data: CreateOrderRequest,
    db: DbSession,
    user: CurrentUser,
    request: Request,
    _: CsrfProtected,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key", min_length=16, max_length=100)],
):
    try:
        get_razorpay_client()
    except PaymentConfigurationError as error:
        raise HTTPException(status_code=503, detail=str(error)) from None

    enforce_auth_rate_limit(
        db, request, scope="checkout", identity=str(user.id), identity_limit=10, ip_limit=40
    )
    expire_pending_orders(db)
    # Serialize account checkout creation so separate tabs cannot open two
    # payable orders against the same cart at the same time.
    db.scalar(select(User.id).where(User.id == user.id).with_for_update())
    now = datetime.now(timezone.utc)
    active_order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(
            Order.user_id == user.id,
            Order.status == "pending_payment",
            Order.expires_at > now,
        )
        .order_by(Order.created_at.desc(), Order.id.desc())
        .with_for_update()
    )

    idempotency_digest = hashlib.sha256(f"{user.id}:{idempotency_key}".encode("utf-8")).hexdigest()
    repeated_order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.user_id == user.id, Order.idempotency_key == idempotency_digest)
        .with_for_update()
    )

    cart_items = db.scalars(
        select(CartItem)
        .where(CartItem.user_id == user.id)
        .order_by(CartItem.product_id)
        .with_for_update()
    ).all()
    if not cart_items:
        raise HTTPException(status_code=409, detail="Your shopping bag is empty.")

    current_products: list[tuple[CartItem, Product]] = []
    total_paise = 0
    for cart_item in cart_items:
        product = db.scalar(
            select(Product)
            .where(Product.id == cart_item.product_id, Product.is_active.is_(True))
            .with_for_update()
        )
        if product is None:
            raise HTTPException(status_code=409, detail="A product in your bag is no longer available.")
        current_products.append((cart_item, product))
        total_paise += product.price_paise * cart_item.quantity

    address = data.shipping_address
    fingerprint_payload = {
        "shippingAddress": address.model_dump(mode="json", by_alias=True),
        "items": [
            {
                "productId": product.id,
                "quantity": cart_item.quantity,
                "unitPricePaise": product.price_paise,
            }
            for cart_item, product in current_products
        ],
    }
    request_fingerprint = hashlib.sha256(
        json.dumps(fingerprint_payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()

    if repeated_order is not None:
        if repeated_order.request_fingerprint != request_fingerprint:
            raise HTTPException(
                status_code=409,
                detail="Checkout details changed. Start a new checkout attempt.",
            )
        if repeated_order.status == "pending_payment" and repeated_order.razorpay_order_id:
            return order_checkout_dict(
                repeated_order,
                repeated_order.razorpay_order_id,
                repeated_order.razorpay_key_id or settings.razorpay_key_id,
            )
        if repeated_order.status == "pending_payment":
            raise HTTPException(status_code=409, detail="Checkout is still being prepared. Please try again in a moment.")
        raise HTTPException(status_code=409, detail="This checkout attempt is already closed. Start checkout again.")

    if active_order is not None:
        raise HTTPException(
            status_code=409,
            detail="Another checkout is already open for your account. Return to checkout to finish or cancel it.",
        )

    for cart_item, product in current_products:
        if cart_item.quantity > product.available_stock:
            raise HTTPException(status_code=409, detail=f"Only {product.available_stock} of {product.name} are available. Please update your bag.")

    order = Order(
        order_number=new_order_number(),
        user_id=user.id,
        total_paise=total_paise,
        currency="INR",
        status="pending_payment",
        idempotency_key=idempotency_digest,
        request_fingerprint=request_fingerprint,
        shipping_name=address.name,
        shipping_phone=address.phone,
        shipping_address_line1=address.address_line1,
        shipping_address_line2=address.address_line2,
        shipping_city=address.city,
        shipping_state=address.state,
        shipping_postal_code=address.postal_code,
        shipping_country=address.country,
        expires_at=now + ORDER_TTL,
    )
    db.add(order)
    for cart_item, product in current_products:
        product.reserved_stock += cart_item.quantity
        order.items.append(OrderItem(
            product_id=product.id,
            sku=product.sku,
            name=product.name,
            image=product.image_url,
            quantity=cart_item.quantity,
            unit_price_paise=product.price_paise,
            line_total_paise=product.price_paise * cart_item.quantity,
        ))
    db.commit()
    db.refresh(order)

    try:
        provider_order = create_provider_order(order.order_number, order.total_paise, order.id)
        provider_order_id = provider_order.get("id")
        if (
            not provider_order_id
            or int(provider_order.get("amount", -1)) != order.total_paise
            or provider_order.get("currency") != "INR"
        ):
            raise RuntimeError("Razorpay returned an unexpected order.")
    except Exception:
        logger.exception("Could not create a Razorpay order for NOVA order %s", order.order_number)
        order = db.scalar(select(Order).options(selectinload(Order.items)).where(Order.id == order.id))
        release_reservations(db, order)
        order.status = "payment_failed"
        order.failure_reason = "Sandbox checkout could not be started."
        db.commit()
        raise HTTPException(status_code=502, detail="Sandbox checkout couldn't be started. No payment was taken.") from None

    order.razorpay_order_id = provider_order_id
    order.razorpay_key_id = settings.razorpay_key_id
    db.commit()
    return order_checkout_dict(order, provider_order_id, order.razorpay_key_id)


@router.post("/{order_id}/verify", response_model=VerifyPaymentResponse)
def verify_payment(
    order_id: int,
    data: VerifyPaymentRequest,
    db: DbSession,
    user: CurrentUser,
    _: CsrfProtected,
):
    order = load_user_order(db, order_id, user.id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")
    if data.razorpay_order_id != order.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Payment does not match this order.")
    if not verify_checkout_signature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed.")
    if order.status == "paid":
        return VerifyPaymentResponse(payment_status="paid", order=OrderRead.model_validate(order_to_dict(order)))

    try:
        payment = get_razorpay_client().payment.fetch(data.razorpay_payment_id)
    except Exception:
        logger.exception("Could not fetch Razorpay payment for NOVA order %s", order.order_number)
        raise HTTPException(status_code=502, detail="Payment status is still being confirmed. Check your order history shortly.") from None

    if (
        payment.get("order_id") != order.razorpay_order_id
        or int(payment.get("amount", -1)) != order.total_paise
        or payment.get("currency") != "INR"
    ):
        raise HTTPException(status_code=400, detail="Payment details do not match this order.")

    provider_status = payment.get("status", "processing")
    if provider_status == "captured":
        order = db.scalar(
            select(Order)
            .options(selectinload(Order.items))
            .where(Order.id == order.id)
            .with_for_update()
        )
        complete_order_payment(db, order, data.razorpay_payment_id)
        db.commit()
        payment_status = order.status
    else:
        payment_status = "processing"

    return VerifyPaymentResponse(
        payment_status=payment_status,
        order=OrderRead.model_validate(order_to_dict(order)),
    )


@router.post("/{order_id}/cancel", response_model=OrderRead)
def cancel_order(order_id: int, db: DbSession, user: CurrentUser, _: CsrfProtected):
    order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id, Order.user_id == user.id)
        .with_for_update()
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")
    if order.status == "pending_payment":
        release_reservations(db, order)
        order.status = "cancelled"
        order.failure_reason = "Checkout was cancelled."
        db.commit()
    return OrderRead.model_validate(order_to_dict(order))


@router.get("", response_model=list[OrderRead])
def list_orders(
    db: DbSession,
    user: CurrentUser,
    limit: int = Query(default=20, ge=1, le=50),
):
    expire_pending_orders(db)
    orders = db.scalars(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.user_id == user.id)
        .order_by(Order.created_at.desc(), Order.id.desc())
        .limit(limit)
    ).all()
    return [order_to_dict(order) for order in orders]


@router.get("/active", response_model=OrderCreatedRead | None)
def get_active_checkout(db: DbSession, user: CurrentUser):
    expire_pending_orders(db)
    order = db.scalar(
        select(Order)
        .options(selectinload(Order.items))
        .where(
            Order.user_id == user.id,
            Order.status == "pending_payment",
            Order.expires_at > datetime.now(timezone.utc),
            Order.razorpay_order_id.is_not(None),
        )
        .order_by(Order.created_at.desc(), Order.id.desc())
    )
    if order is None:
        return None
    return order_checkout_dict(
        order,
        order.razorpay_order_id,
        order.razorpay_key_id or settings.razorpay_key_id,
    )


@router.get("/{order_id}", response_model=OrderRead)
def get_order(order_id: int, db: DbSession, user: CurrentUser):
    expire_pending_orders(db)
    order = load_user_order(db, order_id, user.id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order_to_dict(order)
