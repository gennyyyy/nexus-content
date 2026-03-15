from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


def _default_sqlite_url() -> str:
    sqlite_file_path = Path(__file__).resolve().parent / "database.db"
    return f"sqlite:///{sqlite_file_path.as_posix()}"


def _parse_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_int(value: str | None, default: int, minimum: int) -> int:
    if value is None:
        return default
    try:
        parsed = int(value)
    except ValueError:
        return default
    return max(parsed, minimum)


def _parse_cors_origins(value: str | None) -> list[str]:
    if not value:
        return ["*"]
    origins = [item.strip() for item in value.split(",") if item.strip()]
    return origins or ["*"]


def _join_url(base: str, suffix: str) -> str:
    return f"{base.rstrip('/')}{suffix}"


@dataclass(frozen=True)
class Settings:
    environment: str
    database_url: str
    cors_origins: list[str]
    public_api_base_url: str
    public_mcp_base_url: str
    request_logging_enabled: bool
    request_logging_include_query_string: bool
    request_log_level: str
    request_id_header_name: str
    telemetry_recent_request_limit: int
    telemetry_path_aggregate_limit: int

    @property
    def public_mcp_sse_url(self) -> str:
        return _join_url(self.public_mcp_base_url, "/sse")

    @property
    def public_mcp_messages_url(self) -> str:
        return _join_url(self.public_mcp_base_url, "/messages")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    api_base_url = os.getenv("NEXUS_PUBLIC_API_BASE_URL", "http://127.0.0.1:8000/api")
    mcp_base_url = os.getenv("NEXUS_PUBLIC_MCP_BASE_URL", "http://127.0.0.1:8000/mcp")
    return Settings(
        environment=os.getenv("NEXUS_ENV", "development"),
        database_url=os.getenv("NEXUS_DATABASE_URL", _default_sqlite_url()),
        cors_origins=_parse_cors_origins(os.getenv("NEXUS_CORS_ORIGINS")),
        public_api_base_url=api_base_url,
        public_mcp_base_url=mcp_base_url,
        request_logging_enabled=_parse_bool(
            os.getenv("NEXUS_REQUEST_LOGGING_ENABLED"), True
        ),
        request_logging_include_query_string=_parse_bool(
            os.getenv("NEXUS_REQUEST_LOGGING_INCLUDE_QUERY_STRING"), False
        ),
        request_log_level=os.getenv("NEXUS_REQUEST_LOG_LEVEL", "INFO").upper(),
        request_id_header_name=os.getenv(
            "NEXUS_REQUEST_ID_HEADER_NAME", "X-Request-ID"
        ),
        telemetry_recent_request_limit=_parse_int(
            os.getenv("NEXUS_TELEMETRY_RECENT_REQUEST_LIMIT"), 12, 1
        ),
        telemetry_path_aggregate_limit=_parse_int(
            os.getenv("NEXUS_TELEMETRY_PATH_AGGREGATE_LIMIT"), 10, 1
        ),
    )
