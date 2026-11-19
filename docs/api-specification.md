# API Specification
## Project: NutriLens REST API

### Base URL
- Local Development: `http://<HOST_IP>:8000`
- Android Emulator: `http://10.0.2.2:8000`
- API Prefix: `/api/v1`

---

### Endpoints Overview

#### 1. System Health
- **`GET /health`**
  - **Description:** Returns API operational status and database connection state.
  - **Response 200 OK:**
    ```json
    {
      "status": "healthy",
      "app_name": "NutriLens API",
      "version": "0.1.0",
      "database": "connected" // or "disconnected" / "unreachable"
    }
    ```

#### 2. Products (Implemented in Step 2)
- **`GET /api/v1/products/barcode/{barcode}`**
  - **Description:** Looks up a product by barcode. First checks the PostgreSQL database cache; if not found, queries Open Food Facts API v2, parses and normalizes the nutritional facts per 100g/ml, caches the result in PostgreSQL (when connected), and returns the product.
  - **Responses:**
    - `200 OK`:
      ```json
      {
        "id": 1,
        "barcode": "7394376616037",
        "product_name": "iKaffe",
        "brand": "Oatly",
        "categories": "Kaurajuomat",
        "serving_size": "1 portion (100 ml)",
        "image_url": "https://images.openfoodfacts.org/images/products/...",
        "ingredients_text": "Vesi, kaura 10%, rapsiöljy...",
        "allergens_text": "gluteeni",
        "nutrients_per_100g": {
          "energy_kcal": 61.0,
          "fat": 3.0,
          "saturated_fat": 0.3,
          "carbohydrates": 7.1,
          "sugars": 3.4,
          "added_sugars": 0.0,
          "fiber": 0.8,
          "proteins": 1.1,
          "salt": 0.1,
          "sodium": 0.04
        },
        "source": "open_food_facts",
        "cached": true,
        "created_at": "2026-11-19T21:30:00Z"
      }
      ```
    - `404 Not Found`:
      ```json
      {
        "detail": "Product with barcode '0000000000000' could not be found."
      }
      ```

#### 3. Nutrition Analysis & Scoring (Implemented in Step 3)
- **`POST /api/v1/nutrition/score`**
  - **Description:** Deterministic nutritional scoring engine that maps verified 100g/ml metrics into a 0.0 to 5.0 score with letter grades (A through E), color codes, positive factors, negative factors, and granular nutrient contributor breakdowns.
  - **Request Body:**
    ```json
    {
      "nutrients_per_100g": {
        "energy_kcal": 61.0,
        "fat": 3.0,
        "saturated_fat": 0.3,
        "carbohydrates": 7.1,
        "sugars": 3.4,
        "fiber": 0.8,
        "proteins": 1.1,
        "sodium": 0.04
      },
      "is_beverage": false
    }
    ```
  - **Response 200 OK:**
    ```json
    {
      "score": 4.5,
      "max_score": 5.0,
      "grade": "A",
      "color": "#16A34A",
      "is_reliable": true,
      "summary": "Excellent nutritional quality with low negative markers and healthy components.",
      "positive_factors": [
        "Low sugar (3.4g / 100g)",
        "Low saturated fat (0.3g / 100g)",
        "Low sodium content"
      ],
      "negative_factors": [],
      "breakdown": [...]
    }
    ```

- **`POST /api/v1/nutrition/parse-text`**
  - **Description:** Parses raw label text or transcribed values, extracting energy, macros, serving size, and ingredients, while identifying missing and uncertain values for review.

- **`POST /api/v1/nutrition/ocr-image`**
  - **Description:** Accepts uploaded nutrition label image files (JPEG/PNG/WebP), executes OCR extraction, and returns structured nutrients.

#### 4. AI Insights (Planned for Step 4)
- **`POST /api/v1/ai/explain`**
  - Request Gemini AI plain-language summary for verified nutritional data.
- **`POST /api/v1/ai/compare`**
  - Request Gemini AI comparison breakdown between two verified products.

#### 5. User & History (Planned for Step 5)
- **`GET /api/v1/users/history`**
  - Retrieve scanned product history for authenticated or session-based user.
