"""Add transactional inventory reservations and checkout orders.

Revision ID: 0004_orders_payments
Revises: 0003_cart
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_orders_payments"
down_revision = "0003_cart"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("products", sa.Column("reserved_stock", sa.Integer(), server_default="0", nullable=False))
    op.create_check_constraint("ck_products_stock_nonnegative", "products", "stock >= 0")
    op.create_check_constraint("ck_products_reserved_nonnegative", "products", "reserved_stock >= 0")
    op.create_check_constraint("ck_products_reserved_within_stock", "products", "reserved_stock <= stock")

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("order_number", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("total_paise", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), server_default="INR", nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("razorpay_order_id", sa.String(length=64), nullable=True),
        sa.Column("razorpay_payment_id", sa.String(length=64), nullable=True),
        sa.Column("shipping_name", sa.String(length=100), nullable=False),
        sa.Column("shipping_phone", sa.String(length=24), nullable=False),
        sa.Column("shipping_address_line1", sa.String(length=180), nullable=False),
        sa.Column("shipping_address_line2", sa.String(length=180), nullable=True),
        sa.Column("shipping_city", sa.String(length=100), nullable=False),
        sa.Column("shipping_state", sa.String(length=100), nullable=False),
        sa.Column("shipping_postal_code", sa.String(length=20), nullable=False),
        sa.Column("shipping_country", sa.String(length=80), server_default="India", nullable=False),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_orders_user_id_users", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name="pk_orders"),
        sa.UniqueConstraint("order_number", name="uq_orders_order_number"),
        sa.UniqueConstraint("razorpay_order_id", name="uq_orders_razorpay_order_id"),
    )
    op.create_index("ix_orders_user_id", "orders", ["user_id"], unique=False)
    op.create_index("ix_orders_status", "orders", ["status"], unique=False)
    op.create_index("ix_orders_expires_at", "orders", ["expires_at"], unique=False)

    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=True),
        sa.Column("sku", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("image", sa.Text(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price_paise", sa.Integer(), nullable=False),
        sa.Column("line_total_paise", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], name="fk_order_items_order_id_orders", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], name="fk_order_items_product_id_products", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_order_items"),
        sa.CheckConstraint("quantity >= 1", name="ck_order_items_quantity_positive"),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"], unique=False)

    op.create_table(
        "payment_events",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("event_id", sa.String(length=128), nullable=False),
        sa.Column("event_type", sa.String(length=80), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], name="fk_payment_events_order_id_orders", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_payment_events"),
        sa.UniqueConstraint("event_id", name="uq_payment_events_event_id"),
    )
    op.create_index("ix_payment_events_order_id", "payment_events", ["order_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_payment_events_order_id", table_name="payment_events")
    op.drop_table("payment_events")
    op.drop_index("ix_order_items_order_id", table_name="order_items")
    op.drop_table("order_items")
    op.drop_index("ix_orders_expires_at", table_name="orders")
    op.drop_index("ix_orders_status", table_name="orders")
    op.drop_index("ix_orders_user_id", table_name="orders")
    op.drop_table("orders")
    op.drop_constraint("ck_products_reserved_within_stock", "products", type_="check")
    op.drop_constraint("ck_products_reserved_nonnegative", "products", type_="check")
    op.drop_constraint("ck_products_stock_nonnegative", "products", type_="check")
    op.drop_column("products", "reserved_stock")
