import { API_BASE_URL, API_ENDPOINTS } from '../constants/api';
import { Product, ProductLookupResult } from '../types/product';
import { NutritionScoreResult, OCRParseResult } from '../types/nutrition';
import { ProductAIExplanation, ProductAIComparison } from '../types/ai';

export interface DatabaseHealthInfo {
  status: 'connected' | 'disconnected';
  host: string;
  database: string;
  error?: string;
}

export interface HealthCheckResponse {
  status: string;
  app_name: string;
  version: string;
  database: DatabaseHealthInfo;
  environment: string;
}

export interface ApiCallResult<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

/**
 * Check backend server availability and database connectivity.
 */
export async function checkBackendHealth(): Promise<ApiCallResult<HealthCheckResponse>> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(API_ENDPOINTS.HEALTH, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        data: null,
        error: `Backend responded with HTTP status ${response.status}`,
        success: false,
      };
    }

    const data: HealthCheckResponse = await response.json();
    return { data, error: null, success: true };
  } catch (err: any) {
    let errorMessage = 'Could not reach backend server.';
    if (err.name === 'AbortError') {
      errorMessage = 'Connection timed out. Ensure the backend is running.';
    } else if (err.message) {
      errorMessage = err.message;
    }
    return { data: null, error: errorMessage, success: false };
  }
}

/**
 * Fetch product details by barcode via FastAPI backend.
 */
export async function fetchProductByBarcode(barcode: string): Promise<ProductLookupResult> {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) {
    return {
      product: null,
      notFound: false,
      error: 'Please enter or scan a valid barcode.',
      success: false,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const url = `${API_BASE_URL}/api/v1/products/barcode/${encodeURIComponent(cleanBarcode)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return {
        product: null,
        notFound: true,
        error: `Product with barcode "${cleanBarcode}" was not found in Open Food Facts.`,
        success: false,
      };
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        product: null,
        notFound: false,
        error: errData.detail || `Server returned error (${response.status})`,
        success: false,
      };
    }

    const product: Product = await response.json();
    return {
      product,
      notFound: false,
      error: null,
      success: true,
    };
  } catch (err: any) {
    let errorMessage = 'Failed to connect to NutriLens backend.';
    if (err.name === 'AbortError') {
      errorMessage = 'Lookup timed out. Please check your network connection.';
    } else if (err.message) {
      errorMessage = err.message;
    }
    return {
      product: null,
      notFound: false,
      error: errorMessage,
      success: false,
    };
  }
}

/**
 * Request deterministic nutrition rating (0.0 to 5.0) from backend engine.
 */
export async function calculateNutritionScore(
  nutrients: Record<string, number | null | undefined>,
  isBeverage: boolean = false
): Promise<ApiCallResult<NutritionScoreResult>> {
  try {
    const response = await fetch(API_ENDPOINTS.NUTRITION_SCORE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        nutrients_per_100g: nutrients,
        is_beverage: isBeverage,
      }),
    });

    if (!response.ok) {
      return {
        data: null,
        error: `Scoring failed with HTTP status ${response.status}`,
        success: false,
      };
    }

    const result: NutritionScoreResult = await response.json();
    return { data: result, error: null, success: true };
  } catch (err: any) {
    return {
      data: null,
      error: err.message || 'Failed to calculate nutritional score.',
      success: false,
    };
  }
}

/**
 * Parse raw nutrition facts text or transcribed values.
 */
export async function parseNutritionText(text: string): Promise<ApiCallResult<OCRParseResult>> {
  try {
    const response = await fetch(API_ENDPOINTS.PARSE_TEXT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      return {
        data: null,
        error: `OCR parsing failed (${response.status})`,
        success: false,
      };
    }

    const result: OCRParseResult = await response.json();
    return { data: result, error: null, success: true };
  } catch (err: any) {
    return {
      data: null,
      error: err.message || 'Failed to parse nutrition label text.',
      success: false,
    };
  }
}

/**
 * Request Gemini AI explanation for verified product information.
 * Always passes verified numbers and official score to the backend.
 */
export async function fetchAIExplanation(
  product: Product,
  score?: number | null,
  grade?: string | null
): Promise<ApiCallResult<ProductAIExplanation>> {
  try {
    const response = await fetch(API_ENDPOINTS.AI_EXPLAIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        product_name: product.product_name,
        brand: product.brand,
        categories: product.categories,
        serving_size: product.serving_size,
        ingredients_text: product.ingredients_text,
        allergens_text: product.allergens_text,
        nutrients_per_100g: product.nutrients_per_100g,
        score: score,
        grade: grade,
      }),
    });

    if (!response.ok) {
      return {
        data: null,
        error: `AI explanation failed (${response.status})`,
        success: false,
      };
    }

    const result: ProductAIExplanation = await response.json();
    return { data: result, error: null, success: true };
  } catch (err: any) {
    return {
      data: null,
      error: err.message || 'Failed to reach AI explanation service.',
      success: false,
    };
  }
}
