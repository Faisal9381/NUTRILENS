export interface ProductAIExplanation {
  summary: string;
  key_strengths: string[];
  areas_of_concern: string[];
  ingredient_insights: string[];
  consumer_takeaway: string;
  is_grounded: boolean;
  model_used: string;
}

export interface ProductAIComparison {
  overview: string;
  product_a_advantages: string[];
  product_b_advantages: string[];
  key_differences: string[];
  recommendation: string;
  model_used: string;
}
