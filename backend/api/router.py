from fastapi import APIRouter

from .routers import dependencies, projects, tasks, views

api_router = APIRouter()
api_router.include_router(projects.router)
api_router.include_router(tasks.router)
api_router.include_router(dependencies.router)
api_router.include_router(views.router)
