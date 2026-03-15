from fastapi import APIRouter

from .routers import data_ops, dependencies, ops, projects, tasks, views

api_router = APIRouter()
api_router.include_router(projects.router)
api_router.include_router(tasks.router)
api_router.include_router(dependencies.router)
api_router.include_router(views.router)
api_router.include_router(ops.router)
api_router.include_router(data_ops.router)
