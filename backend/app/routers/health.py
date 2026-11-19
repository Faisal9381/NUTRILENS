from fastapi import APIRouter
from app.core.config import settings
from app.database.session import check_database_connection
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def get_health():
    """
    Check the health of the NutriLens API and its database connection.
    Truthfully reports if PostgreSQL is connected or disconnected.
    """
    db_status = check_database_connection()
    return HealthResponse(
        status="healthy",
        app_name=settings.PROJECT_NAME,
        version=settings.VERSION,
        database=db_status,
        environment="development" if settings.DEBUG else "production"
    )
