"""Persist checkout request snapshots for safe payment recovery.

Revision ID: 0007_checkout_recovery
Revises: 0006_auth_rate_limits
"""
from alembic import op
import sqlalchemy as sa

revision = "0007_checkout_recovery"
down_revision = "0006_auth_rate_limits"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("request_fingerprint", sa.String(length=64), nullable=True))
    op.add_column("orders", sa.Column("razorpay_key_id", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "razorpay_key_id")
    op.drop_column("orders", "request_fingerprint")
