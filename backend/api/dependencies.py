from typing import Annotated

from fastapi import Depends, Header
from sqlmodel import Session

from ..domain.models import UserContext
from ..db.session import get_session

SessionDep = Annotated[Session, Depends(get_session)]


def get_current_user_context(
    x_nexus_user: str | None = Header(default=None),
    x_nexus_role: str | None = Header(default=None),
) -> UserContext:
    return UserContext(
        user_id=x_nexus_user or "default-user",
        role=x_nexus_role or "member",
    )


UserDep = Annotated[UserContext, Depends(get_current_user_context)]
