from sqlalchemy import inspect, text
from sqlmodel import SQLModel, create_engine, Session

sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, echo=False, connect_args=connect_args)

CONTEXT_ENTRY_MIGRATIONS = {
    "entry_type": "ALTER TABLE contextentry ADD COLUMN entry_type VARCHAR DEFAULT 'note'",
    "summary": "ALTER TABLE contextentry ADD COLUMN summary VARCHAR",
    "what_changed": "ALTER TABLE contextentry ADD COLUMN what_changed VARCHAR",
    "files_touched": "ALTER TABLE contextentry ADD COLUMN files_touched VARCHAR",
    "decisions": "ALTER TABLE contextentry ADD COLUMN decisions VARCHAR",
    "open_questions": "ALTER TABLE contextentry ADD COLUMN open_questions VARCHAR",
    "next_step": "ALTER TABLE contextentry ADD COLUMN next_step VARCHAR",
}

TASK_MIGRATIONS = {
    "priority": "ALTER TABLE task ADD COLUMN priority VARCHAR DEFAULT 'medium'",
    "labels": "ALTER TABLE task ADD COLUMN labels VARCHAR",
    "project_id": "ALTER TABLE task ADD COLUMN project_id VARCHAR",
}

ACTIVITY_EVENT_MIGRATIONS = {
    "project_id": "ALTER TABLE activityevent ADD COLUMN project_id VARCHAR REFERENCES project(id)",
}

TASK_DEPENDENCY_MIGRATIONS = {
    "source_handle": "ALTER TABLE taskdependency ADD COLUMN source_handle VARCHAR",
    "target_handle": "ALTER TABLE taskdependency ADD COLUMN target_handle VARCHAR",
}


def run_dev_migrations():
    inspector = inspect(engine)
    if "contextentry" not in inspector.get_table_names():
        context_columns = set()
    else:
        context_columns = {column["name"] for column in inspector.get_columns("contextentry")}

    if "task" not in inspector.get_table_names():
        task_columns = set()
    else:
        task_columns = {column["name"] for column in inspector.get_columns("task")}

    if "activityevent" not in inspector.get_table_names():
        activity_columns = set()
    else:
        activity_columns = {column["name"] for column in inspector.get_columns("activityevent")}

    if "taskdependency" not in inspector.get_table_names():
        task_dependency_columns = set()
    else:
        task_dependency_columns = {column["name"] for column in inspector.get_columns("taskdependency")}

    with engine.begin() as connection:
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

def create_db_and_tables():
    from models import Task, TaskDependency, ContextEntry, Project, ActivityEvent # Ensure models are loaded
    SQLModel.metadata.create_all(engine)
    run_dev_migrations()

def get_session():
    with Session(engine) as session:
        yield session
