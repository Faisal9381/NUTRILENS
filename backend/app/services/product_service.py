import logging
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.product import Product
from app.schemas.product import ProductResponse, NutrientsSchema
from app.services.open_food_facts import OpenFoodFactsService

logger = logging.getLogger("nutrilens.product_service")


class ProductService:
    @staticmethod
    def _model_to_schema(product: Product, cached: bool = True) -> ProductResponse:
        nutrients = NutrientsSchema(
            energy_kcal=product.energy_kcal_100g,
            fat=product.fat_100g,
            saturated_fat=product.saturated_fat_100g,
            carbohydrates=product.carbohydrates_100g,
            sugars=product.sugars_100g,
            added_sugars=product.added_sugars_100g,
            fiber=product.fiber_100g,
            proteins=product.proteins_100g,
            salt=product.salt_100g,
            sodium=product.sodium_100g,
        )
        return ProductResponse(
            id=product.id,
            barcode=product.barcode,
            product_name=product.product_name,
            brand=product.brand,
            categories=product.categories,
            serving_size=product.serving_size,
            image_url=product.image_url,
            ingredients_text=product.ingredients_text,
            allergens_text=str(product.allergens_text) if product.allergens_text else None,
            nutrients_per_100g=nutrients,
            source=product.source,
            cached=cached,
            created_at=product.created_at,
        )

    @classmethod
    async def get_or_fetch_product(
        cls,
        barcode: str,
        db: Optional[Session] = None
    ) -> Optional[ProductResponse]:
        """
        Check database cache first. If not cached, query Open Food Facts API,
        save to database if DB is reachable, and return standardized product.
        """
        clean_barcode = barcode.strip()

        # 1. Check PostgreSQL Cache if session is available
        if db is not None:
            try:
                cached_product = db.query(Product).filter(Product.barcode == clean_barcode).first()
                if cached_product:
                    logger.info(f"Cache hit in PostgreSQL for barcode {clean_barcode}")
                    return cls._model_to_schema(cached_product, cached=True)
            except Exception as exc:
                logger.warning(f"Database lookup failed for barcode {clean_barcode}: {exc}")

        # 2. Cache miss: Fetch from Open Food Facts API
        logger.info(f"Cache miss for {clean_barcode}. Querying Open Food Facts API...")
        raw_product = await OpenFoodFactsService.fetch_product_by_barcode(clean_barcode)

        if not raw_product:
            return None

        # 3. Parse and standardize attributes
        parsed_data = OpenFoodFactsService.parse_product_payload(clean_barcode, raw_product)

        # 4. Cache to PostgreSQL if DB is available
        saved_product = None
        if db is not None:
            try:
                new_product = Product(**parsed_data)
                db.add(new_product)
                db.commit()
                db.refresh(new_product)
                logger.info(f"Successfully cached product {clean_barcode} in PostgreSQL (ID: {new_product.id})")
                return cls._model_to_schema(new_product, cached=False)
            except Exception as exc:
                db.rollback()
                logger.warning(f"Failed to persist product {clean_barcode} to database: {exc}")

        # If DB was not connected or persist failed, return parsed data directly
        nutrients = NutrientsSchema(
            energy_kcal=parsed_data.get("energy_kcal_100g"),
            fat=parsed_data.get("fat_100g"),
            saturated_fat=parsed_data.get("saturated_fat_100g"),
            carbohydrates=parsed_data.get("carbohydrates_100g"),
            sugars=parsed_data.get("sugars_100g"),
            added_sugars=parsed_data.get("added_sugars_100g"),
            fiber=parsed_data.get("fiber_100g"),
            proteins=parsed_data.get("proteins_100g"),
            salt=parsed_data.get("salt_100g"),
            sodium=parsed_data.get("sodium_100g"),
        )
        return ProductResponse(
            id=None,
            barcode=clean_barcode,
            product_name=parsed_data.get("product_name"),
            brand=parsed_data.get("brand"),
            categories=parsed_data.get("categories"),
            serving_size=parsed_data.get("serving_size"),
            image_url=parsed_data.get("image_url"),
            ingredients_text=parsed_data.get("ingredients_text"),
            allergens_text=str(parsed_data.get("allergens_text")) if parsed_data.get("allergens_text") else None,
            nutrients_per_100g=nutrients,
            source=parsed_data.get("source", "open_food_facts"),
            cached=False,
            created_at=None,
        )
