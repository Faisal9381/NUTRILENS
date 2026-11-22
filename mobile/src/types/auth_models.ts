export interface UserProfile {
  id: number;
  email: string;
  age_group?: string | null;
  dietary_preferences?: string[] | null;
  allergies?: string[] | null;
  activity_level?: string | null;
  nutritional_preferences?: Record<string, boolean> | null;
}

export interface UserRegisterPayload {
  email: string;
  password: string;
  age_group?: string;
  dietary_preferences?: string[];
  allergies?: string[];
  activity_level?: string;
  nutritional_preferences?: Record<string, boolean>;
}

export interface UserLoginPayload {
  email: string;
  password: string;
}

export interface UserUpdatePayload {
  age_group?: string | null;
  dietary_preferences?: string[] | null;
  allergies?: string[] | null;
  activity_level?: string | null;
  nutritional_preferences?: Record<string, boolean> | null;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
}

export interface ScanHistoryItem {
  id: number;
  barcode: string;
  product_name?: string | null;
  brand?: string | null;
  image_url?: string | null;
  nutrition_score?: number | null;
  nutrition_grade?: string | null;
  nutrients_snapshot?: Record<string, number | null> | null;
  scan_source?: string;
  scanned_at: string;
}
