from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from sqlalchemy.sql import func
from app.database.session import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    barcode = Column(String(64), unique=True, index=True, nullable=False)
    product_name = Column(String(255), nullable=True)
    brand = Column(String(255), nullable=True)
    categories = Column(Text, nullable=True)
    serving_size = Column(String(100), nullable=True)
    image_url = Column(String(500), nullable=True)
    ingredients_text = Column(Text, nullable=True)
    allergens_text = Column(Text, nullable=True)

    # Normalized Nutrients per 100g / 100ml
    energy_kcal_100g = Column(Float, nullable=True)
    fat_100g = Column(Float, nullable=True)
    saturated_fat_100g = Column(Float, nullable=True)
    carbohydrates_100g = Column(Float, nullable=True)
    sugars_100g = Column(Float, nullable=True)
    added_sugars_100g = Column(Float, nullable=True)
    fiber_100g = Column(Float, nullable=True)
    proteins_100g = Column(Float, nullable=True)
    salt_100g = Column(Float, nullable=True)
    sodium_100g = Column(Float, nullable=True)

    # Raw Nutriments payload (JSON) for lossless caching
    raw_nutriments = Column(JSON, nullable=True)

    # Source Tracking & Timestamps
    source = Column(String(50), default="open_food_facts", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
