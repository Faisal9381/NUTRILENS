import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.gemini_service import GeminiAIService
from app.schemas.ai import (
    ProductAIExplainRequest,
    ProductAIExplainResponse,
    ProductComparisonAIRequest,
    AIChatRequest,
    AIChatResponse,
)


@pytest.mark.anyio
async def test_fallback_ai_explanation():
    req = ProductAIExplainRequest(
        product_name="Oat Drink",
        brand="Oat Brand",
        categories="Beverages",
        serving_size="250ml",
        ingredients_text="Water, oats, rapeseed oil, salt",
        allergens_text="oats",
        nutrients_per_100g={
            "energy_kcal": 61.0,
            "fat": 3.0,
            "saturated_fat": 0.3,
            "carbohydrates": 7.1,
            "sugars": 3.4,
            "fiber": 0.8,
            "proteins": 1.1,
            "sodium": 0.04
        },
        score=4.5,
        grade="A"
    )

    explanation = await GeminiAIService.explain_product(req)
    assert explanation is not None
    assert isinstance(explanation, ProductAIExplainResponse)
    assert "Oat Drink" in explanation.summary
    assert len(explanation.key_strengths) > 0
    assert explanation.is_grounded is True


@pytest.mark.anyio
async def test_fallback_ai_comparison():
    prod_a = ProductAIExplainRequest(
        product_name="Whole Milk",
        score=3.5,
        grade="B",
        nutrients_per_100g={"sugars": 4.8, "fat": 3.5}
    )
    prod_b = ProductAIExplainRequest(
        product_name="Chocolate Milk",
        score=2.0,
        grade="D",
        nutrients_per_100g={"sugars": 11.5, "fat": 2.5}
    )
    req = ProductComparisonAIRequest(product_a=prod_a, product_b=prod_b)

    comparison = await GeminiAIService.compare_products(req)
    assert comparison is not None
    assert "Whole Milk" in comparison.overview
    assert len(comparison.key_differences) > 0
    assert "scores higher" in comparison.recommendation


@pytest.mark.anyio
async def test_ai_chat_fallback():
    req = AIChatRequest(
        product_name="Masala Oats",
        brand="Saffola",
        ingredients_text="Whole oats, spices, salt, palm oil",
        nutrients_per_100g={"sugars": 2.0, "fiber": 7.5},
        score=4.0,
        grade="A",
        question="Is this good for daily breakfast?"
    )
    ans = await GeminiAIService.chat_answer(req)
    assert ans is not None
    assert isinstance(ans, AIChatResponse)
    assert "Masala Oats" in ans.answer


@pytest.mark.anyio
async def test_ai_explain_api_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "product_name": "Digestive Biscuits",
            "brand": "Britannia",
            "categories": "Snacks",
            "ingredients_text": "Wheat flour, palm oil, sugar, INS 500",
            "nutrients_per_100g": {
                "energy_kcal": 450.0,
                "sugars": 18.0,
                "saturated_fat": 8.0,
                "proteins": 6.0
            },
            "score": 2.5,
            "grade": "C"
        }
        res = await ac.post("/api/v1/ai/explain", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "summary" in data
        assert "key_strengths" in data
        assert "areas_of_concern" in data
        assert "consumer_takeaway" in data


@pytest.mark.anyio
async def test_ai_chat_api_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "product_name": "Fruit Juice",
            "question": "Does this contain added sugar?"
        }
        res = await ac.post("/api/v1/ai/chat", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "answer" in data

