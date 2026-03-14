import re

from sqlmodel import Session, select

from ..domain.models import Project, ProjectCreate, Task
from .activity import record_activity, truncate
from .errors import ConflictError, NotFoundError, ValidationError

PROJECT_ID_PATTERN = re.compile(r"^[a-z0-9-]+$")


def list_projects(session: Session) -> list[Project]:
    project_records = session.exec(select(Project)).all()
    project_rows = [project for project in project_records]
    projects_by_id: dict[str, Project] = {
        project.id: project for project in project_rows
    }

    legacy_rows = session.exec(select(Task.project_id).distinct()).all()
    legacy_project_ids = [project_id for project_id in legacy_rows]
    for project_id in legacy_project_ids:
        if not project_id or project_id in projects_by_id:
            continue
        projects_by_id[project_id] = Project(
            id=project_id,
            name=project_id.replace("-", " ").title(),
            description="Imported from existing tasks",
        )

    return sorted(
        projects_by_id.values(), key=lambda project: project.created_at, reverse=True
    )


def create_project(
    session: Session,
    project: ProjectCreate,
    *,
    actor: str = "Web operator",
    source: str = "web",
) -> Project:
    if not PROJECT_ID_PATTERN.fullmatch(project.id):
        raise ValidationError(
            "Project ID must use lowercase letters, numbers, and hyphens only"
        )

    existing = session.get(Project, project.id)
    if existing:
        raise ConflictError("Project already exists")

    db_project = Project.model_validate(project)
    session.add(db_project)
    record_activity(
        session,
        event_type="project.created",
        entity_type="project",
        title=f'Created project "{db_project.name}"',
        summary=truncate(db_project.description or "Project initialized."),
        actor=actor,
        source=source,
        project_id=db_project.id,
    )
    session.commit()
    session.refresh(db_project)
    return db_project


def get_project(session: Session, project_id: str) -> Project:
    project = session.get(Project, project_id)
    if project:
        return project

    has_tasks = session.exec(
        select(Task.id).where(Task.project_id == project_id).limit(1)
    ).first()
    if not has_tasks:
        raise NotFoundError("Project not found")

    return Project(
        id=project_id,
        name=project_id.replace("-", " ").title(),
        description="Imported from existing tasks",
    )
