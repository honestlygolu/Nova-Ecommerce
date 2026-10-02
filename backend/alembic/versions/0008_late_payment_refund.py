"""Track refunds initiated for payments captured after checkout closure.

Revision ID: 0008_late_payment_refund
Revises: 0007_checkout_recovery
"""
from alembic import op
import sqlalchemy as sa

revision = "0008_late_payment_refund"
down_revision = "0007_checkout_recovery"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("razorpay_refund_id", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "razorpay_refund_id")
