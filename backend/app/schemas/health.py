from pydantic import BaseModel
from typing import Optional, Dict, Any


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    database: Dict[str, Any]
    environment: str
