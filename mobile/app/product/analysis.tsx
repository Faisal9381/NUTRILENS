import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing } from '../../src/constants/theme';
import { Product } from '../../src/types/product';
import { NutritionScoreResult } from '../../src/types/nutrition';
import { ProductAIExplanation } from '../../src/types/ai';
import {
  fetchProductByBarcode,
  calculateNutritionScore,
  fetchAIExplanation,
} from '../../src/services/apiClient';

export default function ProductAnalysisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ productJson?: string; barcode?: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [scoreData, setScoreData] = useState<NutritionScoreResult | null>(null);
  const [aiData, setAiData] = useState<ProductAIExplanation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [scoreLoading, setScoreLoading] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.productJson) {
      try {
        const parsed: Product = JSON.parse(params.productJson);
        setProduct(parsed);
        fetchScoreAndAI(parsed);
      } catch (e) {
        setError('Failed to load product data.');
      }
    } else if (params.barcode) {
      loadByBarcode(params.barcode);
    }
  }, [params.productJson, params.barcode]);

  const loadByBarcode = async (barcode: string) => {
    setLoading(true);
    setError(null);
    const result = await fetchProductByBarcode(barcode);
    setLoading(false);

    if (result.success && result.product) {
      setProduct(result.product);
      fetchScoreAndAI(result.product);
    } else {
      setError(result.error || 'Product not found.');
    }
  };

  const fetchScoreAndAI = async (prod: Product) => {
    setScoreLoading(true);
    const scoreRes = await calculateNutritionScore(prod.nutrients_per_100g);
    setScoreLoading(false);

    let currentScore: number | null = null;
    let currentGrade: string | null = null;

    if (scoreRes.success && scoreRes.data) {
      setScoreData(scoreRes.data);
      currentScore = scoreRes.data.score;
      currentGrade = scoreRes.data.grade;
    }

    // Now request Gemini AI Explanation grounded in verified facts and official score
    setAiLoading(true);
    setAiError(null);
    const aiRes = await fetchAIExplanation(prod, currentScore, currentGrade);
    setAiLoading(false);

    if (aiRes.success && aiRes.data) {
      setAiData(aiRes.data);
    } else {
      setAiError(aiRes.error || 'Unable to generate AI explanation.');
    }
  };

  const handleRetryAI = () => {
    if (product) {
      fetchScoreAndAI(product);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Fetching product nutrition...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyEmoji}>🔍</Text>
        <Text style={styles.emptyTitle}>No Product Selected</Text>
        <Text style={styles.emptyBody}>
          {error || 'Scan a packaged food barcode or capture a label to view its verified nutrition facts.'}
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(tabs)/scanner')}
        >
          <Text style={styles.primaryButtonText}>Open Scanner</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { nutrients_per_100g: n } = product;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Product Summary Card */}
      <View style={styles.card}>
        <View style={styles.productRow}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderEmoji}>🥫</Text>
            </View>
          )}

          <View style={styles.productDetails}>
            <Text style={styles.productName}>{product.product_name}</Text>
            {product.brand && <Text style={styles.brandName}>{product.brand}</Text>}
            <Text style={styles.barcodeLabel}>Barcode: {product.barcode}</Text>
            {product.serving_size && (
              <View style={styles.servingBadge}>
                <Text style={styles.servingText}>Serving: {product.serving_size}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Source & Cache Badge */}
        <View style={styles.badgeRow}>
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>Source: {product.source}</Text>
          </View>
          {product.cached && (
            <View style={styles.cachedBadge}>
              <Text style={styles.cachedBadgeText}>⚡ Cached in PostgreSQL</Text>
            </View>
          )}
        </View>
      </View>

      {/* Deterministic Nutritional Score (0.0 to 5.0) */}
      <View style={styles.card}>
        <View style={styles.scoreHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Nutritional Score</Text>
            <Text style={styles.sectionSubtitle}>
              Deterministic backend rating out of 5.0
            </Text>
          </View>
          {scoreData?.grade && scoreData.grade !== 'Insufficient Data' && (
            <View style={[styles.gradeBadge, { backgroundColor: scoreData.color }]}>
              <Text style={styles.gradeBadgeText}>Grade {scoreData.grade}</Text>
            </View>
          )}
        </View>

        {scoreLoading ? (
          <View style={styles.scoreLoadingBox}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.scoreLoadingText}>Calculating score...</Text>
          </View>
        ) : scoreData?.is_reliable ? (
          <View>
            <View style={styles.scoreDisplayBox}>
              <Text style={[styles.scoreValue, { color: scoreData.color }]}>
                {scoreData.score?.toFixed(1)}
              </Text>
              <Text style={styles.scoreMax}>/ 5.0</Text>
            </View>
            <Text style={styles.scoreSummary}>{scoreData.summary}</Text>

            {/* Positive & Negative Factors */}
            <View style={styles.factorsContainer}>
              {scoreData.positive_factors.map((factor, idx) => (
                <View key={`pos-${idx}`} style={styles.factorItem}>
                  <Text style={styles.factorIcon}>✅</Text>
                  <Text style={styles.factorText}>{factor}</Text>
                </View>
              ))}
              {scoreData.negative_factors.map((factor, idx) => (
                <View key={`neg-${idx}`} style={styles.factorItem}>
                  <Text style={styles.factorIcon}>⚠️</Text>
                  <Text style={styles.factorText}>{factor}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.insufficientBox}>
            <Text style={styles.insufficientTitle}>Insufficient Data</Text>
            <Text style={styles.insufficientText}>
              {scoreData?.summary || 'Not enough nutritional figures to compute a reliable score.'}
            </Text>
          </View>
        )}
      </View>

      {/* Google Gemini AI Nutritional Intelligence Card (Step 4) */}
      <View style={styles.aiCard}>
        <View style={styles.aiHeaderRow}>
          <View style={styles.aiTitleGroup}>
            <Text style={styles.aiBadge}>✨ Gemini AI Nutritional Intelligence</Text>
            <Text style={styles.aiSubtitle}>Plain-language breakdown grounded in verified data</Text>
          </View>
          {aiData && (
            <View style={styles.groundedBadge}>
              <Text style={styles.groundedBadgeText}>100% Grounded</Text>
            </View>
          )}
        </View>

        {aiLoading ? (
          <View style={styles.aiLoadingBox}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.aiLoadingText}>Gemini AI is analyzing nutrition facts...</Text>
          </View>
        ) : aiError ? (
          <View style={styles.aiErrorBox}>
            <Text style={styles.aiErrorText}>{aiError}</Text>
            <TouchableOpacity onPress={handleRetryAI} style={styles.aiRetryBtn}>
              <Text style={styles.aiRetryText}>Retry Analysis</Text>
            </TouchableOpacity>
          </View>
        ) : aiData ? (
          <View style={styles.aiContent}>
            {/* Overview Summary */}
            <Text style={styles.aiSummaryText}>{aiData.summary}</Text>

            {/* Key Strengths */}
            {aiData.key_strengths && aiData.key_strengths.length > 0 && (
              <View style={styles.aiSection}>
                <Text style={styles.aiSectionHeading}>Product Strengths</Text>
                {aiData.key_strengths.map((str, idx) => (
                  <View key={`str-${idx}`} style={styles.aiBulletRow}>
                    <Text style={styles.aiBulletGreen}>•</Text>
                    <Text style={styles.aiBulletText}>{str}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Areas of Concern */}
            {aiData.areas_of_concern && aiData.areas_of_concern.length > 0 && (
              <View style={styles.aiSection}>
                <Text style={styles.aiSectionHeading}>Points to Consider</Text>
                {aiData.areas_of_concern.map((con, idx) => (
                  <View key={`con-${idx}`} style={styles.aiBulletRow}>
                    <Text style={styles.aiBulletAmber}>•</Text>
                    <Text style={styles.aiBulletText}>{con}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Ingredient & Additive Insights */}
            {aiData.ingredient_insights && aiData.ingredient_insights.length > 0 && (
              <View style={styles.aiSection}>
                <Text style={styles.aiSectionHeading}>Ingredient & Additive Context</Text>
                {aiData.ingredient_insights.map((ins, idx) => (
                  <View key={`ins-${idx}`} style={styles.aiBulletRow}>
                    <Text style={styles.aiBulletBlue}>•</Text>
                    <Text style={styles.aiBulletText}>{ins}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Consumer Takeaway */}
            <View style={styles.takeawayBox}>
              <Text style={styles.takeawayTitle}>💡 Consumer Takeaway</Text>
              <Text style={styles.takeawayText}>{aiData.consumer_takeaway}</Text>
            </View>

            <Text style={styles.aiModelLabel}>Engine: {aiData.model_used}</Text>
          </View>
        ) : null}
      </View>

      {/* Verified Nutritional Facts Table (Per 100g / 100ml) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Nutritional Facts (Per 100g / 100ml)</Text>
        <Text style={styles.sectionSubtitle}>
          Normalized comparison basis
        </Text>

        <View style={styles.table}>
          <NutrientRow label="Energy / Calories" value={n.energy_kcal} unit="kcal" />
          <NutrientRow label="Total Fat" value={n.fat} unit="g" />
          <NutrientRow label="Saturated Fat" value={n.saturated_fat} unit="g" />
          <NutrientRow label="Total Carbohydrates" value={n.carbohydrates} unit="g" />
          <NutrientRow label="Sugars" value={n.sugars} unit="g" />
          <NutrientRow label="Dietary Fiber" value={n.fiber} unit="g" />
          <NutrientRow label="Protein" value={n.proteins} unit="g" />
          <NutrientRow label="Salt" value={n.salt} unit="g" />
          <NutrientRow label="Sodium" value={n.sodium} unit="mg" />
        </View>
      </View>

      {/* Ingredients Section */}
      {product.ingredients_text ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ingredients List</Text>
          <Text style={styles.ingredientsBody}>{product.ingredients_text}</Text>
        </View>
      ) : null}

      {/* Allergens Section */}
      {product.allergens_text ? (
        <View style={styles.allergenCard}>
          <Text style={styles.allergenTitle}>⚠️ Allergens Noted</Text>
          <Text style={styles.allergenBody}>{product.allergens_text}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function NutrientRow({
  label,
  value,
  unit,
}: {
  label: string;
  value?: number | null;
  unit: string;
}) {
  const hasValue = value !== null && value !== undefined;
  return (
    <View style={styles.tableRow}>
      <Text style={styles.tableLabel}>{label}</Text>
      <Text style={[styles.tableValue, !hasValue && styles.tableValueMissing]}>
        {hasValue ? `${value} ${unit}` : 'Not reported'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    paddingBottom: Spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
  },
  productRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  productImage: {
    width: 80,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  imagePlaceholder: {
    width: 80,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderEmoji: {
    fontSize: 36,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  brandName: {
    fontSize: 14,
    color: Colors.primaryDark,
    fontWeight: '600',
    marginTop: 2,
  },
  barcodeLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  servingBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  servingText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sourceBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  cachedBadge: {
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cachedBadgeText: {
    fontSize: 11,
    color: '#03543F',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: 2,
  },
  scoreHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gradeBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  scoreLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  scoreLoadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  scoreDisplayBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 6,
  },
  scoreValue: {
    fontSize: 42,
    fontWeight: '800',
  },
  scoreMax: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textMuted,
    marginLeft: 4,
  },
  scoreSummary: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
    marginBottom: 8,
  },
  factorsContainer: {
    gap: 4,
    marginTop: 4,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  factorIcon: {
    fontSize: 13,
  },
  factorText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  insufficientBox: {
    backgroundColor: '#F3F4F6',
    padding: Spacing.md,
    borderRadius: 12,
    marginTop: 6,
  },
  insufficientTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  insufficientText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  aiCard: {
    backgroundColor: '#F0FDF4',
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: Spacing.md,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  aiTitleGroup: {
    flex: 1,
  },
  aiBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  aiSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  groundedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  groundedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  aiLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  aiLoadingText: {
    fontSize: 13,
    color: Colors.primaryDark,
  },
  aiErrorBox: {
    paddingVertical: 8,
  },
  aiErrorText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  aiRetryBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  aiRetryText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  aiContent: {
    marginTop: 4,
  },
  aiSummaryText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 19,
    marginBottom: 10,
  },
  aiSection: {
    marginBottom: 8,
  },
  aiSectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 3,
  },
  aiBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 2,
  },
  aiBulletGreen: {
    color: '#16A34A',
    fontSize: 14,
    lineHeight: 18,
  },
  aiBulletAmber: {
    color: '#D97706',
    fontSize: 14,
    lineHeight: 18,
  },
  aiBulletBlue: {
    color: '#2563EB',
    fontSize: 14,
    lineHeight: 18,
  },
  aiBulletText: {
    fontSize: 12,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 17,
  },
  takeawayBox: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginTop: 6,
  },
  takeawayTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 2,
  },
  takeawayText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  aiModelLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'right',
  },
  table: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  tableValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  tableValueMissing: {
    color: Colors.textMuted,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  ingredientsBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  allergenCard: {
    backgroundColor: '#FFFBEB',
    padding: Spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: Spacing.md,
  },
  allergenTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  allergenBody: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 18,
  },
});
