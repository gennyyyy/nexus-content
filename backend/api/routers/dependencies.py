from fastapi import APIRouter

from ...api.dependencies import SessionDep
from ...domain.models import TaskDependency, TaskDependencyCreate
from ...services.dependencies import (
    create_dependency,
    delete_dependency,
    list_dependencies,
)

router = APIRouter(prefix="/api/dependencies", tags=["dependencies"])


@router.get("", response_model=list[TaskDependency])
def read_dependencies(session: SessionDep):
    return list_dependencies(session)


@router.post("", response_model=TaskDependency)
def create_dependency_endpoint(dependency: TaskDependencyCreate, session: SessionDep):
    return create_dependency(session, dependency)


@router.delete("/{dependency_id}")
def delete_dependency_endpoint(dependency_id: int, session: SessionDep):
    delete_dependency(session, dependency_id)
    return {"ok": True}
