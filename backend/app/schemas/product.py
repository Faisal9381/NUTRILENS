from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime


class NutrientsSchema(BaseModel):
    energy_kcal: Optional[float] = None
    fat: Optional[float] = None
    saturated_fat: Optional[float] = None
    carbohydrates: Optional[float] = None
    sugars: Optional[float] = None
    added_sugars: Optional[float] = None
    fiber: Optional[float] = None
    proteins: Optional[float] = None
    salt: Optional[float] = None
    sodium: Optional[float] = None


class ProductResponse(BaseModel):
    id: Optional[int] = None
    barcode: str
    product_name: Optional[str] = "Unknown Product"
    brand: Optional[str] = None
    categories: Optional[str] = None
    serving_size: Optional[str] = None
    image_url: Optional[str] = None
    ingredients_text: Optional[str] = None
    allergens_text: Optional[str] = None
    nutrients_per_100g: NutrientsSchema
    source: str = "open_food_facts"
    cached: bool = False
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProductNotFoundResponse(BaseModel):
    barcode: str
    found: bool = False
    message: str
