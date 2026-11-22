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

/**
 * Ask a grounded question about a specific product.
 */
export async function fetchAIChat(
  product: Product,
  question: string,
  score?: number | null,
  grade?: string | null
): Promise<ApiCallResult<{ answer: string; is_grounded: boolean; model_used: string }>> {
  try {
    const response = await fetch(API_ENDPOINTS.AI_CHAT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        product_name: product.product_name,
        brand: product.brand,
        categories: product.categories,
        ingredients_text: product.ingredients_text,
        allergens_text: product.allergens_text,
        nutrients_per_100g: product.nutrients_per_100g,
        score: score,
        grade: grade,
        question: question,
      }),
    });

    if (!response.ok) {
      return {
        data: null,
        error: `AI Chat request failed (${response.status})`,
        success: false,
      };
    }

    const result = await response.json();
    return { data: result, error: null, success: true };
  } catch (err: any) {
    return {
      data: null,
      error: err.message || 'Failed to reach AI Chat service.',
      success: false,
    };
  }
}

/**
 * Request side-by-side AI comparison for two products per 100g/ml.
 */
export async function fetchAIComparison(
  productA: Product,
  scoreA: number | null,
  gradeA: string | null,
  productB: Product,
  scoreB: number | null,
  gradeB: string | null
): Promise<ApiCallResult<ProductAIComparison>> {
  try {
    const response = await fetch(API_ENDPOINTS.AI_COMPARE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        product_a: {
          product_name: productA.product_name,
          brand: productA.brand,
          categories: productA.categories,
          serving_size: productA.serving_size,
          ingredients_text: productA.ingredients_text,
          allergens_text: productA.allergens_text,
          nutrients_per_100g: productA.nutrients_per_100g,
          score: scoreA,
          grade: gradeA,
        },
        product_b: {
          product_name: productB.product_name,
          brand: productB.brand,
          categories: productB.categories,
          serving_size: productB.serving_size,
          ingredients_text: productB.ingredients_text,
          allergens_text: productB.allergens_text,
          nutrients_per_100g: productB.nutrients_per_100g,
          score: scoreB,
          grade: gradeB,
        },
      }),
    });

    if (!response.ok) {
      return {
        data: null,
        error: `AI comparison failed (${response.status})`,
        success: false,
      };
    }

    const result: ProductAIComparison = await response.json();
    return { data: result, error: null, success: true };
  } catch (err: any) {
    return {
      data: null,
      error: err.message || 'Failed to reach AI comparison service.',
      success: false,
    };
  }
}

/**
 * Register a new user account.
 */
export async function registerUser(
  payload: any
): Promise<ApiCallResult<{ access_token: string; token_type: string }>> {
  try {
    const response = await fetch(API_ENDPOINTS.AUTH_REGISTER, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: errData.detail || `Registration failed (${response.status})`,
        success: false,
      };
    }

    const result = await response.json();
    return { data: result, error: null, success: true };
  } catch (err: any) {
    return {
      data: null,
      error: err.message || 'Failed to reach authentication server.',
      success: false,
    };
  }
}

/**
 * Login user with email and password.
 */
export async function loginUser(
  payload: any
): Promise<ApiCallResult<{ access_token: string; token_type: string }>> {
  try {
    const response = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: errData.detail || `Login failed (${response.status})`,
        success: false,
      };
    }

    const result = await response.json();
    return { data: result, error: null, success: true };
  } catch (err: any) {
    return {
      data: null,
      error: err.message || 'Failed to reach authentication server.',
      success: false,
    };
  }
}

/**
 * Login or register user with Google OAuth payload.
 */
export async function loginGoogleUser(
  payload: { email: string; name?: string; google_id?: string; id_token?: string }
): Promise<ApiCallResult<{ access_token: string; token_type: string }>> {
  try {
    const response = await fetch(API_ENDPOINTS.AUTH_GOOGLE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: errData.detail || `Google login failed (${response.status})`,
        success: false,
      };
    }

    const result = await response.json();
    return { data: result, error: null, success: true };
  } catch (err: any) {
    return {
      data: null,
      error: err.message || 'Failed to reach authentication server for Google Sign In.',
      success: false,
    };
  }
}

/**
 * Fetch authenticated user profile.
 */
export async function fetchUserProfile(token: string): Promise<ApiCallResult<any>> {
  try {
    const response = await fetch(API_ENDPOINTS.AUTH_ME, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return {
        data: null,
        error: `Failed to fetch profile (${response.status})`,
        success: false,
      };
    }

    const result = await response.json();
    return { data: result, error: null, success: true };
  } catch (err: any) {
    return {
      data: null,
      error: err.message || 'Failed to fetch user profile.',
      success: false,
    };
  }
}

/**
 * Update authenticated user profile.
 */
export async function updateUserProfile(payload: any, token: string): Promise<ApiCallResult<any>> {
  try {
    const response = await fetch(API_ENDPOINTS.AUTH_ME, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        data: null,
        error: errData.detail || `Failed to update profile (${response.status})`,
        success: false,
      };
    }

    const result = await response.json();
    return { data: result, error: null, success: true };
  } catch (err: any) {
    return {
      data: null,
      error: err.message || 'Failed to update profile.',
      success: false,
    };
  }
}


