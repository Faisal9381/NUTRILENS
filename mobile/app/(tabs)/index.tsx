/**
 * NutriLens — Home Screen (Main Dashboard)
 *
 * Design reference: image 3 (dark-themed card UI).
 * Adapts the dark card-heavy layout with NutriLens content:
 *   - Dark background (#0C1710 / #0F1E14)
 *   - Mint-green accent (#2ECC71 / #34D399)
 *   - Rounded dark-green cards with subtle borders
 *   - Greeting header + user avatar
 *   - Prominent "Scan Product" hero CTA
 *   - Feature cards row: Score, History, Compare
 *   - Recent scans section with placeholder cards
 *   - AI Assistant quick-access card
 *   - Backend status indicator (subtle, collapsed by default)
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContextProvider';
import { checkBackendHealth, HealthCheckResponse } from '../../src/services/apiClient';

const { width } = Dimensions.get('window');

// ── Color palette (dark theme) ──────────────────────────────────────────────
const C = {
  bg:            '#0C1710',
  card:          '#142019',
  cardAlt:       '#1A2B20',
  border:        '#1E3326',
  borderBright:  '#264A33',
  accent:        '#2ECC71',
  accentDark:    '#1A9150',
  accentMuted:   '#3DAB68',
  textPrimary:   '#E8F5EC',
  textSecondary: '#6DAB86',
  textMuted:     '#3D6650',
  white:         '#FFFFFF',
  danger:        '#E05C5C',
  warning:       '#D99424',
};

export default function HomeScreen() {
  const router  = useRouter();
  const { user, logout } = useAuth();

  const [health, setHealth]         = useState<HealthCheckResponse | null>(null);
  const [healthLoading, setHL]      = useState(true);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await checkBackendHealth();
      if (r.success && r.data) setHealth(r.data);
      setHL(false);
    })();
  }, []);

  /* Greeting */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = user?.email?.split('@')[0] ?? 'there';

  /* Backend status pill color */
  const apiOnline = !!health;
  const dbOk      = health?.database?.status === 'connected';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>{greeting} 👋</Text>
            <Text style={styles.usernameText}>{displayName}</Text>
          </View>
          <View style={styles.headerRight}>
            {/* Backend status dot */}
            <TouchableOpacity
              onPress={() => setShowStatus(!showStatus)}
              style={[
                styles.statusDot,
                { backgroundColor: apiOnline ? C.accentDark : C.danger },
              ]}
            />
            {/* Avatar */}
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.avatarBtn}
            >
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Backend status (expanded) ─────────────────────────── */}
        {showStatus && (
          <View style={styles.statusCard}>
            {healthLoading
              ? <ActivityIndicator color={C.accent} size="small" />
              : (
                <View style={styles.statusRow}>
                  <View style={[styles.pill, apiOnline ? styles.pillGreen : styles.pillRed]}>
                    <Text style={styles.pillText}>{apiOnline ? '● API Online' : '● API Offline'}</Text>
                  </View>
                  <View style={[styles.pill, dbOk ? styles.pillGreen : styles.pillYellow]}>
                    <Text style={styles.pillText}>{dbOk ? '● DB Connected' : '● DB Offline'}</Text>
                  </View>
                </View>
              )
            }
            {!apiOnline && !healthLoading && (
              <Text style={styles.statusHint}>
                Start backend: uvicorn app.main:app --port 8000
              </Text>
            )}
          </View>
        )}

        {/* ── Hero scan banner ─────────────────────────────────── */}
        <TouchableOpacity
          style={styles.heroBanner}
          onPress={() => router.push('/(tabs)/scanner')}
          activeOpacity={0.88}
        >
          <View style={styles.heroLeft}>
            <View style={styles.scanFrameIcon}>
              <View style={[styles.scanCorner, styles.scanTL]} />
              <View style={[styles.scanCorner, styles.scanTR]} />
              <View style={[styles.scanCorner, styles.scanBL]} />
              <View style={[styles.scanCorner, styles.scanBR]} />
              <Text style={styles.scanEmoji}>📷</Text>
            </View>
            <View>
              <Text style={styles.heroTitle}>Scan a Product</Text>
              <Text style={styles.heroSub}>Barcode or nutrition label</Text>
            </View>
          </View>
          <View style={styles.heroArrow}>
            <Text style={styles.heroArrowText}>›</Text>
          </View>
        </TouchableOpacity>

        {/* ── Feature cards row ─────────────────────────────────── */}
        <Text style={styles.sectionLabel}>FEATURES</Text>
        <View style={styles.featureRow}>
          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => router.push('/product/analysis')}
            activeOpacity={0.8}
          >
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={styles.featureTitle}>Nutrition{'\n'}Score</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => router.push('/ai-chat')}
            activeOpacity={0.8}
          >
            <Text style={styles.featureIcon}>✨</Text>
            <Text style={styles.featureTitle}>AI{'\n'}Assistant</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureCard}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.featureIcon}>⚖️</Text>
            <Text style={styles.featureTitle}>Compare{'\n'}Products</Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent Scans ──────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>RECENT SCANS</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Empty state card */}
        <View style={styles.emptyScansCard}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No scans yet</Text>
          <Text style={styles.emptyBody}>
            Scan a product barcode or photograph a nutrition label to get started.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/(tabs)/scanner')}
          >
            <Text style={styles.emptyBtnText}>+ Scan First Product</Text>
          </TouchableOpacity>
        </View>

        {/* ── AI Insights card ─────────────────────────────────── */}
        <Text style={styles.sectionLabel}>AI NUTRITION ASSISTANT</Text>
        <TouchableOpacity
          style={styles.aiCard}
          onPress={() => router.push('/ai-chat')}
          activeOpacity={0.85}
        >
          <View style={styles.aiCardTop}>
            <View style={styles.aiIconBadge}>
              <Text style={styles.aiIconText}>✨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiCardTitle}>Ask NutriLens AI</Text>
              <Text style={styles.aiCardSub}>
                Powered by Gemini — grounded in verified nutrition data
              </Text>
            </View>
            <Text style={styles.aiArrow}>›</Text>
          </View>

          <View style={styles.aiChipRow}>
            {['What is INS 471?', 'Is this product diabetic-friendly?', 'Compare fats'].map((q) => (
              <View key={q} style={styles.aiChip}>
                <Text style={styles.aiChipText}>{q}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* ── NutriLens info strip ─────────────────────────────── */}
        <View style={styles.infoStrip}>
          <Text style={styles.infoStripText}>
            🌿 NutriLens never fabricates nutritional data. All scores are calculated deterministically from verified sources.
          </Text>
        </View>

        {/* ── Sign Out (bottom) ─────────────────────────────────── */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={async () => {
            await logout();
            router.replace('/welcome');
          }}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: C.bg,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 4,
  },
  greetingText: {
    fontSize: 14,
    color: C.textSecondary,
    fontWeight: '500',
  },
  usernameText: {
    fontSize: 22,
    color: C.textPrimary,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  avatarBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.accent,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: C.white,
  },

  /* ── Status card ── */
  statusCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillGreen: { backgroundColor: '#0D3320' },
  pillRed:   { backgroundColor: '#3A0E0E' },
  pillYellow:{ backgroundColor: '#3A2E0E' },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textPrimary,
  },
  statusHint: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },

  /* ── Hero banner ── */
  heroBanner: {
    backgroundColor: C.accentDark,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 7,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  scanFrameIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scanEmoji: {
    fontSize: 26,
  },
  scanCorner: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderColor: C.accent,
  },
  scanTL: { top: 5, left: 5, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 3 },
  scanTR: { top: 5, right: 5, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 3 },
  scanBL: { bottom: 5, left: 5, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 3 },
  scanBR: { bottom: 5, right: 5, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 3 },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.white,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  heroArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArrowText: {
    fontSize: 24,
    color: C.white,
    lineHeight: 30,
  },

  /* ── Sections ── */
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    color: C.accent,
    fontWeight: '600',
  },

  /* ── Feature cards ── */
  featureRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  featureCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    fontSize: 26,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
    lineHeight: 17,
  },

  /* ── Empty scans ── */
  emptyScansCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 28,
    alignItems: 'center',
    marginBottom: 28,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: C.accentDark,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.white,
  },

  /* ── AI card ── */
  aiCard: {
    backgroundColor: C.cardAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borderBright,
    padding: 18,
    marginBottom: 20,
  },
  aiCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  aiIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0D3320',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiIconText: {
    fontSize: 22,
  },
  aiCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textPrimary,
  },
  aiCardSub: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  aiArrow: {
    fontSize: 24,
    color: C.accent,
  },
  aiChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aiChip: {
    backgroundColor: '#0D3320',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  aiChipText: {
    fontSize: 12,
    color: C.accentMuted,
    fontWeight: '500',
  },

  /* ── Info strip ── */
  infoStrip: {
    backgroundColor: '#101E14',
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoStripText: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 18,
  },

  /* ── Sign Out ── */
  signOutBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  signOutText: {
    fontSize: 14,
    color: C.textMuted,
    fontWeight: '600',
  },
});
