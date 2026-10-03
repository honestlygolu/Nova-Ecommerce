from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ProductVariant(Base):
    __tablename__ = "product_variants"
    __table_args__ = (
        UniqueConstraint("product_id", "size", name="uq_product_variants_product_size"),
        CheckConstraint("stock >= 0", name="ck_product_variants_stock_nonnegative"),
        CheckConstraint("reserved_stock >= 0", name="ck_product_variants_reserved_nonnegative"),
        CheckConstraint("reserved_stock <= stock", name="ck_product_variants_reserved_within_stock"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    size: Mapped[str] = mapped_column(String(8))
    stock: Mapped[int] = mapped_column(Integer, default=0)
    reserved_stock: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    product = relationship("Product", back_populates="variants")

    @property
    def available_stock(self) -> int:
        return max(0, self.stock - self.reserved_stock)
