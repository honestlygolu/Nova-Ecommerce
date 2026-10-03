"""Add per-size product inventory.

Revision ID: 0009_product_sizes
Revises: 0008_late_payment_refund
"""
from alembic import op
import sqlalchemy as sa


revision = "0009_product_sizes"
down_revision = "0008_late_payment_refund"
branch_labels = None
depends_on = None

SIZES = ("XS", "S", "M", "L", "XL")


def upgrade() -> None:
    bind = op.get_bind()
    orders = sa.table(
        "orders",
        sa.column("status", sa.String()),
        sa.column("failure_reason", sa.Text()),
    )
    products = sa.table(
        "products",
        sa.column("id", sa.Integer()),
        sa.column("stock", sa.Integer()),
        sa.column("reserved_stock", sa.Integer()),
    )

    # Pending checkouts contain electronics snapshots and aggregate stock holds.
    bind.execute(
        sa.update(orders)
        .where(orders.c.status == "pending_payment")
        .values(status="expired", failure_reason="The NOVA catalog changed. Please start a new checkout.")
    )
    bind.execute(sa.update(products).values(reserved_stock=0))

    op.create_table(
        "product_variants",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("size", sa.String(length=8), nullable=False),
        sa.Column("stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reserved_stock", sa.Integer(), nullable=False, server_default="0"),
        sa.CheckConstraint("stock >= 0", name="ck_product_variants_stock_nonnegative"),
        sa.CheckConstraint("reserved_stock >= 0", name="ck_product_variants_reserved_nonnegative"),
        sa.CheckConstraint("reserved_stock <= stock", name="ck_product_variants_reserved_within_stock"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "size", name="uq_product_variants_product_size"),
    )
    op.create_index("ix_product_variants_product_id", "product_variants", ["product_id"], unique=False)

    variants = sa.table(
        "product_variants",
        sa.column("product_id", sa.Integer()),
        sa.column("size", sa.String()),
        sa.column("stock", sa.Integer()),
        sa.column("reserved_stock", sa.Integer()),
    )
    for product_id, stock in bind.execute(sa.select(products.c.id, products.c.stock)).all():
        each, remainder = divmod(stock, len(SIZES))
        allocations = {size: each for size in SIZES}
        # Put any uneven remainder into the central sizes first.
        for size in ("M", "L", "S", "XL", "XS")[:remainder]:
            allocations[size] += 1
        bind.execute(
            sa.insert(variants),
            [
                {"product_id": product_id, "size": size, "stock": allocations[size], "reserved_stock": 0}
                for size in SIZES
            ],
        )

    op.add_column("cart_items", sa.Column("size", sa.String(length=8), nullable=True))
    op.drop_constraint("uq_cart_items_user_product", "cart_items", type_="unique")
    op.execute("UPDATE cart_items SET size = 'M' WHERE size IS NULL")
    op.alter_column("cart_items", "size", nullable=False)
    op.create_unique_constraint(
        "uq_cart_items_user_product_size", "cart_items", ["user_id", "product_id", "size"]
    )
    op.add_column("order_items", sa.Column("size", sa.String(length=8), nullable=True))


def downgrade() -> None:
    op.drop_column("order_items", "size")
    op.drop_constraint("uq_cart_items_user_product_size", "cart_items", type_="unique")
    op.drop_column("cart_items", "size")
    op.create_unique_constraint("uq_cart_items_user_product", "cart_items", ["user_id", "product_id"])
    op.drop_index("ix_product_variants_product_id", table_name="product_variants")
    op.drop_table("product_variants")
