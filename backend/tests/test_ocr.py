from app.services.ocr_service import LabelOCRService


def test_ocr_label_text_parser():
    sample_text = """
    Nutrition Facts
    Serving Size: 30g
    Calories: 140 kcal
    Total Fat: 8g
    Saturated Fat: 1.5g
    Total Carbohydrate: 15g
    Total Sugars: 9g
    Dietary Fiber: 2g
    Protein: 3g
    Sodium: 110mg
    Ingredients: Whole grain rolled oats, brown sugar, canola oil.
    Allergens: Contains oats.
    """

    parsed = LabelOCRService.parse_text(sample_text)
    assert parsed.nutrients_per_100g["energy_kcal"] == 140.0
    assert parsed.nutrients_per_100g["fat"] == 8.0
    assert parsed.nutrients_per_100g["saturated_fat"] == 1.5
    assert parsed.nutrients_per_100g["carbohydrates"] == 15.0
    assert parsed.nutrients_per_100g["sugars"] == 9.0
    assert parsed.nutrients_per_100g["fiber"] == 2.0
    assert parsed.nutrients_per_100g["proteins"] == 3.0
    assert parsed.nutrients_per_100g["sodium"] == 110.0
    assert "30g" in parsed.serving_size
    assert "Whole grain rolled oats" in parsed.ingredients_text
    assert "Contains oats" in parsed.allergens_text
