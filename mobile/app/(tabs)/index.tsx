import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../src/constants/theme';
import { checkBackendHealth, HealthCheckResponse } from '../../src/services/apiClient';
import { API_BASE_URL } from '../../src/constants/api';

export default function HomeScreen() {
  const router = useRouter();
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    const result = await checkBackendHealth();
    if (result.success && result.data) {
      setHealthData(result.data);
    } else {
      setError(result.error || 'Failed to connect to backend.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Text style={styles.brandIcon}>🥗</Text>
            <View>
              <Text style={styles.appName}>NutriLens</Text>
              <Text style={styles.tagline}>Understand what you eat before you eat it</Text>
            </View>
          </View>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome to NutriLens</Text>
          <Text style={styles.welcomeBody}>
            Make informed packaged-food choices with instant barcode scanning, nutrition transparency, and AI-grounded explanations.
          </Text>
        </View>

        {/* Backend Connection Status Card (Verified Integration) */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeaderRow}>
            <Text style={styles.statusTitle}>Backend API Connection</Text>
            <TouchableOpacity onPress={fetchHealth} style={styles.refreshButton}>
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.apiUrlLabel}>Target Base URL: {API_BASE_URL}</Text>

          {loading ? (
            <View style={styles.statusLoadingRow}>
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.statusLoadingText}>Checking backend status...</Text>
            </View>
          ) : error ? (
            <View style={styles.statusErrorBox}>
              <Text style={styles.statusErrorTitle}>Backend Offline / Unreachable</Text>
              <Text style={styles.statusErrorBody}>{error}</Text>
              <Text style={styles.statusErrorHelp}>
                Ensure the FastAPI backend is running: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
              </Text>
            </View>
          ) : (
            <View style={styles.statusSuccessBox}>
              <View style={styles.pillRow}>
                <View style={[styles.badge, styles.badgeSuccess]}>
                  <Text style={styles.badgeSuccessText}>API Online (v{healthData?.version})</Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    healthData?.database.status === 'connected'
                      ? styles.badgeSuccess
                      : styles.badgeWarning,
                  ]}
                >
                  <Text
                    style={
                      healthData?.database.status === 'connected'
                        ? styles.badgeSuccessText
                        : styles.badgeWarningText
                    }
                  >
                    DB: {healthData?.database.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.statusSuccessDetail}>
                Database target: {healthData?.database.host} ({healthData?.database.database})
              </Text>
              {healthData?.database.status === 'disconnected' && (
                <Text style={styles.statusDbWarning}>
                  Notice: PostgreSQL server is not running locally. Database setup instructions are documented in README.md.
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionHeading}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/scanner')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIconText}>📷</Text>
            </View>
            <Text style={styles.actionTitle}>Scan Product</Text>
            <Text style={styles.actionDescription}>
              Barcode & label camera capture (Coming in Step 2)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/product/analysis')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconContainer}>
              <Text style={styles.actionIconText}>📊</Text>
            </View>
            <Text style={styles.actionTitle}>Product Preview</Text>
            <Text style={styles.actionDescription}>
              Inspect the nutrition analysis dashboard layout
            </Text>
          </TouchableOpacity>
        </View>

        {/* Roadmap Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Step 1: Project Foundation</Text>
          <Text style={styles.infoText}>
            ✓ React Native + Expo Router initialized{'\n'}
            ✓ Clean modular architecture configured{'\n'}
            ✓ FastAPI backend + PostgreSQL ORM integrated{'\n'}
            ✓ True backend connectivity verified
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  brandIcon: {
    fontSize: 32,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  tagline: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  welcomeCard: {
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginBottom: Spacing.md,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 4,
  },
  welcomeBody: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  refreshButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  apiUrlLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  statusLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  statusLoadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statusErrorBox: {
    backgroundColor: '#FEF2F2',
    padding: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  statusErrorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.error,
  },
  statusErrorBody: {
    fontSize: 12,
    color: Colors.textPrimary,
    marginVertical: 2,
  },
  statusErrorHelp: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  statusSuccessBox: {
    gap: 4,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSuccess: {
    backgroundColor: '#DEF7EC',
  },
  badgeSuccessText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#03543F',
  },
  badgeWarning: {
    backgroundColor: '#FEF08A',
  },
  badgeWarningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#854D0E',
  },
  statusSuccessDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statusDbWarning: {
    fontSize: 11,
    color: Colors.warning,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  actionGrid: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionIconText: {
    fontSize: 20,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  infoCard: {
    backgroundColor: '#F3F4F6',
    padding: Spacing.md,
    borderRadius: 14,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
