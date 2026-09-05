from typing import Optional, TYPE_CHECKING
import uuid
from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from src.models.learner import Learner


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """System user model with institutional RBAC roles."""
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
        doc="Unique user email address",
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Bcrypt hashed password",
    )
    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        doc="Full name of user",
    )
    role: Mapped[str] = mapped_column(
        String(50),
        default="EVALUATOR",
        nullable=False,
        index=True,
        doc="Role: MSDE_OFFICER | STATE_ADMIN | TRAINING_PROVIDER | EMPLOYER | EVALUATOR | SYSTEM_ADMIN | LEARNER",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Whether user account is active",
    )
    is_superuser: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Superuser administrative access flag",
    )

    # Relationships
    learner: Mapped[Optional["Learner"]] = relationship(
        "Learner",
        back_populates="user",
        uselist=False,
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
