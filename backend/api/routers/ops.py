import asyncio
import json

from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from ...api.dependencies import SessionDep
from ...db.session import get_database_url
from ...domain.models import LiveUpdateEvent
from ...settings import get_settings
from ...services.views import get_operator_metrics
from ...telemetry import request_telemetry

router = APIRouter(tags=["ops"])


@router.get("/health")
def read_health(request: Request) -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "environment": settings.environment,
        "request_id": getattr(request.state, "request_id", "unknown"),
    }


@router.get("/ready")
def read_ready(request: Request, session: SessionDep) -> dict[str, str]:
    session.connection().exec_driver_sql("SELECT 1").fetchone()
    return {
        "status": "ready",
        "database_url": get_database_url(),
        "request_id": getattr(request.state, "request_id", "unknown"),
    }


@router.get("/metrics")
def read_metrics(
    request: Request, session: SessionDep, project_id: str | None = None
) -> dict[str, object]:
    settings = get_settings()
    metrics = get_operator_metrics(session, project_id)
    telemetry = request_telemetry.snapshot()
    current_request_id = getattr(request.state, "request_id", "unknown")
    return {
        "status": "ok",
        "environment": settings.environment,
        "request_id": current_request_id,
        "request_totals": {
            "total": telemetry.total_requests + 1,
            "failed": telemetry.failed_requests,
            "last_request_id": current_request_id,
            "last_request_path": request.url.path,
            "last_status_code": 200,
            "average_duration_ms": telemetry.average_duration_ms,
            "max_duration_ms": telemetry.max_duration_ms,
        },
        "recent_requests": [
            {
                "request_id": item.request_id,
                "path": item.path,
                "status_code": item.status_code,
                "duration_ms": item.duration_ms,
                "failed": item.failed,
            }
            for item in telemetry.recent_requests or []
        ],
        "path_aggregates": [
            {
                "path": item.path,
                "total_requests": item.total_requests,
                "failed_requests": item.failed_requests,
                "average_duration_ms": item.average_duration_ms,
                "max_duration_ms": item.max_duration_ms,
            }
            for item in telemetry.path_aggregates or []
        ],
        "latency_trend": [
            {
                "label": item.label,
                "request_count": item.request_count,
                "failed_count": item.failed_count,
                "average_duration_ms": item.average_duration_ms,
            }
            for item in telemetry.latency_trend or []
        ],
        "telemetry_window": {
            "recent_request_limit": telemetry.window_size,
            "path_aggregate_limit": telemetry.path_limit,
        },
        **metrics,
    }


@router.get("/config")
def read_ops_config() -> dict[str, object]:
    settings = get_settings()
    return {
        "status": "ok",
        "environment": settings.environment,
        "request_logging_enabled": settings.request_logging_enabled,
        "request_logging_include_query_string": settings.request_logging_include_query_string,
        "request_log_level": settings.request_log_level,
        "request_id_header_name": settings.request_id_header_name,
        "telemetry_recent_request_limit": settings.telemetry_recent_request_limit,
        "telemetry_path_aggregate_limit": settings.telemetry_path_aggregate_limit,
    }


def _serialize_live_event(event: LiveUpdateEvent) -> dict[str, object | None]:
    return {
        "sequence": event.sequence,
        "event_type": event.event_type,
        "created_at": event.created_at.isoformat(),
        "project_id": event.project_id,
        "request_id": event.request_id,
        "path": event.path,
        "method": event.method,
        "detail": event.detail,
    }


@router.get("/events")
async def stream_live_events(request: Request, project_id: str | None = None):
    async def event_generator():
        last_sequence = 0

        while True:
            if await request.is_disconnected():
                break

            events = request_telemetry.recent_events(
                since_sequence=last_sequence,
                project_id=project_id,
                limit=20,
            )
            if events:
                for event in events:
                    last_sequence = max(last_sequence, event.sequence)
                    yield {
                        "event": event.event_type,
                        "data": json.dumps(_serialize_live_event(event)),
                    }
            else:
                yield {
                    "event": "heartbeat",
                    "data": json.dumps({"project_id": project_id}),
                }

            await asyncio.sleep(2)

    return EventSourceResponse(event_generator())
