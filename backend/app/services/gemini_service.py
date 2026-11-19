"""
Google Gemini AI Integration Service
Responsible for generating plain-language, evidence-grounded nutritional summaries,
ingredient explanations, and product comparisons using the official google-genai SDK.

CORE SAFETY PRINCIPLES:
1. Grounded exclusively in verified product facts and deterministic scores.
2. Gemini NEVER calculates the official rating (the score is passed in from Step 3).
3. Gemini NEVER invents missing nutrients or makes medical diagnoses.
4. If GEMINI_API_KEY is not configured or fails, provides deterministic fallback insights.
"""

import json
import logging
from typing import Optional, Dict, Any, List
from app.core.config import settings
from app.schemas.ai import (
    ProductAIExplainRequest,
    ProductAIExplainResponse,
    ProductComparisonAIRequest,
    ProductComparisonAIResponse,
)

logger = logging.getLogger("nutrilens.ai_service")

# Lazy-loaded GenAI client instance
_genai_client = None


def get_genai_client():
    global _genai_client
    if _genai_client is None and settings.GEMINI_API_KEY:
        try:
            from google import genai
            _genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)
            logger.info("Initialized Google GenAI client successfully.")
        except Exception as exc:
            logger.error(f"Failed to initialize Google GenAI Client: {exc}")
    return _genai_client


