from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.product import Product

PRODUCTS = [
    {
        "id": 1,
        "sku": "NOVA-AUD-001",
        "name": "Nova Pro Headphones",
        "category": "Audio",
        "description": "Immersive over-ear sound, soft all-day cushions, and a clean wireless design built for focus and downtime.",
        "price_paise": 1_299_900,
        "original_price_paise": 1_599_900,
        "discount": 19,
        "rating": 4.8,
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
        "stock": 10,
    },
    {
        "id": 2,
        "sku": "NOVA-GAM-001",
        "name": "Nova Mechanical Keyboard",
        "category": "Gaming",
        "description": "A crisp mechanical feel, thoughtful compact layout, and durable construction for work or play.",
        "price_paise": 749_900,
        "original_price_paise": 899_900,
        "discount": 17,
        "rating": 4.7,
        "image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800",
        "stock": 10,
    },
    {
        "id": 3,
        "sku": "NOVA-GAM-002",
        "name": "Nova Wireless Mouse",
        "category": "Gaming",
        "description": "Lightweight wireless control with a precise sensor and a comfortable shape for long sessions.",
        "price_paise": 349_900,
        "original_price_paise": 449_900,
        "discount": 22,
        "rating": 4.6,
        "image_url": "https://images.unsplash.com/photo-1527814050087-3793815479db?w=800",
        "stock": 10,
    },
    {
        "id": 4,
        "sku": "NOVA-WEA-001",
        "name": "Nova Smart Watch",
        "category": "Wearables",
        "description": "A bright everyday display, useful wellness insights, and a refined profile that goes anywhere.",
        "price_paise": 999_900,
        "original_price_paise": 1_199_900,
        "discount": 17,
        "rating": 4.8,
        "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
        "stock": 10,
    },
]


def seed_products() -> None:
    with SessionLocal.begin() as db:
        for values in PRODUCTS:
            product = db.scalar(select(Product).where(Product.id == values["id"]))
            if product is None:
                db.add(Product(**values))
            else:
                for key, value in values.items():
                    if key not in {"id", "stock"}:
                        setattr(product, key, value)
                product.is_active = True


if __name__ == "__main__":
    seed_products()
