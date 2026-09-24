"""add_email_verification_fields_to_users

Revision ID: b3f81e9d4012
Revises: 66127262ef91
Create Date: 2026-09-24 23:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3f81e9d4012'
down_revision: Union[str, None] = '66127262ef91'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add email_verified column with server default 'false'
    op.add_column(
        'users',
        sa.Column('email_verified', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    )

    # 2. Add email_verification_token_hash column (nullable string)
    op.add_column(
        'users',
        sa.Column('email_verification_token_hash', sa.String(length=255), nullable=True),
    )
    op.create_index(
        op.f('ix_users_email_verification_token_hash'),
        'users',
        ['email_verification_token_hash'],
        unique=False,
    )

    # 3. Add email_verification_expires_at column (nullable datetime with timezone)
    op.add_column(
        'users',
        sa.Column('email_verification_expires_at', sa.DateTime(timezone=True), nullable=True),
    )

    # 4. Safe default migration strategy for existing users:
    # Existing users created prior to this feature must NOT be locked out.
    # Mark all currently existing users as verified.
    op.execute("UPDATE users SET email_verified = true WHERE email_verified = false")


def downgrade() -> None:
    op.drop_index(op.f('ix_users_email_verification_token_hash'), table_name='users')
    op.drop_column('users', 'email_verification_expires_at')
    op.drop_column('users', 'email_verification_token_hash')
    op.drop_column('users', 'email_verified')
