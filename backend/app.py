from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlmodel import Session

from .api.router import api_router
from .db.session import create_db_and_tables, engine
from .integrations.mcp_server import mcp
from .services.activity import seed_activity_events
from .services.errors import ServiceError


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    with Session(engine) as session:
        seed_activity_events(session)
    yield


def create_app() -> FastAPI:
    app = FastAPI(lifespan=lifespan, title="Context-Aware MCP Server")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(ServiceError)
    async def handle_service_error(_: Request, exc: ServiceError):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    app.include_router(api_router)
    app.mount("/mcp", mcp.sse_app("/mcp"))
    return app


app = create_app()
