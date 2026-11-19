import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '../../src/constants/theme';
import { parseNutritionText } from '../../src/services/apiClient';
import { OCRParseResult } from '../../src/types/nutrition';
import { Product } from '../../src/types/product';

interface LabelCaptureModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function LabelCaptureModal({ visible, onClose }: LabelCaptureModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRParseResult | null>(null);

  // Editable fields for manual correction
  const [productName, setProductName] = useState('Custom Scanned Item');
  const [servingSize, setServingSize] = useState('100g');
  const [calories, setCalories] = useState('');
  const [fat, setFat] = useState('');
  const [saturatedFat, setSaturatedFat] = useState('');
  const [carbs, setCarbs] = useState('');
  const [sugars, setSugars] = useState('');
  const [fiber, setFiber] = useState('');
  const [protein, setProtein] = useState('');
  const [sodium, setSodium] = useState('');
  const [ingredients, setIngredients] = useState('');

  const handleParseText = async () => {
    if (!rawText.trim()) {
      Alert.alert('Empty Input', 'Please paste or type label text.');
      return;
    }

    setLoading(true);
    const result = await parseNutritionText(rawText);
    setLoading(false);

    if (result.success && result.data) {
      setOcrResult(result.data);
      const n = result.data.nutrients_per_100g;
      setCalories(n.energy_kcal !== null ? String(n.energy_kcal) : '');
      setFat(n.fat !== null ? String(n.fat) : '');
      setSaturatedFat(n.saturated_fat !== null ? String(n.saturated_fat) : '');
      setCarbs(n.carbohydrates !== null ? String(n.carbohydrates) : '');
      setSugars(n.sugars !== null ? String(n.sugars) : '');
      setFiber(n.fiber !== null ? String(n.fiber) : '');
      setProtein(n.proteins !== null ? String(n.proteins) : '');
      setSodium(n.sodium !== null ? String(n.sodium) : '');
      if (result.data.serving_size) setServingSize(result.data.serving_size);
      if (result.data.ingredients_text) setIngredients(result.data.ingredients_text);
      setStep('review');
    } else {
      Alert.alert('Parse Failed', result.error || 'Could not parse text.');
    }
  };

  const loadSampleLabel = () => {
    const sample = `Nutrition Facts\nServing Size: 30g\nCalories: 140 kcal\nTotal Fat: 8g\nSaturated Fat: 1.5g\nTotal Carbohydrate: 15g\nTotal Sugars: 9g\nDietary Fiber: 2g\nProtein: 3g\nSodium: 110mg\nIngredients: Rolled oats, brown sugar, organic sunflower oil.`;
    setRawText(sample);
  };

  const handleConfirmAndAnalyze = () => {
    const toNum = (val: string) => {
      const parsed = parseFloat(val.trim());
      return isNaN(parsed) ? null : parsed;
    };

    const syntheticProduct: Product = {
      id: null,
      barcode: `OCR-${Date.now().toString().slice(-6)}`,
      product_name: productName.trim() || 'Label Scanned Food',
      brand: 'Manual OCR',
      categories: 'Packaged Food',
      serving_size: servingSize.trim() || null,
      image_url: null,
      ingredients_text: ingredients.trim() || null,
      allergens_text: ocrResult?.allergens_text || null,
      nutrients_per_100g: {
        energy_kcal: toNum(calories),
        fat: toNum(fat),
        saturated_fat: toNum(saturatedFat),
        carbohydrates: toNum(carbs),
        sugars: toNum(sugars),
        fiber: toNum(fiber),
        proteins: toNum(protein),
        salt: null,
        sodium: toNum(sodium),
      },
      source: 'ocr_label',
      cached: false,
    };

    onClose();
    router.push({
      pathname: '/product/analysis',
      params: {
        productJson: JSON.stringify(syntheticProduct),
      },
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>
                {step === 'input' ? 'Label Text & OCR Capture' : 'Review & Correct Values'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 'input'
                  ? 'Paste or type nutrition panel text'
                  : 'Ensure accuracy before calculating score'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody}>
            {step === 'input' ? (
              <View>
                <TouchableOpacity onPress={loadSampleLabel} style={styles.sampleBadge}>
                  <Text style={styles.sampleBadgeText}>💡 Click to load sample label text</Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={8}
                  placeholder={`Paste nutrition label text here...\n\nExample:\nCalories: 150 kcal\nTotal Fat: 5g\nCarbohydrates: 20g\nSugars: 12g\nProtein: 4g`}
                  placeholderTextColor={Colors.textMuted}
                  value={rawText}
                  onChangeText={setRawText}
                />

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleParseText}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Extract Nutrients</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {/* Missing / Uncertain indicators */}
                {ocrResult && ocrResult.missing_fields.length > 0 && (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningTitle}>Missing from OCR:</Text>
                    <Text style={styles.warningText}>
                      {ocrResult.missing_fields.join(', ')}. Please verify or enter manual values below.
                    </Text>
                  </View>
                )}

                <Text style={styles.fieldLabel}>Product Name</Text>
                <TextInput
                  style={styles.input}
                  value={productName}
                  onChangeText={setProductName}
                />

                <Text style={styles.fieldLabel}>Serving Size</Text>
                <TextInput
                  style={styles.input}
                  value={servingSize}
                  onChangeText={setServingSize}
                />

                <View style={styles.gridRow}>
                  <View style={styles.gridCol}>
                    <Text style={styles.fieldLabel}>Calories (kcal)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={calories}
                      onChangeText={setCalories}
                    />
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.fieldLabel}>Protein (g)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={protein}
                      onChangeText={setProtein}
                    />
                  </View>
                </View>

                <View style={styles.gridRow}>
                  <View style={styles.gridCol}>
                    <Text style={styles.fieldLabel}>Total Fat (g)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={fat}
                      onChangeText={setFat}
                    />
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.fieldLabel}>Sat. Fat (g)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={saturatedFat}
                      onChangeText={setSaturatedFat}
                    />
                  </View>
                </View>

                <View style={styles.gridRow}>
                  <View style={styles.gridCol}>
                    <Text style={styles.fieldLabel}>Carbs (g)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={carbs}
                      onChangeText={setCarbs}
                    />
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.fieldLabel}>Sugars (g)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={sugars}
                      onChangeText={setSugars}
                    />
                  </View>
                </View>

                <View style={styles.gridRow}>
                  <View style={styles.gridCol}>
                    <Text style={styles.fieldLabel}>Fiber (g)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={fiber}
                      onChangeText={setFiber}
                    />
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.fieldLabel}>Sodium (mg)</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={sodium}
                      onChangeText={setSodium}
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Ingredients</Text>
                <TextInput
                  style={[styles.input, { height: 60 }]}
                  multiline
                  value={ingredients}
                  onChangeText={setIngredients}
                />

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setStep('input')}
                  >
                    <Text style={styles.secondaryButtonText}>Back to Text</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleConfirmAndAnalyze}
                  >
                    <Text style={styles.primaryButtonText}>Confirm & Analyze</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  scrollBody: {
    paddingBottom: Spacing.xl,
  },
  sampleBadge: {
    backgroundColor: Colors.primaryLight,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  sampleBadgeText: {
    fontSize: 12,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: Colors.textPrimary,
    backgroundColor: '#F9FAFB',
    textAlignVertical: 'top',
    height: 160,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 3,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: Colors.textPrimary,
    backgroundColor: '#F9FAFB',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridCol: {
    flex: 1,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  warningText: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: Spacing.md,
    flex: 1,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
