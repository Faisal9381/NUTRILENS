from fastapi import APIRouter, HTTPException, status
from app.schemas.ai import (
    ProductAIExplainRequest,
    ProductAIExplainResponse,
    ProductComparisonAIRequest,
    ProductComparisonAIResponse,
)
from app.services.gemini_service import GeminiAIService

router = APIRouter(prefix="/ai", tags=["Gemini AI Nutrition Intelligence"])


@router.post("/explain", response_model=ProductAIExplainResponse)
async def explain_product_nutrition(payload: ProductAIExplainRequest):
    """
    Generate an AI-powered plain-language explanation of verified product nutrition and ingredients.
    Grounded in facts; never invents values or makes unsupported medical claims.
    """
    if not payload.product_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product name is required for AI explanation."
        )

    return await GeminiAIService.explain_product(payload)


@router.post("/compare", response_model=ProductComparisonAIResponse)
async def compare_products_nutrition(payload: ProductComparisonAIRequest):
    """
    Generate an AI-powered objective comparison between two products on a per-100g basis.
    """
    if not payload.product_a or not payload.product_b:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both product_a and product_b are required for comparison."
        )

    return await GeminiAIService.compare_products(payload)
