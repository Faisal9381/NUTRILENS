from app.services.scoring_engine import NutritionScoringEngine


def test_scoring_healthy_product():
    """Oat milk: low sugars, low saturated fat, low calories."""
    nutrients = {
        "energy_kcal": 61.0,
        "fat": 3.0,
        "saturated_fat": 0.3,
        "carbohydrates": 7.1,
        "sugars": 3.4,
        "fiber": 0.8,
        "proteins": 1.1,
        "salt": 0.1,
        "sodium": 0.04
    }
    result = NutritionScoringEngine.calculate_score(nutrients)
    assert result.is_reliable is True
    assert result.score is not None
    assert result.score >= 4.0  # Grade A
    assert result.grade == "A"
    assert len(result.positive_factors) > 0


def test_scoring_unhealthy_product():
    """Sugary soda / confection: high calories, high sugars, no fiber or protein."""
    nutrients = {
        "energy_kcal": 450.0,
        "fat": 20.0,
        "saturated_fat": 12.0,
        "carbohydrates": 65.0,
        "sugars": 55.0,
        "fiber": 0.0,
        "proteins": 1.0,
        "sodium": 0.3
    }
    result = NutritionScoringEngine.calculate_score(nutrients)
    assert result.is_reliable is True
    assert result.score is not None
    assert result.score <= 2.0  # Grade D or E
    assert result.grade in ["D", "E"]
    assert len(result.negative_factors) >= 2


def test_scoring_insufficient_data():
    """Only protein provided; lacks energy, fat, sugar, sodium."""
    nutrients = {
        "proteins": 20.0,
    }
    result = NutritionScoringEngine.calculate_score(nutrients)
    assert result.is_reliable is False
    assert result.score is None
    assert result.grade == "Insufficient Data"
    assert "Insufficient" in result.summary
