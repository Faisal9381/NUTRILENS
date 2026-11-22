"""
Google Gemini AI Integration Service
Responsible for generating plain-language, evidence-grounded nutritional summaries,
ingredient explanations, product comparisons, and Q&A using the official google-genai SDK.

CORE SAFETY & GROUNDING PRINCIPLES:
1. Grounded exclusively in verified product facts and deterministic backend scores.
2. Gemini NEVER calculates or overrides the official score (the score is calculated by scoring_engine.py).
3. Gemini NEVER invents missing nutrients or makes medical diagnoses / disease claims.
4. Explanations incorporate Indian nutritional reference standards (FSSAI regulations & ICMR-NIN dietary guidelines).
5. Additives (INS/E numbers) are explained objectively by culinary/preservative function rather than alarmist claims.
6. If GEMINI_API_KEY is not configured or fails, provides deterministic rule-based fallback insights.
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
    AIChatRequest,
    AIChatResponse,
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
        Grounded in FSSAI & ICMR-NIN Indian dietary context.
        """
        client = get_genai_client()

        # If API key is missing or client failed, use safe deterministic rule-based fallback
        if not client:
            logger.info("GEMINI_API_KEY not configured or client null. Returning deterministic fallback insights.")
            return cls._build_fallback_explanation(req)

        prompt = cls._build_explain_prompt(req)

        try:
            # Request JSON structured output from Gemini model
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
                parsed_res = response.parsed
                # Preserve the model used string
                if isinstance(parsed_res, ProductAIExplainResponse):
                    parsed_res.model_used = settings.GEMINI_MODEL
                    return parsed_res
                elif isinstance(parsed_res, dict):
                    return ProductAIExplainResponse(**parsed_res, model_used=settings.GEMINI_MODEL)
            elif response.text:
                parsed_json = json.loads(response.text)
                return ProductAIExplainResponse(**parsed_json, model_used=settings.GEMINI_MODEL)

            return cls._build_fallback_explanation(req)

        except Exception as exc:
            logger.error(f"Gemini API generation error: {exc}", exc_info=True)
            return cls._build_fallback_explanation(req)

    @classmethod
    async def compare_products(cls, req: ProductComparisonAIRequest) -> ProductComparisonAIResponse:
        """
        Compares two packaged food products strictly on verified per-100g metrics with Indian context.
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
                parsed_res = response.parsed
                if isinstance(parsed_res, ProductComparisonAIResponse):
                    parsed_res.model_used = settings.GEMINI_MODEL
                    return parsed_res
                elif isinstance(parsed_res, dict):
                    return ProductComparisonAIResponse(**parsed_res, model_used=settings.GEMINI_MODEL)
            elif response.text:
                parsed_json = json.loads(response.text)
                return ProductComparisonAIResponse(**parsed_json, model_used=settings.GEMINI_MODEL)

            return cls._build_fallback_comparison(req)

        except Exception as exc:
            logger.error(f"Gemini comparison API error: {exc}", exc_info=True)
            return cls._build_fallback_comparison(req)

    @classmethod
    async def chat_answer(cls, req: AIChatRequest) -> AIChatResponse:
        """
        Provides grounded Q&A for a specific product context.
        """
        client = get_genai_client()

        if not client:
            return cls._build_fallback_chat(req)

        prompt = cls._build_chat_prompt(req)

        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config={
                    "temperature": 0.3,
                }
            )
            text = response.text or ""
            if not text.strip():
                return cls._build_fallback_chat(req)
            return AIChatResponse(
                answer=text.strip(),
                is_grounded=True,
                model_used=settings.GEMINI_MODEL
            )
        except Exception as exc:
            logger.error(f"Gemini chat error: {exc}", exc_info=True)
            return cls._build_fallback_chat(req)

    # ------------------------------------------------------------------
    # Prompt Builders
    # ------------------------------------------------------------------

    @staticmethod
    def _build_explain_prompt(req: ProductAIExplainRequest) -> str:
        nutrients_str = json.dumps(req.nutrients_per_100g, indent=2)
        return f"""
