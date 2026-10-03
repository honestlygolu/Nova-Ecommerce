from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.routes.auth import CsrfProtected
from app.core.security import CurrentUser
from app.db.session import get_db
from app.models.cart_item import CartItem
from app.models.product import Product
from app.models.user import User
from app.schemas.cart import CartAddRequest, CartMergeRequest, CartProductRead, CartQuantityRequest, CartRead
from app.services.orders import expire_pending_orders

router = APIRouter(prefix="/cart", tags=["cart"])
DbSession = Annotated[Session, Depends(get_db)]


def cart_response(db: Session, user_id: int, warnings: list[str] | None = None) -> CartRead:
    rows = db.scalars(
        select(CartItem)
        .options(joinedload(CartItem.product))
        .where(CartItem.user_id == user_id)
        .order_by(CartItem.created_at, CartItem.id)
    ).all()
    items = [
        CartProductRead.model_validate({
            **row.product.__dict__,
            "image": row.product.image_url,
            "available_stock": next((variant.available_stock for variant in row.product.variants if variant.size == row.size), 0),
            "pricePaise": row.product.price_paise,
            "originalPricePaise": row.product.original_price_paise,
            "quantity": row.quantity,
            "size": row.size,
        })
        for row in rows
        if row.product is not None and row.product.is_active
    ]
    return CartRead(items=items, warnings=warnings or [])


@router.get("", response_model=CartRead)
def get_cart(db: DbSession, user: CurrentUser):
    expire_pending_orders(db)
    return cart_response(db, user.id)


@router.post("/items", response_model=CartRead)
def add_cart_item(data: CartAddRequest, db: DbSession, user: CurrentUser, _: CsrfProtected):
    item = db.scalar(
        select(CartItem).where(CartItem.user_id == user.id, CartItem.product_id == data.product_id, CartItem.size == data.size).with_for_update()
    )
    product = db.scalar(
        select(Product).where(Product.id == data.product_id, Product.is_active.is_(True)).with_for_update()
    )
    if product is None:
        raise HTTPException(status_code=404, detail="This product is no longer available.")
    if item is None:
        # Another add may have created the row while this request waited for the product lock.
        item = db.scalar(
            select(CartItem).where(CartItem.user_id == user.id, CartItem.product_id == product.id, CartItem.size == data.size).with_for_update()
        )
    variant = next((variant for variant in product.variants if variant.size == data.size), None)
    if variant is None or variant.available_stock <= 0:
        raise HTTPException(status_code=409, detail=f"Size {data.size} is sold out for {product.name}.")
    next_quantity = data.quantity + (item.quantity if item else 0)
    if next_quantity > variant.available_stock:
        raise HTTPException(status_code=409, detail=f"Only {variant.available_stock} size {data.size} of {product.name} are available.")
    if item:
        item.quantity = next_quantity
    else:
        db.add(CartItem(user_id=user.id, product_id=product.id, size=data.size, quantity=data.quantity))
    db.commit()
    return cart_response(db, user.id)


@router.put("/items/{product_id}", response_model=CartRead)
def set_cart_quantity(
    product_id: int,
    data: CartQuantityRequest,
    db: DbSession,
    user: CurrentUser,
    _: CsrfProtected,
    size: str = Query(default="M", pattern="^(XS|S|M|L|XL)$"),
):
    item = db.scalar(
        select(CartItem).where(CartItem.user_id == user.id, CartItem.product_id == product_id, CartItem.size == size).with_for_update()
    )
    product = db.scalar(select(Product).where(Product.id == product_id, Product.is_active.is_(True)).with_for_update())
    if product is None:
        raise HTTPException(status_code=404, detail="This product is no longer available.")
    variant = next((variant for variant in product.variants if variant.size == size), None)
    if variant is None or data.quantity > variant.available_stock:
        available = variant.available_stock if variant else 0
        raise HTTPException(status_code=409, detail=f"Only {available} size {size} of {product.name} are available.")
    if item is None:
        item = db.scalar(
            select(CartItem).where(CartItem.user_id == user.id, CartItem.product_id == product_id, CartItem.size == size).with_for_update()
        )
    if item is None:
        if data.quantity > 0:
            db.add(CartItem(user_id=user.id, product_id=product_id, size=size, quantity=data.quantity))
    else:
        item.quantity = data.quantity
    db.commit()
    return cart_response(db, user.id)


@router.delete("/items/{product_id}", response_model=CartRead)
def remove_cart_item(product_id: int, db: DbSession, user: CurrentUser, _: CsrfProtected, size: str = Query(default="M", pattern="^(XS|S|M|L|XL)$")):
    item = db.scalar(
        select(CartItem).where(CartItem.user_id == user.id, CartItem.product_id == product_id, CartItem.size == size)
    )
    if item is not None:
        db.delete(item)
        db.commit()
    return cart_response(db, user.id)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart(db: DbSession, user: CurrentUser, response: Response, _: CsrfProtected):
    db.query(CartItem).filter(CartItem.user_id == user.id).delete(synchronize_session=False)
    db.commit()
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post("/merge", response_model=CartRead)
def merge_guest_cart(data: CartMergeRequest, db: DbSession, user: CurrentUser, _: CsrfProtected):
    warnings: list[str] = []
    for guest_item in sorted(data.items, key=lambda item: (item.product_id, item.size)):
        item = db.scalar(
            select(CartItem).where(
                CartItem.user_id == user.id,
                CartItem.product_id == guest_item.product_id,
                CartItem.size == guest_item.size,
            ).with_for_update()
        )
        product = db.scalar(
            select(Product).where(
                Product.id == guest_item.product_id,
                Product.is_active.is_(True),
            ).with_for_update()
        )
        variant = next((variant for variant in product.variants if variant.size == guest_item.size), None) if product else None
        if product is None or variant is None or variant.available_stock <= 0:
            warnings.append("An unavailable item was removed from your saved cart.")
            continue
        if item is None:
            item = db.scalar(
                select(CartItem).where(
                    CartItem.user_id == user.id,
                    CartItem.product_id == product.id,
                    CartItem.size == guest_item.size,
                ).with_for_update()
            )
        requested = guest_item.quantity + (item.quantity if item else 0)
        allowed = min(requested, variant.available_stock)
        if requested > allowed:
            warnings.append(f"Your {product.name} size {guest_item.size} quantity was adjusted to current stock.")
        if item:
            item.quantity = allowed
        else:
            db.add(CartItem(user_id=user.id, product_id=product.id, size=guest_item.size, quantity=allowed))
        db.flush()
    db.commit()
    return cart_response(db, user.id, warnings)
