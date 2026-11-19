# Software Requirements Specification (SRS)
## Project: NutriLens (Temporary Name)

### 1. Introduction
NutriLens is a mobile-only application designed to empower consumers to understand the nutritional composition of packaged food products. Packaged food labels present complex, fine-print data (calories, macro-nutrients, sodium, additives, allergens). NutriLens simplifies this through barcode scanning, OCR label extraction, deterministic nutritional scoring, and Google Gemini AI-driven explanations.

### 2. Overall Description
- **Target Audience:** Teenagers, adults, and health-conscious consumers.
- **Platform Scope:** Exclusive to Android and iOS mobile environments (built via React Native and Expo). There is **no web application frontend**.
- **Backend Role:** REST API built using FastAPI serving the mobile client. It handles database persistence (PostgreSQL), barcode resolution (Open Food Facts), OCR processing, nutritional rating calculation, and Gemini integration.

### 3. System Features & Requirements

#### 3.1 Barcode Scanning & Product Lookup
- **FR-1.1:** The user shall scan standard product barcodes (EAN-13, UPC-A, etc.) via the device camera.
- **FR-1.2:** The backend shall query the Open Food Facts API and cache product details in PostgreSQL.
- **FR-1.3:** If a product is not found, the app shall offer nutritional label capture as a fallback.

#### 3.2 Nutrition Label Photography & OCR
- **FR-2.1:** Users can take a photo of nutrition fact panels and ingredient lists.
- **FR-2.2:** Backend/OCR extracts macro/micronutrient figures, serving size, and ingredients.
- **FR-2.3:** Extracted values are presented to the user for review and manual correction before saving.

#### 3.3 Nutritional Rating & Analysis
- **FR-3.1:** The backend shall calculate a deterministic rating out of 5 based on verified nutritional metrics per 100g/100ml.
- **FR-3.2:** Gemini AI shall NOT calculate the official score; the score calculation is strictly rule-based, transparent, and reproducible.
- **FR-3.3:** Serving sizes must be displayed separately from normalized 100g/100ml comparisons.
- **FR-3.4:** When nutritional data is incomplete, the system must clearly state that a reliable score cannot be computed instead of fabricating values.

#### 3.4 AI-Powered Explanations (Google Gemini)
- **FR-4.1:** Gemini provides plain-language summaries of nutrients, additives, pros, and cons.
- **FR-4.2:** Explanations are strictly grounded in verified facts. Gemini must never invent data or issue medical advice/prescriptions.

#### 3.5 Product Comparison & Scan History
- **FR-5.1:** Enable side-by-side comparison of two products normalized to 100g/100ml.
- **FR-5.2:** Maintain a chronological scan history locally or linked to user accounts.

### 4. Non-Functional Requirements
- **Performance:** Barcode query response cached or returned within 2 seconds under standard network conditions.
- **Security:** Gemini API keys and database credentials strictly stored in backend environment variables. Mobile communicates only with FastAPI.
- **Reliability:** Graceful offline/error handling when network connectivity drops or services fail.
- **Usability:** Clean, accessible mobile-first interface adhering to soft-green and clean white aesthetics.
