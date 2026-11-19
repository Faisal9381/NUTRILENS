import httpx
import logging
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger("nutrilens.openfoodfacts")

OPEN_FOOD_FACTS_API_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
USER_AGENT = "NutriLensApp - Mobile/0.2.0 - https://github.com/nutrilens"


class OpenFoodFactsService:
    @staticmethod
    async def fetch_product_by_barcode(barcode: str) -> Optional[Dict[str, Any]]:
        """
        Query Open Food Facts v2 API for the given barcode.
        Returns parsed product dictionary or None if not found/error.
        """
        clean_barcode = barcode.strip()
        url = OPEN_FOOD_FACTS_API_URL.format(barcode=clean_barcode)

        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, headers=headers)

                if response.status_code == 404:
                    logger.info(f"Barcode {clean_barcode} not found on Open Food Facts (404).")
                    return None

                if response.status_code != 200:
                    logger.warning(
                        f"Open Food Facts API returned unexpected status {response.status_code} for {clean_barcode}"
                    )
                    return None

                data = response.json()
                if data.get("status") == 1 and "product" in data:
                    return data["product"]
                else:
                    logger.info(f"Barcode {clean_barcode} status indicates product not found in OFF.")
                    return None

        except httpx.RequestError as exc:
            logger.error(f"Network error querying Open Food Facts for barcode {clean_barcode}: {exc}")
            return None
        except Exception as exc:
            logger.error(f"Unexpected error in Open Food Facts lookup: {exc}", exc_info=True)
            return None

    @staticmethod
    def parse_product_payload(barcode: str, raw_product: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract and normalize product attributes and per-100g nutritional facts.
        """
        nutriments = raw_product.get("nutriments", {})

        def _get_float(keys: list[str]) -> Optional[float]:
            for key in keys:
                val = nutriments.get(key)
                if val is not None:
                    try:
                        return round(float(val), 2)
                    except (ValueError, TypeError):
                        continue
            return None

        # Resolve energy in kcal
        energy_kcal = _get_float(["energy-kcal_100g", "energy-kcal", "energy_100g_kcal"])
        if energy_kcal is None:
            # Check if energy is provided in kJ and convert (1 kcal = 4.184 kJ)
            energy_kj = _get_float(["energy-kj_100g", "energy_100g"])
            if energy_kj is not None and energy_kj > 0:
                energy_kcal = round(energy_kj / 4.184, 2)

        return {
            "barcode": barcode,
            "product_name": raw_product.get("product_name") or raw_product.get("product_name_en") or "Unknown Product",
            "brand": raw_product.get("brands") or raw_product.get("brand_owner"),
            "categories": raw_product.get("categories"),
            "serving_size": raw_product.get("serving_size"),
            "image_url": raw_product.get("image_url") or raw_product.get("image_front_url"),
            "ingredients_text": raw_product.get("ingredients_text") or raw_product.get("ingredients_text_en"),
            "allergens_text": raw_product.get("allergens") or raw_product.get("allergens_tags"),
            "energy_kcal_100g": energy_kcal,
            "fat_100g": _get_float(["fat_100g", "fat"]),
            "saturated_fat_100g": _get_float(["saturated-fat_100g", "saturated-fat"]),
            "carbohydrates_100g": _get_float(["carbohydrates_100g", "carbohydrates"]),
            "sugars_100g": _get_float(["sugars_100g", "sugars"]),
            "added_sugars_100g": _get_float(["added-sugars_100g", "added-sugars"]),
            "fiber_100g": _get_float(["fiber_100g", "fiber"]),
            "proteins_100g": _get_float(["proteins_100g", "proteins"]),
            "salt_100g": _get_float(["salt_100g", "salt"]),
            "sodium_100g": _get_float(["sodium_100g", "sodium"]),
            "raw_nutriments": nutriments,
            "source": "open_food_facts",
        }
