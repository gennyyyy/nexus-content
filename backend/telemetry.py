from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Lock

from .domain.models import LiveUpdateEvent


@dataclass
class RecentRequest:
    request_id: str
    path: str
    status_code: int
    duration_ms: float
    failed: bool


@dataclass
class PathAggregate:
    path: str
    total_requests: int
    failed_requests: int
    average_duration_ms: float
    max_duration_ms: float


@dataclass
class TrendPoint:
    label: str
    request_count: int
    failed_count: int
    average_duration_ms: float


@dataclass
class RequestTelemetrySnapshot:
    total_requests: int = 0
    failed_requests: int = 0
    last_request_id: str | None = None
    last_request_path: str | None = None
    last_status_code: int | None = None
    average_duration_ms: float = 0
    max_duration_ms: float = 0
    recent_requests: list[RecentRequest] | None = None
    path_aggregates: list[PathAggregate] | None = None
    latency_trend: list[TrendPoint] | None = None
    window_size: int = 0
    path_limit: int = 0


class RequestTelemetry:
    def __init__(self, recent_limit: int = 12, path_limit: int = 10) -> None:
        self._lock = Lock()
        self._snapshot = RequestTelemetrySnapshot()
        self._recent_limit = recent_limit
        self._path_limit = path_limit
        self._total_duration_ms = 0.0
        self._max_duration_ms = 0.0
        self._recent_requests: deque[RecentRequest] = deque(maxlen=recent_limit)
        self._path_totals: dict[str, int] = {}
        self._path_failed_totals: dict[str, int] = {}
        self._path_duration_totals: dict[str, float] = {}
        self._path_max_duration: dict[str, float] = {}
        self._event_sequence = 0
        self._live_events: deque[LiveUpdateEvent] = deque(
            maxlen=max(recent_limit * 4, 24)
        )

    def configure(self, recent_limit: int, path_limit: int) -> None:
        with self._lock:
            existing_requests = list(self._recent_requests)
            self._recent_limit = recent_limit
            self._path_limit = path_limit
            self._recent_requests = deque(
                existing_requests[:recent_limit], maxlen=recent_limit
            )
            existing_events = list(self._live_events)
            self._live_events = deque(
                existing_events[: max(recent_limit * 4, 24)],
                maxlen=max(recent_limit * 4, 24),
            )

    def emit_event(
        self,
        *,
        event_type: str,
        project_id: str | None = None,
        request_id: str | None = None,
        path: str | None = None,
        method: str | None = None,
        detail: str | None = None,
    ) -> LiveUpdateEvent:
        with self._lock:
            self._event_sequence += 1
            event = LiveUpdateEvent(
                sequence=self._event_sequence,
                event_type=event_type,
                created_at=datetime.now(timezone.utc).replace(tzinfo=None),
                project_id=project_id,
                request_id=request_id,
                path=path,
                method=method,
                detail=detail,
            )
            self._live_events.appendleft(event)
            return event

    def recent_events(
        self,
        *,
        since_sequence: int = 0,
        project_id: str | None = None,
        limit: int = 20,
    ) -> list[LiveUpdateEvent]:
        safe_limit = max(1, min(limit, 100))
        with self._lock:
            events = [
                event
                for event in self._live_events
                if event.sequence > since_sequence
                and (project_id is None or event.project_id in {None, project_id})
            ]
            return list(reversed(events[:safe_limit]))

    def record(
        self,
        request_id: str,
        path: str,
        status_code: int,
        failed: bool,
        duration_ms: float,
    ) -> None:
        with self._lock:
            self._snapshot.total_requests += 1
            if failed:
                self._snapshot.failed_requests += 1
            self._snapshot.last_request_id = request_id
            self._snapshot.last_request_path = path
            self._snapshot.last_status_code = status_code
            self._total_duration_ms += duration_ms
            self._max_duration_ms = max(self._max_duration_ms, duration_ms)
            self._recent_requests.appendleft(
                RecentRequest(
                    request_id=request_id,
                    path=path,
                    status_code=status_code,
                    duration_ms=duration_ms,
                    failed=failed,
                )
            )
            self._path_totals[path] = self._path_totals.get(path, 0) + 1
            if failed:
                self._path_failed_totals[path] = (
                    self._path_failed_totals.get(path, 0) + 1
                )
            self._path_duration_totals[path] = (
                self._path_duration_totals.get(path, 0.0) + duration_ms
            )
            self._path_max_duration[path] = max(
                self._path_max_duration.get(path, 0.0), duration_ms
            )

    def _build_latency_trend(self) -> list[TrendPoint]:
        requests = list(reversed(self._recent_requests))
        if not requests:
            return []

        bucket_size = max(1, min(4, len(requests)))
        trend: list[TrendPoint] = []

        for index in range(0, len(requests), bucket_size):
            bucket = requests[index : index + bucket_size]
            request_count = len(bucket)
            failed_count = sum(1 for item in bucket if item.failed)
            average_duration_ms = round(
                sum(item.duration_ms for item in bucket) / request_count,
                2,
            )
            trend.append(
                TrendPoint(
                    label=f"W{len(trend) + 1}",
                    request_count=request_count,
                    failed_count=failed_count,
                    average_duration_ms=average_duration_ms,
                )
            )

        return trend

    def snapshot(self) -> RequestTelemetrySnapshot:
        with self._lock:
            average_duration_ms = 0.0
            if self._snapshot.total_requests > 0:
                average_duration_ms = round(
                    self._total_duration_ms / self._snapshot.total_requests, 2
                )
            path_aggregates = [
                PathAggregate(
                    path=path,
                    total_requests=total_requests,
                    failed_requests=self._path_failed_totals.get(path, 0),
                    average_duration_ms=round(
                        self._path_duration_totals.get(path, 0.0) / total_requests, 2
                    ),
                    max_duration_ms=round(self._path_max_duration.get(path, 0.0), 2),
                )
                for path, total_requests in sorted(
                    self._path_totals.items(),
                    key=lambda item: (-item[1], item[0]),
                )[: self._path_limit]
            ]
            return RequestTelemetrySnapshot(
                total_requests=self._snapshot.total_requests,
                failed_requests=self._snapshot.failed_requests,
                last_request_id=self._snapshot.last_request_id,
                last_request_path=self._snapshot.last_request_path,
                last_status_code=self._snapshot.last_status_code,
                average_duration_ms=average_duration_ms,
                max_duration_ms=round(self._max_duration_ms, 2),
                recent_requests=list(self._recent_requests),
                path_aggregates=path_aggregates,
                latency_trend=self._build_latency_trend(),
                window_size=self._recent_limit,
                path_limit=self._path_limit,
            )

    def reset(self) -> None:
        with self._lock:
            self._snapshot = RequestTelemetrySnapshot()
            self._total_duration_ms = 0.0
            self._max_duration_ms = 0.0
            self._event_sequence = 0
            self._recent_requests.clear()
            self._live_events.clear()
            self._path_totals.clear()
            self._path_failed_totals.clear()
            self._path_duration_totals.clear()
            self._path_max_duration.clear()


request_telemetry = RequestTelemetry()
