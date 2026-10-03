from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.schemas.product import to_camel


class ShippingAddress(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]
    phone: Annotated[str, StringConstraints(strip_whitespace=True, min_length=7, max_length=24)]
    address_line1: Annotated[str, StringConstraints(strip_whitespace=True, min_length=4, max_length=180)]
    address_line2: str | None = Field(default=None, max_length=180)
    city: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]
    state: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]
    postal_code: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=20)]
    country: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=80)] = "India"


class CreateOrderRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    shipping_address: ShippingAddress


class OrderItemRead(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: int
    sku: str
    name: str
    image: str
    quantity: int
    size: str | None = None
    unit_price_paise: int
    line_total_paise: int


class ShippingAddressRead(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str
    phone: str
    address_line1: str
    address_line2: str | None
    city: str
    state: str
    postal_code: str
    country: str


class OrderRead(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: int
    order_number: str
    total_paise: int
    currency: str
    status: str
    failure_reason: str | None = None
    razorpay_refund_id: str | None = None
    created_at: datetime
    paid_at: datetime | None
    items: list[OrderItemRead]
    shipping_address: ShippingAddressRead


class OrderCreatedRead(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: int
    order_number: str
    total_paise: int
    currency: str
    razorpay_order_id: str
    razorpay_key_id: str
    expires_at: datetime
    items: list[OrderItemRead]
    shipping_address: ShippingAddressRead


class VerifyPaymentRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    razorpay_order_id: Annotated[str, StringConstraints(min_length=8, max_length=64)]
    razorpay_payment_id: Annotated[str, StringConstraints(min_length=8, max_length=64)]
    razorpay_signature: Annotated[str, StringConstraints(min_length=32, max_length=128)]


class VerifyPaymentResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    payment_status: str
    order: OrderRead
