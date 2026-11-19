import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.main import app
from app.services.open_food_facts import OpenFoodFactsService

client = TestClient(app)

MOCK_OFF_PRODUCT = {
    "product_name": "Organic Oat Milk",
    "brands": "Oatly",
    "categories": "Beverages, Plant-based milks",
    "serving_size": "250 ml",
    "image_url": "https://images.openfoodfacts.org/images/products/739/437/661/6037/front_en.jpg",
    "ingredients_text": "Oat base (water, oats 10%), rapeseed oil, calcium carbonate, salt.",
    "allergens": "oats",
    "nutriments": {
        "energy-kcal_100g": 46.0,
        "fat_100g": 1.5,
        "saturated-fat_100g": 0.2,
        "carbohydrates_100g": 6.7,
        "sugars_100g": 4.1,
        "fiber_100g": 0.8,
        "proteins_100g": 1.0,
        "salt_100g": 0.1,
        "sodium_100g": 0.04
    }
}


def test_parse_product_payload():
    parsed = OpenFoodFactsService.parse_product_payload("7394376616037", MOCK_OFF_PRODUCT)
    assert parsed["barcode"] == "7394376616037"
    assert parsed["product_name"] == "Organic Oat Milk"
    assert parsed["brand"] == "Oatly"
    assert parsed["energy_kcal_100g"] == 46.0
    assert parsed["fat_100g"] == 1.5
    assert parsed["proteins_100g"] == 1.0


@pytest.mark.anyio
@patch("app.services.open_food_facts.OpenFoodFactsService.fetch_product_by_barcode", new_callable=AsyncMock)
def test_get_product_by_barcode_success(mock_fetch):
    mock_fetch.return_value = MOCK_OFF_PRODUCT

    response = client.get("/api/v1/products/barcode/7394376616037")
    assert response.status_code == 200
    data = response.json()

    assert data["barcode"] == "7394376616037"
    assert data["product_name"] == "Organic Oat Milk"
    assert data["brand"] == "Oatly"
    assert data["nutrients_per_100g"]["energy_kcal"] == 46.0
    assert data["nutrients_per_100g"]["carbohydrates"] == 6.7
    assert data["nutrients_per_100g"]["fat"] == 1.5


@pytest.mark.anyio
@patch("app.services.open_food_facts.OpenFoodFactsService.fetch_product_by_barcode", new_callable=AsyncMock)
def test_get_product_by_barcode_not_found(mock_fetch):
    mock_fetch.return_value = None

    response = client.get("/api/v1/products/barcode/0000000000000")
    assert response.status_code == 404
    data = response.json()
    assert "not be found" in data["detail"]
