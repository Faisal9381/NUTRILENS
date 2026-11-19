"""
Deterministic Nutritional Scoring Engine
Follows scientific food profile principles inspired by Nutri-Score / FSA criteria,
calibrated into a transparent 0.0 to 5.0 score with detailed sub-score explanations.

RULES:
1. Calculated strictly with deterministic backend logic.
2. Normalized to 100g / 100ml.
3. Negative points awarded for excess energy, sugars, saturated fat, and sodium.
4. Positive points awarded for beneficial components (fiber, protein).
5. Explainable: returns positive and negative contributors and an overall summary.
6. Does NOT invent missing values. If critical nutrients are absent, flags as incomplete.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel


class ScoreContributor(BaseModel):
    nutrient: str
    impact: str  # "positive", "negative", "neutral"
    points: float
    description: str


class NutritionScoreResult(BaseModel):
    score: Optional[float] = None  # 0.0 to 5.0, or None if insufficient data
    max_score: float = 5.0
    grade: str  # "A" (Excellent), "B" (Good), "C" (Moderate), "D" (Poor), "E" (Unfavorable), or "Insufficient Data"
    color: str  # Hex color for mobile UI rendering
    is_reliable: bool
    summary: str
    positive_factors: List[str]
    negative_factors: List[str]
    breakdown: List[ScoreContributor]


class NutritionScoringEngine:
    @classmethod
    def calculate_score(
        cls,
        nutrients: Dict[str, Optional[float]],
        is_beverage: bool = False
    ) -> NutritionScoreResult:
        """
        Calculates deterministic nutrition rating from 0.0 to 5.0.
        """
        energy = nutrients.get("energy_kcal")
        sugars = nutrients.get("sugars")
        sat_fat = nutrients.get("saturated_fat")
        sodium = nutrients.get("sodium")
        fiber = nutrients.get("fiber")
        protein = nutrients.get("proteins")

        # 1. Check Data Sufficiency
        # We need at least energy, plus at least 2 of (sugars, sat_fat, sodium)
        present_negatives = [v is not None for v in [sugars, sat_fat, sodium]]
        if energy is None or sum(present_negatives) < 2:
            return NutritionScoreResult(
                score=None,
                max_score=5.0,
                grade="Insufficient Data",
                color="#9CA3AF",
                is_reliable=False,
                summary="Insufficient nutritional information reported to calculate a reliable score.",
                positive_factors=[],
                negative_factors=[],
                breakdown=[]
            )

        negative_points = 0.0
        positive_points = 0.0
        contributors: List[ScoreContributor] = []
        positive_factors: List[str] = []
        negative_factors: List[str] = []

        # -------------------------------------------------------------
        # Negative Factors (Max ~40 points)
        # -------------------------------------------------------------
        # A. Energy (per 100g)
        energy_pts = 0
        if energy is not None:
            # 80 kcal threshold per point (up to 10 points at 800+ kcal)
            energy_pts = min(10, int(energy / 80))
            negative_points += energy_pts
            if energy_pts >= 5:
                desc = f"High calorie density ({energy} kcal / 100g)"
                negative_factors.append(desc)
                contributors.append(ScoreContributor(nutrient="Energy", impact="negative", points=energy_pts, description=desc))
            else:
                contributors.append(ScoreContributor(nutrient="Energy", impact="neutral", points=energy_pts, description=f"Moderate calories ({energy} kcal / 100g)"))

        # B. Sugars (per 100g)
        sugars_pts = 0
        if sugars is not None:
            # Thresholds: <=4.5g (0 pts), up to >45g (10 pts)
            sugars_pts = min(10, int(sugars / 4.5))
            negative_points += sugars_pts
            if sugars_pts >= 3:
                desc = f"Elevated sugar content ({sugars}g / 100g)"
                negative_factors.append(desc)
                contributors.append(ScoreContributor(nutrient="Sugars", impact="negative", points=sugars_pts, description=desc))
            elif sugars <= 5.0:
                positive_factors.append(f"Low sugar ({sugars}g / 100g)")
                contributors.append(ScoreContributor(nutrient="Sugars", impact="positive", points=sugars_pts, description=f"Low in sugars ({sugars}g / 100g)"))
            else:
                contributors.append(ScoreContributor(nutrient="Sugars", impact="neutral", points=sugars_pts, description=f"Moderate sugar ({sugars}g / 100g)"))

        # C. Saturated Fat (per 100g)
        sat_fat_pts = 0
        if sat_fat is not None:
            # 1 point per 1g (up to 10 points)
            sat_fat_pts = min(10, int(sat_fat / 1.0))
            negative_points += sat_fat_pts
            if sat_fat_pts >= 3:
                desc = f"High saturated fat ({sat_fat}g / 100g)"
                negative_factors.append(desc)
                contributors.append(ScoreContributor(nutrient="Saturated Fat", impact="negative", points=sat_fat_pts, description=desc))
            elif sat_fat <= 1.5:
                positive_factors.append(f"Low saturated fat ({sat_fat}g / 100g)")
                contributors.append(ScoreContributor(nutrient="Saturated Fat", impact="positive", points=sat_fat_pts, description=f"Low saturated fat ({sat_fat}g / 100g)"))
            else:
                contributors.append(ScoreContributor(nutrient="Saturated Fat", impact="neutral", points=sat_fat_pts, description=f"Moderate saturated fat ({sat_fat}g / 100g)"))

        # D. Sodium (per 100g, where 1g sodium ~ 2.5g salt)
        sodium_pts = 0
        if sodium is not None:
            # 90mg sodium (0.09g) per point, max 10
            sodium_mg = sodium if sodium > 1.0 else sodium * 1000.0
            sodium_pts = min(10, int(sodium_mg / 90.0))
            negative_points += sodium_pts
            if sodium_pts >= 4:
                desc = f"High sodium ({round(sodium_mg, 1)}mg / 100g)"
                negative_factors.append(desc)
                contributors.append(ScoreContributor(nutrient="Sodium", impact="negative", points=sodium_pts, description=desc))
            elif sodium_mg <= 120.0:
                positive_factors.append("Low sodium content")
                contributors.append(ScoreContributor(nutrient="Sodium", impact="positive", points=sodium_pts, description="Low sodium"))
            else:
                contributors.append(ScoreContributor(nutrient="Sodium", impact="neutral", points=sodium_pts, description=f"Moderate sodium ({round(sodium_mg, 1)}mg)"))

        # -------------------------------------------------------------
        # Positive Factors (Max ~10 points)
        # -------------------------------------------------------------
        # E. Dietary Fiber (per 100g)
        if fiber is not None:
            # 1 point per ~0.9g fiber (up to 5 points)
            fiber_pts = min(5, int(fiber / 0.9))
            positive_points += fiber_pts
            if fiber_pts >= 2:
                desc = f"Good source of dietary fiber ({fiber}g / 100g)"
                positive_factors.append(desc)
                contributors.append(ScoreContributor(nutrient="Fiber", impact="positive", points=fiber_pts, description=desc))

        # F. Protein (per 100g)
        if protein is not None:
            # 1 point per 1.6g protein (up to 5 points)
            protein_pts = min(5, int(protein / 1.6))
            positive_points += protein_pts
            if protein_pts >= 2:
                desc = f"Beneficial protein content ({protein}g / 100g)"
                positive_factors.append(desc)
                contributors.append(ScoreContributor(nutrient="Protein", impact="positive", points=protein_pts, description=desc))

        # -------------------------------------------------------------
        # Net Calculation & Mapping to 0.0 - 5.0
        # -------------------------------------------------------------
        # Net penalty score ranges from ~ -10 (very healthy) to +40 (very unhealthy)
        net_penalty = negative_points - positive_points

        # Map to 5.0 scale:
        # <= -3  -> 5.0 (Excellent)
        #  0     -> 4.5
        #  5     -> 3.8
        #  10    -> 3.0
        #  15    -> 2.2
        #  20    -> 1.5
        #  >=25  -> 0.5 to 1.0
        if net_penalty <= -3:
            raw_score = 5.0
        elif net_penalty <= 0:
            raw_score = 4.5 + (abs(net_penalty) / 3.0) * 0.5
        elif net_penalty <= 10:
            raw_score = 4.5 - (net_penalty / 10.0) * 1.5  # 4.5 down to 3.0
        elif net_penalty <= 20:
            raw_score = 3.0 - ((net_penalty - 10) / 10.0) * 1.5  # 3.0 down to 1.5
        else:
            raw_score = max(0.5, 1.5 - ((net_penalty - 20) / 15.0) * 1.0)

        final_score = round(raw_score, 1)

        # Determine Letter Grade & Aesthetic Color
        if final_score >= 4.0:
            grade = "A"
            color = "#16A34A"  # Green
            summary = "Excellent nutritional quality with low negative markers and healthy components."
        elif final_score >= 3.0:
            grade = "B"
            color = "#65A30D"  # Light Green / Lime
            summary = "Good nutritional profile with balanced macros."
        elif final_score >= 2.0:
            grade = "C"
            color = "#D97706"  # Amber
            summary = "Moderate nutritional quality; observe sugar or saturated fat intake."
        elif final_score >= 1.0:
            grade = "D"
            color = "#EA580C"  # Orange
            summary = "Less favorable nutritional composition; typically elevated in sugars, fat, or salt."
        else:
            grade = "E"
            color = "#DC2626"  # Red
            summary = "Poor nutritional profile with high concentrations of sugar, saturated fat, or sodium."

        return NutritionScoreResult(
            score=final_score,
            max_score=5.0,
            grade=grade,
            color=color,
            is_reliable=True,
            summary=summary,
            positive_factors=positive_factors,
            negative_factors=negative_factors,
            breakdown=contributors
        )
