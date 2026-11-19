export interface ScoreContributor {
  nutrient: string;
  impact: 'positive' | 'negative' | 'neutral';
  points: number;
  description: string;
}

export interface NutritionScoreResult {
  score: number | null;
  max_score: number;
  grade: string;
  color: string;
  is_reliable: boolean;
  summary: string;
  positive_factors: string[];
  negative_factors: string[];
  breakdown: ScoreContributor[];
}

export interface OCRParseResult {
  raw_text: string;
  nutrients_per_100g: Record<string, number | null>;
  serving_size: string | null;
  ingredients_text: string | null;
  allergens_text: string | null;
  missing_fields: string[];
  uncertain_fields: string[];
}