You are the expert nutritional intelligence AI for NutriLens, an Indian packaged food analysis platform.
Your objective is to explain verified product nutrition and ingredients to Indian consumers in simple, clear, empowering language.

CRITICAL SAFETY & GROUNDING RULES:
1. Base your analysis STRICTLY on the verified facts provided below. DO NOT invent missing nutrient numbers or assume unlisted ingredients.
2. Treat missing nutrient fields as "Not reported on packaging" rather than zero.
3. DO NOT recalculate, override, or criticize the Official Score ({req.score} / 5.0, Grade: {req.grade}).
4. DO NOT make medical diagnoses, prescribe treatments, or offer aggressive weight-loss advice.
5. DO NOT claim that NutriLens score or your summary is an official FSSAI regulatory rating.
6. Ingredient additives (INS numbers, preservatives, emulsifiers like INS 330, INS 415, palm oil, refined wheat flour/maida) must be explained objectively with their functional food industry purpose and balanced health awareness, rather than alarmist claims.
7. Frame insights considering Indian dietary patterns and reference guidelines (ICMR-NIN guidelines & FSSAI labeling norms).

PRODUCT FACTS:
- Name: {req.product_name}
- Brand: {req.brand or 'Unspecified'}
- Category: {req.categories or 'General packaged food'}
- Serving Size: {req.serving_size or 'Not specified'}
- Official Backend Score: {req.score if req.score is not None else 'Insufficient Data'} / 5.0 (Grade: {req.grade or 'N/A'})
- Verified Nutrients (Per 100g / 100ml):
{nutrients_str}
- Ingredients List: {req.ingredients_text or 'Ingredients list not provided'}
- Allergen Declarations: {req.allergens_text or 'None reported'}

OUTPUT FORMAT REQUIREMENT:
Return valid JSON adhering strictly to the schema with fields:
- summary: A 2-3 sentence overview suitable for an Indian consumer.
- key_strengths: List of 2-4 bullet points highlighting positive nutritional aspects (e.g., protein, fiber, low saturated fat).
- areas_of_concern: List of 1-3 bullet points noting elevated sugar, sodium, or saturated fat per 100g relative to ICMR-NIN thresholds.
- ingredient_insights: List of 2-4 bullet points explaining specific key ingredients, additives (INS/E numbers), emulsifiers, or palm oil/refined flour usage.
- consumer_takeaway: A practical, actionable 1-2 sentence recommendation for daily consumption context.
- is_grounded: true
- model_used: "{settings.GEMINI_MODEL}"
"""

    @staticmethod
    def _build_comparison_prompt(req: ProductComparisonAIRequest) -> str:
        a = req.product_a
        b = req.product_b
        return f"""
You are the nutritional comparison AI for NutriLens.
Compare Product A and Product B objectively on a normalized per-100g/ml basis for Indian consumers.

PRODUCT A:
- Name: {a.product_name} ({a.brand or 'Brand'})
- Score: {a.score} / 5.0 (Grade {a.grade})
- Nutrients: {json.dumps(a.nutrients_per_100g)}
- Ingredients: {a.ingredients_text or 'None reported'}

PRODUCT B:
- Name: {b.product_name} ({b.brand or 'Brand'})
- Score: {b.score} / 5.0 (Grade {b.grade})
- Nutrients: {json.dumps(b.nutrients_per_100g)}
- Ingredients: {b.ingredients_text or 'None reported'}

CRITICAL RULES:
1. Base comparisons strictly on the provided facts per 100g/ml.
2. Respect ICMR-NIN dietary guidelines (lower added sugar & sodium, higher fiber & protein).
3. Do not make medical claims.

