from __future__ import annotations

import logging
import time
import uuid
from typing import Awaitable, Callable

from fastapi import Request, Response

from .settings import Settings
from .telemetry import request_telemetry

logger = logging.getLogger("nexus.requests")


def configure_logging(settings: Settings) -> None:
    level_name = settings.request_log_level.upper()
    level = getattr(logging, level_name, logging.INFO)

    root_logger = logging.getLogger()
    if not root_logger.handlers:
        logging.basicConfig(
            level=level,
            format="%(asctime)s %(levelname)s %(name)s %(message)s",
        )
    logger.setLevel(level)
    request_telemetry.configure(
        settings.telemetry_recent_request_limit,
        settings.telemetry_path_aggregate_limit,
    )


def build_request_path(request: Request, include_query_string: bool) -> str:
    if include_query_string and request.url.query:
        return f"{request.url.path}?{request.url.query}"
    return request.url.path


def ensure_request_id(request: Request, settings: Settings) -> str:
    header_value = request.headers.get(settings.request_id_header_name)
    request_id = header_value.strip() if header_value else uuid.uuid4().hex
    request.state.request_id = request_id
    return request_id


async def log_request(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
    settings: Settings,
) -> Response:
    if not settings.request_logging_enabled:
        return await call_next(request)

    start = time.perf_counter()
    path = build_request_path(request, settings.request_logging_include_query_string)
    client_host = request.client.host if request.client else "unknown"
    request_id = ensure_request_id(request, settings)

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        request_telemetry.record(request_id, path, 500, True, duration_ms)
        logger.exception(
            "request_failed request_id=%s method=%s path=%s client=%s duration_ms=%s",
            request_id,
            request.method,
            path,
            client_host,
            duration_ms,
        )
        raise

    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    response.headers[settings.request_id_header_name] = request_id
    logger.info(
        "request_completed request_id=%s method=%s path=%s status_code=%s client=%s duration_ms=%s",
        request_id,
        request.method,
        path,
        response.status_code,
        client_host,
        duration_ms,
    )
    request_telemetry.record(
        request_id,
        path,
        response.status_code,
        response.status_code >= 500,
        duration_ms,
    )
    return response
