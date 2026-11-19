from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from app.services.scoring_engine import NutritionScoreResult, ScoreContributor


class CalculateScoreRequest(BaseModel):
    nutrients_per_100g: Dict[str, Optional[float]]
    is_beverage: bool = False


class OCRParseTextRequest(BaseModel):
    text: str


class OCRParseTextResponse(BaseModel):
    raw_text: str
    nutrients_per_100g: Dict[str, Optional[float]]
    serving_size: Optional[str] = None
    ingredients_text: Optional[str] = None
    allergens_text: Optional[str] = None
    missing_fields: List[str]
    uncertain_fields: List[str]
