import hashlib
import hmac

import razorpay

from app.core.config import settings


class PaymentConfigurationError(RuntimeError):
    pass


def get_razorpay_client() -> razorpay.Client:
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise PaymentConfigurationError("Configure Razorpay test mode keys to accept sandbox payments.")
    if not settings.razorpay_key_id.startswith("rzp_test_"):
        raise PaymentConfigurationError("NOVA checkout only accepts Razorpay test mode keys.")
    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


def create_provider_order(order_number: str, amount_paise: int, internal_order_id: int) -> dict:
    client = get_razorpay_client()
    return client.order.create(data={
        "amount": amount_paise,
        "currency": "INR",
        "receipt": order_number,
        "notes": {"nova_order_id": str(internal_order_id)},
    })


def refund_captured_payment(payment_id: str, amount_paise: int, order_number: str) -> dict:
    client = get_razorpay_client()
    payment = client.payment.fetch(payment_id)
    amount_refunded = int(payment.get("amount_refunded") or 0)
    amount_to_refund = max(0, amount_paise - amount_refunded)
    if amount_to_refund == 0:
        return {"id": None, "status": "processed"}
    if payment.get("status") not in {"captured", "refunded"}:
        raise RuntimeError("The captured payment is not refundable yet.")

    refund = client.payment.refund(payment_id, {
        "amount": amount_to_refund,
        "speed": "normal",
        "receipt": f"{order_number}-late",
        "notes": {
            "reason": "payment_after_checkout_closed",
            "order_number": order_number,
            "full_refund_total_paise": str(amount_paise),
        },
    })
    if (
        not refund.get("id")
        or refund.get("payment_id") != payment_id
        or int(refund.get("amount", -1)) != amount_to_refund
        or refund.get("status") not in {"pending", "processed"}
    ):
        raise RuntimeError("Razorpay did not confirm the full late-payment refund.")
    return refund


def verify_checkout_signature(order_id: str, payment_id: str, signature: str) -> bool:
    if not settings.razorpay_key_secret:
        return False
    payload = f"{order_id}|{payment_id}".encode("utf-8")
    expected = hmac.new(settings.razorpay_key_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    secret = settings.razorpay_webhook_secret
    if not secret:
        return False
    expected = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
