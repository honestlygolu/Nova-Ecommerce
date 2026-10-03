from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("stock >= 0", name="stock_nonnegative"),
        CheckConstraint("reserved_stock >= 0", name="reserved_nonnegative"),
        CheckConstraint("reserved_stock <= stock", name="reserved_within_stock"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sku: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(180), index=True)
    category: Mapped[str] = mapped_column(String(80), index=True)
    description: Mapped[str] = mapped_column(Text)
    price_paise: Mapped[int] = mapped_column(Integer)
    original_price_paise: Mapped[int] = mapped_column(Integer)
    discount: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[float] = mapped_column(Float, default=0)
    image_url: Mapped[str] = mapped_column(Text)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    reserved_stock: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan", lazy="selectin")

    @property
    def available_stock(self) -> int:
        return max(0, self.stock - self.reserved_stock)

    @property
    def sizes(self) -> list[dict[str, int | str]]:
        order = {size: index for index, size in enumerate(("XS", "S", "M", "L", "XL"))}
        return [
            {"size": variant.size, "stock": variant.available_stock}
            for variant in sorted(self.variants, key=lambda variant: order.get(variant.size, 99))
        ]
