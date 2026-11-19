# System Architecture Document
## Project: NutriLens

### 1. High-Level Architecture
NutriLens follows a strict tiered mobile-first architecture:

```
[ React Native / Expo Mobile App ]
                │
         HTTPS / REST API
                ▼
      [ FastAPI Backend ]
        ├── Auth / Routing Layer
        ├── Business Logic (Scoring Engine, OCR Handler)
        ├── ORM Layer (SQLAlchemy 2.0)
        └── Integrations
              ├── PostgreSQL Database (Primary Store & Cache)
              ├── Open Food Facts API (Product Data)
              └── Google Gemini API (AI Explanations)
```

### 2. Frontend Architecture (Mobile)
- **Framework:** React Native with Expo SDK 52+ & TypeScript.
- **Routing:** Expo Router (file-based navigation with tabs and nested stacks).
- **Styling:** React Native standard StyleSheet with cohesive design tokens (clean white and soft green palette `#2E7D32`, `#E8F5E9`, `#FAFAFA`).
- **State & Networking:** Standard fetch/Axios service modules with centralized configuration for API Base URL (`EXPO_PUBLIC_API_URL`).

### 3. Backend Architecture
- **Framework:** FastAPI (Python 3.10+ / 3.14).
- **Persistence:** SQLAlchemy 2.0 ORM with asynchronous/synchronous engine support and Alembic migrations.
- **Config Management:** `pydantic-settings` reading from `.env` files.
- **Validation:** Pydantic v2 schemas for all request/response models.

### 4. Data Flow
1. **Scanning:** Mobile scanner reads barcode -> sends request to `POST /api/v1/products/scan/{barcode}`.
2. **Resolution:** Backend checks PostgreSQL cache. On cache miss, queries Open Food Facts API, parses & standardizes fields, persists into PostgreSQL, and returns data to mobile.
3. **Scoring:** The backend scoring engine evaluates nutrient thresholds per 100g/ml and outputs a score (0.0 to 5.0) with granular sub-scores.
4. **AI Synthesis:** If requested, backend prompts Google Gemini with verified product facts and returns synthesized explanations.