Return JSON conforming strictly to ProductComparisonAIResponse schema.
"""

    @staticmethod
    def _build_chat_prompt(req: AIChatRequest) -> str:
        history_str = ""
        if req.history:
            history_str = "\n".join([f"{item.get('role', 'user')}: {item.get('text', '')}" for item in req.history])

        return f"""
You are NutriLens AI assistant, helping an Indian consumer understand a specific packaged food product.
Answer the user's question clearly, concisely, and factually based ONLY on the verified product details below and ICMR-NIN / FSSAI dietary reference guidelines.

PRODUCT CONTEXT:
- Name: {req.product_name} ({req.brand or 'Brand unspecified'})
- Category: {req.categories or 'Packaged Food'}
- Score: {req.score if req.score is not None else 'N/A'} / 5.0 (Grade: {req.grade or 'N/A'})
- Verified Nutrients per 100g/ml: {json.dumps(req.nutrients_per_100g)}
- Ingredients: {req.ingredients_text or 'Not reported'}
- Allergens: {req.allergens_text or 'None reported'}

RECENT CONVERSATION HISTORY:
{history_str}

USER QUESTION: {req.question}

INSTRUCTIONS:
- Keep your answer under 150 words.
- Use simple, friendly language.
- Do not make medical diagnoses or claims.
- If data is missing (e.g., added sugar not listed), state clearly that it is not reported on packaging.
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

        # Analyze sugars (ICMR-NIN benchmark: <= 5g low, >= 15g high per 100g)
        sugars = n.get("sugars")
        if sugars is not None:
            if sugars <= 5.0:
                strengths.append(f"Low sugar content ({sugars}g per 100g).")
            elif sugars >= 15.0:
                concerns.append(f"High sugar content ({sugars}g per 100g) relative to ICMR-NIN daily thresholds.")
            else:
                insights.append(f"Moderate sugar level ({sugars}g per 100g).")

        # Analyze saturated fat (ICMR-NIN benchmark: <= 1.5g low, >= 5.0g high)
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

        # Analyze sodium (ICMR-NIN benchmark: > 400mg or > 0.4g sodium per 100g is high)
        sodium = n.get("sodium")
        salt = n.get("salt")
        if sodium is not None and (sodium > 0.4 or sodium > 400):
            concerns.append("Elevated sodium level per 100g.")
        elif salt is not None and salt >= 1.5:
            concerns.append(f"High salt content ({salt}g per 100g).")

        # Ingredient checks
        ing_text = (req.ingredients_text or "").lower()
        if "palm" in ing_text:
            insights.append("Contains palm oil/palmolein, commonly used in packaged snacks for shelf life.")
        if "maida" in ing_text or "refined wheat" in ing_text:
            insights.append("Contains refined wheat flour (maida), which has lower fiber than whole grains.")
        if "ins" in ing_text or "e" in ing_text or "preservative" in ing_text or "flavor" in ing_text:
            insights.append("Contains standard FSSAI-permitted food additives/preservatives for stability and taste.")

        if not strengths:
            strengths.append("Standard packaged food composition.")
        if not concerns:
            concerns.append("No immediate high-risk nutrient thresholds breached based on reported figures.")
        if not insights:
            insights.append("Ingredients list has been recorded and verified.")

        summary = f"{req.product_name} has an official NutriLens rating of {req.score or 'N/A'}/5.0 (Grade {req.grade or 'N/A'})."
        takeaway = "Review serving sizes and compare with ICMR-NIN recommended daily intakes to balance your diet."

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

    @staticmethod
    def _build_fallback_chat(req: AIChatRequest) -> AIChatResponse:
        answer = (
            f"Regarding {req.product_name}: It has a NutriLens rating of {req.score or 'N/A'}/5.0. "
            f"Always verify nutrition facts per 100g and check ingredients list for palm oil, added sugars, or allergens."
        )
        return AIChatResponse(
            answer=answer,
            is_grounded=True,
            model_used="deterministic-rules-engine (Gemini fallback)"
        )

