from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from typing import Optional
from app.schemas.nutrition import (
    CalculateScoreRequest,
    NutritionScoreResult,
    OCRParseTextRequest,
    OCRParseTextResponse,
)
from app.services.scoring_engine import NutritionScoringEngine
from app.services.ocr_service import LabelOCRService

router = APIRouter(prefix="/nutrition", tags=["Nutrition Analysis & Scoring"])


@router.post("/score", response_model=NutritionScoreResult)
def calculate_nutritional_score(payload: CalculateScoreRequest):
    """
    Deterministic Nutritional Rating (0.0 to 5.0).
    Evaluates energy, sugars, saturated fat, sodium, fiber, and protein.
    Never calculated or invented by AI.
    """
    return NutritionScoringEngine.calculate_score(
        nutrients=payload.nutrients_per_100g,
        is_beverage=payload.is_beverage
    )


@router.post("/parse-text", response_model=OCRParseTextResponse)
def parse_label_text(payload: OCRParseTextRequest):
    """
    Extracts structured nutrition facts from raw text or transcribed labels.
    Highlights missing and uncertain fields for user correction.
    """
    if not payload.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text payload cannot be empty."
        )
    return LabelOCRService.parse_text(payload.text)


@router.post("/ocr-image", response_model=OCRParseTextResponse)
async def process_label_image(file: UploadFile = File(...)):
    """
    Processes an uploaded nutrition label image using OCR.
    Extracts macronutrients, serving size, ingredients, and identifies uncertain values.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be an image (JPEG, PNG, WebP)."
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image size exceeds 10MB limit."
        )

    return await LabelOCRService.process_image_bytes(content)
