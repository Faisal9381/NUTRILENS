import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Spacing } from '../../src/constants/theme';
import { fetchProductByBarcode } from '../../src/services/apiClient';
import LabelCaptureModal from '../../src/components/LabelCaptureModal';

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [showLabelModal, setShowLabelModal] = useState(false);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    await lookupBarcode(data);
  };

  const lookupBarcode = async (barcode: string) => {
    setLoading(true);
    setScannerError(null);

    const result = await fetchProductByBarcode(barcode);

    setLoading(false);

    if (result.success && result.product) {
      // Navigate to product analysis screen with product details
      router.push({
        pathname: '/product/analysis',
        params: {
          productJson: JSON.stringify(result.product),
        },
      });
      // Reset scan flag after navigation
      setTimeout(() => setScanned(false), 2000);
    } else if (result.notFound) {
      setScannerError(
        `Barcode "${barcode}" is not registered in Open Food Facts database yet.\n\nIn Step 3, you'll be able to snap a photo of its nutrition label directly!`
      );
    } else {
      setScannerError(result.error || 'Failed to lookup barcode.');
    }
  };

  const handleManualSubmit = () => {
    if (!manualBarcode.trim()) {
      Alert.alert('Empty Barcode', 'Please type a valid product barcode.');
      return;
    }
    lookupBarcode(manualBarcode.trim());
  };

  const handleTestSample = (sampleBarcode: string) => {
    setManualBarcode(sampleBarcode);
    lookupBarcode(sampleBarcode);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Scan Product Barcode</Text>
        <Text style={styles.subtitle}>
          Align barcode inside the frame to fetch Open Food Facts nutrition
        </Text>
      </View>

      {/* Camera Viewfinder or Permission/Manual Area */}
      <View style={styles.cameraContainer}>
        {!permission ? (
          <View style={styles.centerCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.stateText}>Requesting camera permission...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.centerCard}>
            <Text style={styles.cardEmoji}>📷</Text>
            <Text style={styles.cardHeading}>Camera Access Needed</Text>
            <Text style={styles.cardText}>
              NutriLens needs camera access to scan barcodes automatically. You can also type a barcode manually below.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: [
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'code128',
                  'code39',
                  'qr',
                ],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Viewfinder Target Frame Overlay */}
            <View style={styles.overlay}>
              <View style={styles.scannerTargetBox}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                {loading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.loadingText}>Fetching from Open Food Facts...</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Error or Not Found Notification Banner */}
      {scannerError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorTitle}>Lookup Notice</Text>
          <Text style={styles.errorBody}>{scannerError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setScannerError(null);
              setScanned(false);
            }}
          >
            <Text style={styles.retryButtonText}>Scan Another Code</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Manual Input Toggle & Sample Barcodes for Quick Testing */}
      <View style={styles.controlsCard}>
        <View style={styles.manualHeaderRow}>
          <Text style={styles.controlsTitle}>Testing or No Camera?</Text>
          <TouchableOpacity
            onPress={() => setShowManualInput(!showManualInput)}
            style={styles.toggleButton}
          >
            <Text style={styles.toggleButtonText}>
              {showManualInput ? 'Hide Input' : 'Type Barcode'}
            </Text>
          </TouchableOpacity>
        </View>

        {showManualInput && (
          <View style={styles.manualInputGroup}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 7394376616037 or 5449000000996"
              placeholderTextColor={Colors.textMuted}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              keyboardType="numeric"
              returnKeyType="search"
              onSubmitEditing={handleManualSubmit}
            />
            <TouchableOpacity
              style={[styles.primaryButton, styles.submitButton]}
              onPress={handleManualSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Lookup</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Sample Buttons for Instant Testing & OCR Trigger */}
        <View style={styles.samplesRow}>
          <Text style={styles.samplesLabel}>Quick Samples:</Text>
          <TouchableOpacity
            style={styles.samplePill}
            onPress={() => handleTestSample('7394376616037')}
          >
            <Text style={styles.samplePillText}>Oatly Oatmilk</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.samplePill}
            onPress={() => handleTestSample('5449000000996')}
          >
            <Text style={styles.samplePillText}>Coca-Cola</Text>
          </TouchableOpacity>
        </View>

        {/* Nutrition Label Photo / OCR Mode Trigger */}
        <TouchableOpacity
          style={styles.ocrButton}
          onPress={() => setShowLabelModal(true)}
        >
          <Text style={styles.ocrButtonEmoji}>🏷️</Text>
          <View>
            <Text style={styles.ocrButtonTitle}>Capture Nutrition Label (OCR)</Text>
            <Text style={styles.ocrButtonSub}>Photograph or transcribe nutrition facts table</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Label Capture & Manual Correction Modal */}
      <LabelCaptureModal
        visible={showLabelModal}
        onClose={() => setShowLabelModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingHorizontal: Spacing.md,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cameraContainer: {
    height: 320,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    marginBottom: Spacing.md,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerTargetBox: {
    width: 240,
    height: 180,
    borderRadius: 16,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#22C55E',
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 10,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 10,
  },
  centerCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  cardEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  cardHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  cardText: {
    fontSize: 13,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  stateText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: Spacing.sm,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 2,
  },
  errorBody: {
    fontSize: 12,
    color: Colors.textPrimary,
    lineHeight: 17,
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
  },
  controlsCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  manualHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  controlsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  toggleButton: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  manualInputGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: '#F9FAFB',
  },
  submitButton: {
    height: 44,
    justifyContent: 'center',
  },
  samplesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  samplesLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginRight: 2,
  },
  samplePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  samplePillText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  ocrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  ocrButtonEmoji: {
    fontSize: 22,
  },
  ocrButtonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  ocrButtonSub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
