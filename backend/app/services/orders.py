from datetime import datetime, timedelta, timezone
import logging
import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.cart_item import CartItem
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.services.razorpay import refund_captured_payment

ORDER_TTL = timedelta(minutes=30)
logger = logging.getLogger(__name__)


def new_order_number() -> str:
    return f"NOVA-{secrets.token_hex(5).upper()}"


def release_reservations(db: Session, order: Order) -> None:
    for item in order.items:
        if item.product_id is None:
            continue
        product = db.scalar(select(Product).where(Product.id == item.product_id).with_for_update())
        if product is not None:
            product.reserved_stock = max(0, product.reserved_stock - item.quantity)


def expire_pending_orders(db: Session) -> int:
    now = datetime.now(timezone.utc)
    expired = db.scalars(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.status == "pending_payment", Order.expires_at <= now)
        .with_for_update()
    ).all()
    for order in expired:
        release_reservations(db, order)
        order.status = "expired"
        order.failure_reason = "Checkout session expired."
    if expired:
        db.commit()
    return len(expired)


def consume_ordered_cart_items(db: Session, order: Order) -> None:
    for ordered_item in order.items:
        if ordered_item.product_id is None:
            continue
        cart_item = db.scalar(
            select(CartItem).where(
                CartItem.user_id == order.user_id,
                CartItem.product_id == ordered_item.product_id,
            ).with_for_update()
        )
        if cart_item is None:
            continue
        remaining = cart_item.quantity - ordered_item.quantity
        if remaining > 0:
            cart_item.quantity = remaining
        else:
            db.delete(cart_item)


def complete_order_payment(db: Session, order: Order, payment_id: str) -> Order:
    if order.status == "paid":
        return order
    if order.status in {"payment_review", "refund_pending", "refunded"}:
        return order

    if order.status in {"cancelled", "expired"}:
        order.razorpay_payment_id = payment_id
        order.paid_at = datetime.now(timezone.utc)
        try:
            refund = refund_captured_payment(payment_id, order.total_paise, order.order_number)
            order.razorpay_refund_id = refund.get("id")
            if refund.get("status") == "processed":
                order.status = "refunded"
                order.failure_reason = "Payment was captured after checkout closed. A full refund was processed."
            else:
                order.status = "refund_pending"
                order.failure_reason = "Payment was captured after checkout closed. A full refund was started; wait for it to finish before trying again."
        except Exception:
            logger.exception("Could not refund late payment for NOVA order %s", order.order_number)
            order.status = "payment_review"
            order.failure_reason = (
                "Payment was captured after checkout closed, but the refund could not be confirmed. Please contact the store owner before trying again."
            )
        return order

    was_reserved = order.status == "pending_payment"
    products: list[tuple[OrderItem, Product]] = []
    fulfillment_issue = False
    for item in order.items:
        if item.product_id is None:
            fulfillment_issue = True
            continue
        product = db.scalar(select(Product).where(Product.id == item.product_id).with_for_update())
        if product is None:
            fulfillment_issue = True
            continue
        has_reservation = product.reserved_stock >= item.quantity
        enough_inventory = (
            has_reservation and product.stock >= item.quantity
            if was_reserved
            else product.available_stock >= item.quantity
        )
        if not enough_inventory:
            fulfillment_issue = True
        products.append((item, product))

    if not fulfillment_issue:
        for item, product in products:
            if was_reserved:
                product.reserved_stock -= item.quantity
            product.stock -= item.quantity
    elif was_reserved:
        for item, product in products:
            if product.reserved_stock >= item.quantity:
                product.reserved_stock -= item.quantity

    order.razorpay_payment_id = payment_id
    order.paid_at = datetime.now(timezone.utc)
    if fulfillment_issue:
        order.status = "payment_review"
        order.failure_reason = "Payment was captured; inventory needs manual review."
    else:
        order.status = "paid"
        order.failure_reason = None
    consume_ordered_cart_items(db, order)
    return order


def order_to_dict(order: Order) -> dict:
    return {
        "id": order.id,
        "orderNumber": order.order_number,
        "totalPaise": order.total_paise,
        "currency": order.currency,
        "status": order.status,
        "failureReason": order.failure_reason,
        "razorpayRefundId": order.razorpay_refund_id,
        "createdAt": order.created_at,
        "paidAt": order.paid_at,
        "items": [
            {
                "id": item.id,
                "sku": item.sku,
                "name": item.name,
                "image": item.image,
                "quantity": item.quantity,
                "unitPricePaise": item.unit_price_paise,
                "lineTotalPaise": item.line_total_paise,
            }
            for item in order.items
        ],
        "shippingAddress": {
            "name": order.shipping_name,
            "phone": order.shipping_phone,
            "addressLine1": order.shipping_address_line1,
            "addressLine2": order.shipping_address_line2,
            "city": order.shipping_city,
            "state": order.shipping_state,
            "postalCode": order.shipping_postal_code,
            "country": order.shipping_country,
        },
    }


def order_checkout_dict(order: Order, provider_order_id: str, key_id: str) -> dict:
    checkout = order_to_dict(order)
    checkout.update({
        "id": order.id,
        "orderNumber": order.order_number,
        "totalPaise": order.total_paise,
        "currency": order.currency,
        "razorpayOrderId": provider_order_id,
        "razorpayKeyId": key_id,
        "expiresAt": order.expires_at,
    })
    return checkout
