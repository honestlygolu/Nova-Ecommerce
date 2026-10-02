"""Prevent duplicate checkout orders when clients retry.

Revision ID: 0005_order_idempotency
Revises: 0004_orders_payments
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_order_idempotency"
down_revision = "0004_orders_payments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("idempotency_key", sa.String(length=64), nullable=True))
    op.create_unique_constraint("uq_orders_idempotency_key", "orders", ["idempotency_key"])


def downgrade() -> None:
    op.drop_constraint("uq_orders_idempotency_key", "orders", type_="unique")
    op.drop_column("orders", "idempotency_key")
