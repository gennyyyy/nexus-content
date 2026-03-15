from sqlalchemy import inspect, text
from sqlmodel import SQLModel, Session, create_engine

from ..settings import get_settings

settings = get_settings()
database_url = settings.database_url

connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
engine = create_engine(database_url, echo=False, connect_args=connect_args)

CONTEXT_ENTRY_MIGRATIONS = {
    "entry_type": "ALTER TABLE contextentry ADD COLUMN entry_type VARCHAR DEFAULT 'note'",
    "summary": "ALTER TABLE contextentry ADD COLUMN summary VARCHAR",
    "what_changed": "ALTER TABLE contextentry ADD COLUMN what_changed VARCHAR",
    "files_touched": "ALTER TABLE contextentry ADD COLUMN files_touched VARCHAR",
    "decisions": "ALTER TABLE contextentry ADD COLUMN decisions VARCHAR",
    "open_questions": "ALTER TABLE contextentry ADD COLUMN open_questions VARCHAR",
    "next_step": "ALTER TABLE contextentry ADD COLUMN next_step VARCHAR",
    "actor": "ALTER TABLE contextentry ADD COLUMN actor VARCHAR DEFAULT 'System'",
    "source": "ALTER TABLE contextentry ADD COLUMN source VARCHAR DEFAULT 'system'",
}

PROJECT_MIGRATIONS = {
    "owner_user_id": "ALTER TABLE project ADD COLUMN owner_user_id VARCHAR DEFAULT 'default-user'",
    "archived": "ALTER TABLE project ADD COLUMN archived BOOLEAN DEFAULT 0",
}

TASK_MIGRATIONS = {
    "priority": "ALTER TABLE task ADD COLUMN priority VARCHAR DEFAULT 'medium'",
    "labels": "ALTER TABLE task ADD COLUMN labels VARCHAR",
    "project_id": "ALTER TABLE task ADD COLUMN project_id VARCHAR",
    "archived": "ALTER TABLE task ADD COLUMN archived BOOLEAN DEFAULT 0",
}

ACTIVITY_EVENT_MIGRATIONS = {
    "project_id": "ALTER TABLE activityevent ADD COLUMN project_id VARCHAR REFERENCES project(id)",
}

TASK_DEPENDENCY_MIGRATIONS = {
    "source_handle": "ALTER TABLE taskdependency ADD COLUMN source_handle VARCHAR",
    "target_handle": "ALTER TABLE taskdependency ADD COLUMN target_handle VARCHAR",
}

PROJECT_MEMBERSHIP_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS projectmembership (
    id INTEGER PRIMARY KEY,
    project_id VARCHAR REFERENCES project(id),
    user_id VARCHAR NOT NULL,
    role VARCHAR DEFAULT 'member',
    created_at DATETIME
)
"""


def run_dev_migrations():
    inspector = inspect(engine)
    if "contextentry" not in inspector.get_table_names():
        context_columns = set()
    else:
        context_columns = {
            column["name"] for column in inspector.get_columns("contextentry")
        }

    if "task" not in inspector.get_table_names():
        task_columns = set()
    else:
        task_columns = {column["name"] for column in inspector.get_columns("task")}

    if "project" not in inspector.get_table_names():
        project_columns = set()
    else:
        project_columns = {
            column["name"] for column in inspector.get_columns("project")
        }

    if "activityevent" not in inspector.get_table_names():
        activity_columns = set()
    else:
        activity_columns = {
            column["name"] for column in inspector.get_columns("activityevent")
        }

    if "taskdependency" not in inspector.get_table_names():
        task_dependency_columns = set()
    else:
        task_dependency_columns = {
            column["name"] for column in inspector.get_columns("taskdependency")
        }

    with engine.begin() as connection:
        for column_name, statement in PROJECT_MIGRATIONS.items():
            if column_name not in project_columns:
                connection.execute(text(statement))
        for column_name, statement in CONTEXT_ENTRY_MIGRATIONS.items():
            if column_name not in context_columns:
                connection.execute(text(statement))
        for column_name, statement in TASK_MIGRATIONS.items():
            if column_name not in task_columns:
                connection.execute(text(statement))
        for column_name, statement in ACTIVITY_EVENT_MIGRATIONS.items():
            if column_name not in activity_columns:
                connection.execute(text(statement))
        for column_name, statement in TASK_DEPENDENCY_MIGRATIONS.items():
            if column_name not in task_dependency_columns:
                connection.execute(text(statement))
        if "projectmembership" not in inspector.get_table_names():
            connection.execute(text(PROJECT_MEMBERSHIP_CREATE_TABLE))


def create_db_and_tables():
    from ..domain.models import (
        ActivityEvent,
        ContextEntry,
        Project,
        Task,
        TaskDependency,
    )  # noqa: F401

    SQLModel.metadata.create_all(engine)
    run_dev_migrations()


def get_database_url() -> str:
    return database_url


def get_engine():
    return engine


def set_engine(next_engine, next_database_url: str | None = None):
    global engine, database_url
    engine = next_engine
    if next_database_url is not None:
        database_url = next_database_url


def get_session():
    with Session(get_engine()) as session:
        yield session
