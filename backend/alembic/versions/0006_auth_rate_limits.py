"""Persist rolling limits for authentication and recovery endpoints.

Revision ID: 0006_auth_rate_limits
Revises: 0005_order_idempotency
"""
from alembic import op
import sqlalchemy as sa

revision = "0006_auth_rate_limits"
down_revision = "0005_order_idempotency"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "auth_rate_limits",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("key_hash", sa.String(length=64), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("blocked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_auth_rate_limits"),
        sa.UniqueConstraint("key_hash", name="uq_auth_rate_limits_key_hash"),
    )
    op.create_index("ix_auth_rate_limits_window_started_at", "auth_rate_limits", ["window_started_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_auth_rate_limits_window_started_at", table_name="auth_rate_limits")
    op.drop_table("auth_rate_limits")
