from sqlalchemy.engine import make_url
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Create SQLAlchemy engine with connection pool configuration
engine = create_engine(
    settings.sync_database_url,
    pool_pre_ping=True,  # Test connections before using them
    pool_size=5,
    max_overflow=10,
    connect_args={"connect_timeout": 3}  # Short timeout so health check doesn't hang if DB is offline
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency for yielding database session in FastAPI routers."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> dict:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        db_url = make_url(settings.sync_database_url)

        return {
            "status": "connected",
            "host": db_url.host,
            "database": db_url.database,
        }

    except Exception as exc:
        logger.warning(f"Database connection check failed: {exc}")

        return {
            "status": "disconnected",
            "host": "unknown",
            "database": "unknown",
            "error": "Database server unreachable or credentials invalid"
        }
