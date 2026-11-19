export interface NutrientsPer100g {
  [key: string]: number | null | undefined;
  energy_kcal?: number | null;
  fat?: number | null;
  saturated_fat?: number | null;
  carbohydrates?: number | null;
  sugars?: number | null;
  added_sugars?: number | null;
  fiber?: number | null;
  proteins?: number | null;
  salt?: number | null;
  sodium?: number | null;
}

export interface Product {
  id?: number | null;
  barcode: string;
  product_name: string;
  brand?: string | null;
  categories?: string | null;
  serving_size?: string | null;
  image_url?: string | null;
  ingredients_text?: string | null;
  allergens_text?: string | null;
  nutrients_per_100g: NutrientsPer100g;
  source: string;
  cached: boolean;
  created_at?: string | null;
}

export interface ProductLookupResult {
  product: Product | null;
  notFound: boolean;
  error: string | null;
  success: boolean;
}
