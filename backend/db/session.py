from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlmodel import Session, create_engine

from ..settings import get_settings

settings = get_settings()
database_url = settings.database_url


def _connect_args_for_url(url: str) -> dict[str, object]:
    return {"check_same_thread": False} if url.startswith("sqlite") else {}


engine = create_engine(
    database_url,
    echo=False,
    connect_args=_connect_args_for_url(database_url),
)


def _alembic_config() -> Config:
    backend_dir = Path(__file__).resolve().parents[1]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", get_database_url())
    return config


def run_migrations() -> None:
    command.upgrade(_alembic_config(), "head")


def create_db_and_tables() -> None:
    run_migrations()


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