class GeminiAIService:
    @classmethod
    async def explain_product(cls, req: ProductAIExplainRequest) -> ProductAIExplainResponse:
        """
        Generates a plain-language explanation of verified product nutrition and ingredients.
        """
        client = get_genai_client()

        # If API key is missing or client failed, use safe deterministic rule-based fallback
        if not client:
            logger.info("GEMINI_API_KEY not configured. Returning deterministic fallback insights.")
            return cls._build_fallback_explanation(req)

        prompt = cls._build_explain_prompt(req)

        try:
            # Request JSON structured output from Gemini 2.5 Flash
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": ProductAIExplainResponse,
                    "temperature": 0.2,  # Low temperature for factual consistency
                }
            )

            if response.parsed:
                return response.parsed
            elif response.text:
                parsed_json = json.loads(response.text)
                return ProductAIExplainResponse(**parsed_json, model_used=settings.GEMINI_MODEL)
            else:
                return cls._build_fallback_explanation(req)

        except Exception as exc:
            logger.error(f"Gemini API generation error: {exc}", exc_info=True)
            return cls._build_fallback_explanation(req)

    @classmethod
    async def compare_products(cls, req: ProductComparisonAIRequest) -> ProductComparisonAIResponse:
        """
        Compares two packaged food products based strictly on verified 100g/ml metrics.
        """
        client = get_genai_client()

        if not client:
            return cls._build_fallback_comparison(req)

        prompt = cls._build_comparison_prompt(req)

        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": ProductComparisonAIResponse,
                    "temperature": 0.2,
                }
            )

            if response.parsed:
                return response.parsed
            elif response.text:
                parsed_json = json.loads(response.text)
                return ProductComparisonAIResponse(**parsed_json, model_used=settings.GEMINI_MODEL)
            else:
                return cls._build_fallback_comparison(req)

        except Exception as exc:
            logger.error(f"Gemini comparison API error: {exc}", exc_info=True)
            return cls._build_fallback_comparison(req)

    # ------------------------------------------------------------------
    # Prompt Builders
    # ------------------------------------------------------------------

    @staticmethod
    def _build_explain_prompt(req: ProductAIExplainRequest) -> str:
        nutrients_str = json.dumps(req.nutrients_per_100g, indent=2)
        return f"""
You are the nutritional intelligence assistant for NutriLens.
Your task is to explain verified nutritional facts and ingredients to an everyday consumer in simple, objective, accessible language.

CRITICAL RULES:
1. Base your response STRICTLY on the verified facts below. DO NOT invent missing values.
2. DO NOT recalculate or override the Official Score ({req.score} / 5.0, Grade: {req.grade}).
3. DO NOT give medical diagnoses or treatment recommendations.
4. DO NOT label additives as automatically harmful without nuance; explain their standard culinary or preservative function objectively.
5. Emphasize consumer awareness ("Understand what you eat").

PRODUCT FACTS:
- Name: {req.product_name}
- Brand: {req.brand or 'Unspecified'}
- Category: {req.categories or 'General packaged food'}
- Serving Size: {req.serving_size or 'Not specified'}
- Official Score: {req.score if req.score is not None else 'Insufficient Data'} / 5.0 (Grade: {req.grade or 'N/A'})
- Nutrients (Per 100g / 100ml):
{nutrients_str}
- Ingredients: {req.ingredients_text or 'Ingredients list not provided'}
- Allergens: {req.allergens_text or 'None reported'}

Return JSON conforming strictly to the requested schema.
"""

    @staticmethod
    def _build_comparison_prompt(req: ProductComparisonAIRequest) -> str:
        a = req.product_a
        b = req.product_b
        return f"""
You are the nutritional comparison assistant for NutriLens.
Compare Product A and Product B objectively on a normalized per-100g basis.

PRODUCT A:
- Name: {a.product_name} ({a.brand or 'Brand'})
- Score: {a.score} / 5.0 (Grade {a.grade})
- Nutrients: {json.dumps(a.nutrients_per_100g)}
- Ingredients: {a.ingredients_text or 'None'}

PRODUCT B:
- Name: {b.product_name} ({b.brand or 'Brand'})
- Score: {b.score} / 5.0 (Grade {b.grade})
- Nutrients: {json.dumps(b.nutrients_per_100g)}
- Ingredients: {b.ingredients_text or 'None'}

Provide an objective side-by-side comparison. Return JSON conforming to the schema.
"""

    # ------------------------------------------------------------------
    # Deterministic Rule-Based Fallbacks (Zero AI Failure / Offline)
    # ------------------------------------------------------------------

    @staticmethod
    def _build_fallback_explanation(req: ProductAIExplainRequest) -> ProductAIExplainResponse:
        n = req.nutrients_per_100g
        strengths = []
        concerns = []
        insights = []

        # Analyze sugars
        sugars = n.get("sugars")
        if sugars is not None:
            if sugars <= 5.0:
                strengths.append(f"Low in sugar ({sugars}g per 100g).")
            elif sugars >= 15.0:
                concerns.append(f"High sugar concentration ({sugars}g per 100g).")

        # Analyze saturated fat
        sat_fat = n.get("saturated_fat")
        if sat_fat is not None:
            if sat_fat <= 1.5:
                strengths.append("Low saturated fat content.")
            elif sat_fat >= 5.0:
                concerns.append(f"Contains elevated saturated fat ({sat_fat}g per 100g).")

        # Analyze fiber & protein
        fiber = n.get("fiber")
        if fiber is not None and fiber >= 3.0:
            strengths.append(f"Good source of dietary fiber ({fiber}g per 100g).")

        protein = n.get("proteins")
        if protein is not None and protein >= 5.0:
            strengths.append(f"Notable source of protein ({protein}g per 100g).")

        # Analyze sodium
        sodium = n.get("sodium")
        if sodium is not None and sodium > 0.4:
            concerns.append("Elevated sodium level per 100g.")

        if req.ingredients_text:
            insights.append("Product ingredients list is verified and recorded above.")
        else:
            insights.append("Ingredients list was not reported on the packaging entry.")

        if not strengths:
            strengths.append("Standard packaged food composition.")
        if not concerns:
            concerns.append("No immediate nutrient red-flags identified based on reported values.")

        summary = f"{req.product_name} has an official NutriLens rating of {req.score or 'N/A'}/5.0 (Grade {req.grade or 'N/A'})."
        takeaway = "Review the nutrient table and serving size to align this product with your personal daily nutritional goals."

        return ProductAIExplainResponse(
            summary=summary,
            key_strengths=strengths,
            areas_of_concern=concerns,
            ingredient_insights=insights,
            consumer_takeaway=takeaway,
            is_grounded=True,
            model_used="deterministic-rules-engine (Gemini fallback)"
        )

    @staticmethod
    def _build_fallback_comparison(req: ProductComparisonAIRequest) -> ProductComparisonAIResponse:
        a = req.product_a
        b = req.product_b
        score_a = a.score or 0.0
        score_b = b.score or 0.0

        diffs = []
        sugar_a = a.nutrients_per_100g.get("sugars")
        sugar_b = b.nutrients_per_100g.get("sugars")
        if sugar_a is not None and sugar_b is not None:
            if sugar_a < sugar_b:
                diffs.append(f"{a.product_name} contains less sugar ({sugar_a}g vs {sugar_b}g per 100g).")
            elif sugar_b < sugar_a:
                diffs.append(f"{b.product_name} contains less sugar ({sugar_b}g vs {sugar_a}g per 100g).")

        adv_a = [f"Official NutriLens score: {score_a}/5.0"]
        adv_b = [f"Official NutriLens score: {score_b}/5.0"]

        if score_a > score_b:
            rec = f"{a.product_name} scores higher overall on normalized nutrient density."
        elif score_b > score_a:
            rec = f"{b.product_name} scores higher overall on normalized nutrient density."
        else:
            rec = "Both products share very similar aggregate nutritional ratings."

        return ProductComparisonAIResponse(
            overview=f"Comparing {a.product_name} and {b.product_name} per 100g.",
            product_a_advantages=adv_a,
            product_b_advantages=adv_b,
            key_differences=diffs if diffs else ["Balanced macro distribution."],
            recommendation=rec,
            model_used="deterministic-rules-engine (Gemini fallback)"
        )
