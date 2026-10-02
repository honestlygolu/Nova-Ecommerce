from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.product import Product
from app.schemas.product import ProductPage, ProductRead
from app.services.orders import expire_pending_orders

router = APIRouter(prefix="/products", tags=["products"])
DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=ProductPage)
def list_products(
    db: DbSession,
    q: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None, max_length=80),
    sort: Literal["featured", "price-low", "price-high", "rating"] = "featured",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=48),
):
    expire_pending_orders(db)
    statement = select(Product).where(Product.is_active.is_(True))
    count_statement = select(func.count(Product.id)).where(Product.is_active.is_(True))

    if q and q.strip():
        needle = f"%{q.strip()}%"
        search_filter = or_(
            Product.name.ilike(needle),
            Product.category.ilike(needle),
            Product.description.ilike(needle),
        )
        statement = statement.where(search_filter)
        count_statement = count_statement.where(search_filter)

    if category and category.lower() != "all":
        statement = statement.where(func.lower(Product.category) == category.lower())
        count_statement = count_statement.where(func.lower(Product.category) == category.lower())

    sort_columns = {
        "featured": Product.id,
        "price-low": Product.price_paise,
        "price-high": Product.price_paise.desc(),
        "rating": Product.rating.desc(),
    }
    statement = statement.order_by(sort_columns[sort], Product.id)

    total = db.scalar(count_statement) or 0
    items = db.scalars(
        statement.offset((page - 1) * page_size).limit(page_size)
    ).all()
    return ProductPage(items=items, total=total, page=page, page_size=page_size)


@router.get("/categories", response_model=list[str])
def list_categories(db: DbSession):
    return db.scalars(
        select(Product.category)
        .where(Product.is_active.is_(True))
        .distinct()
        .order_by(Product.category)
    ).all()


@router.get("/{product_id}", response_model=ProductRead)
def get_product(product_id: int, db: DbSession):
    expire_pending_orders(db)
    product = db.scalar(
        select(Product).where(Product.id == product_id, Product.is_active.is_(True))
    )
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
