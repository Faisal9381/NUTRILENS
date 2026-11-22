from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ProductAIExplainRequest(BaseModel):
    product_name: str
    brand: Optional[str] = None
    categories: Optional[str] = None
    serving_size: Optional[str] = None
    ingredients_text: Optional[str] = None
    allergens_text: Optional[str] = None
    nutrients_per_100g: Dict[str, Optional[float]]
    score: Optional[float] = None
    grade: Optional[str] = None


class ProductComparisonAIRequest(BaseModel):
    product_a: ProductAIExplainRequest
    product_b: ProductAIExplainRequest


class ProductAIExplainResponse(BaseModel):
    summary: str
    key_strengths: List[str]
    areas_of_concern: List[str]
    ingredient_insights: List[str]
    consumer_takeaway: str
    is_grounded: bool = True
    model_used: str


class ProductComparisonAIResponse(BaseModel):
    overview: str
    product_a_advantages: List[str]
    product_b_advantages: List[str]
    key_differences: List[str]
    recommendation: str
    model_used: str


class AIChatRequest(BaseModel):
    product_name: str
    brand: Optional[str] = None
    categories: Optional[str] = None
    ingredients_text: Optional[str] = None
    allergens_text: Optional[str] = None
    nutrients_per_100g: Dict[str, Optional[float]] = {}
    score: Optional[float] = None
    grade: Optional[str] = None
    question: str
    history: Optional[List[Dict[str, str]]] = None

class AIChatResponse(BaseModel):
    answer: str
    is_grounded: bool = True
    model_used: str
