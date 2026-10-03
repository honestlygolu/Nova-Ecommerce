from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.product import Product
from app.models.product_variant import ProductVariant

SIZES = ("XS", "S", "M", "L", "XL")
PRODUCTS = [
    {
        "id": 1,
        "sku": "NOVA-TOP-001",
        "name": "Relaxed Cotton Tee",
        "category": "Tops",
        "description": "A relaxed cotton tee with an easy shape for everyday layering.",
        "price_paise": 129_000,
        "original_price_paise": 129_000,
        "discount": 0,
        "rating": 0,
        "image_url": "/images/apparel/relaxed-cotton-tee.jpg",
        "stock": 10,
    },
    {
        "id": 2,
        "sku": "NOVA-TOP-002",
        "name": "Everyday Oxford Shirt",
        "category": "Tops",
        "description": "A clean button-front shirt with a relaxed shape for daily wear.",
        "price_paise": 249_000,
        "original_price_paise": 249_000,
        "discount": 0,
        "rating": 0,
        "image_url": "/images/apparel/everyday-oxford-shirt.jpg",
        "stock": 10,
    },
    {
        "id": 3,
        "sku": "NOVA-LAY-001",
        "name": "Midweight Pullover Hoodie",
        "category": "Layers",
        "description": "A midweight pullover with an easy fit and room to layer.",
        "price_paise": 329_000,
        "original_price_paise": 329_000,
        "discount": 0,
        "rating": 0,
        "image_url": "/images/apparel/midweight-pullover-hoodie.jpg",
        "stock": 10,
    },
    {
        "id": 4,
        "sku": "NOVA-BOT-001",
        "name": "Straight-Leg Trouser",
        "category": "Bottoms",
        "description": "A straight-leg shape with a comfortable everyday fit.",
        "price_paise": 299_000,
        "original_price_paise": 299_000,
        "discount": 0,
        "rating": 0,
        "image_url": "/images/apparel/straight-leg-trouser.jpg",
        "stock": 10,
    },
]


def seed_products() -> None:
    with SessionLocal.begin() as db:
        for values in PRODUCTS:
            product = db.scalar(select(Product).where(Product.id == values["id"]))
            if product is None:
                product = Product(**values)
                db.add(product)
                db.flush()
            else:
                for key, value in values.items():
                    if key not in {"id", "stock", "reserved_stock"}:
                        setattr(product, key, value)
                product.is_active = True

            existing_sizes = set(db.scalars(
                select(ProductVariant.size).where(ProductVariant.product_id == product.id)
            ).all())
            for size in SIZES:
                if size not in existing_sizes:
                    db.add(ProductVariant(product_id=product.id, size=size, stock=2, reserved_stock=0))


if __name__ == "__main__":
    seed_products()
