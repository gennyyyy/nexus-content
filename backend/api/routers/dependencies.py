from fastapi import APIRouter

from ...api.dependencies import SessionDep, UserDep
from ...domain.models import TaskDependency, TaskDependencyCreate
from ...services.dependencies import (
    create_dependency,
    delete_dependency,
    list_dependencies,
)

router = APIRouter(prefix="/api/dependencies", tags=["dependencies"])


@router.get("", response_model=list[TaskDependency])
def read_dependencies(
    session: SessionDep, user: UserDep, project_id: str | None = None
):
    return list_dependencies(session, project_id, user=user)


@router.post("", response_model=TaskDependency)
def create_dependency_endpoint(
    dependency: TaskDependencyCreate, session: SessionDep, user: UserDep
):
    return create_dependency(session, dependency, user=user)


@router.delete("/{dependency_id}")
def delete_dependency_endpoint(dependency_id: int, session: SessionDep, user: UserDep):
    delete_dependency(session, dependency_id, user=user)
    return {"ok": True}
