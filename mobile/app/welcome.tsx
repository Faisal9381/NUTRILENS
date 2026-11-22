/**
 * NutriLens — Get Started / Onboarding Screen
 *
 * Design reference: image 2 (light mint-green gradient bg, circular phone
 * mockup, NutriLens branding, single CTA button).
 *
 * Layout:
 *  ┌─────────────────────────────┐
 *  │      (mint gradient bg)     │
 *  │                             │
 *  │   ┌─────────────────────┐   │
 *  │   │   circular artwork  │   │  ← white circle w/ green ring
 *  │   │   (food scan icon)  │   │
 *  │   └─────────────────────┘   │
 *  │                             │
 *  │       🌿 NutriLens          │
 *  │  Scan. Understand. Eat Smart│
 *  │  Precision nutrition …      │
 *  │                             │
 *  │   [ ── Get Started ──── ]   │
 *  └─────────────────────────────┘
 */
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.70;

export default function WelcomeScreen() {
  const router = useRouter();

  // Entry animations
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={['#0A130E', '#0F1E14', '#091209']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />

        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* ── Circular artwork ── */}
          <Animated.View
            style={[styles.circleOuter, { transform: [{ scale: scaleAnim }] }]}
          >
            <View style={styles.circleInner}>
              {/* Scan viewfinder artwork */}
              <View style={styles.artwork}>
                {/* Corner brackets (scan frame) */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                {/* Leaf + barcode icon block */}
                <View style={styles.artCenter}>
                  <Text style={styles.artLeaf}>🌿</Text>
                  <View style={styles.barcodeRow}>
                    {[4, 2, 4, 2, 3, 2, 4, 2, 3].map((w, i) => (
                      <View
                        key={i}
                        style={[
                          styles.barLine,
                          { width: w, backgroundColor: i % 2 === 0 ? '#2ECC71' : '#34D399' },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.artCaption}>SCAN</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ── Branding ── */}
          <View style={styles.brandBlock}>
            {/* leaf icon badge */}
            <View style={styles.leafBadge}>
              <Text style={styles.leafBadgeIcon}>🍃</Text>
            </View>

            <Text style={styles.appName}>NutriLens</Text>

            <Text style={styles.tagline}>
              Precision nutrition tracking. Designed{'\n'}for clarity, built for performance.
            </Text>
          </View>

          {/* ── CTA button ── */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/auth/signin')}
            activeOpacity={0.87}
          >
            <Text style={styles.ctaText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 24,
  },

  /* ── Circle ── */
  circleOuter: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#102B1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#1A4A30',
  },
  circleInner: {
    width: CIRCLE_SIZE * 0.84,
    height: CIRCLE_SIZE * 0.84,
    borderRadius: (CIRCLE_SIZE * 0.84) / 2,
    backgroundColor: '#0D2016',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Artwork inside circle ── */
  artwork: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#2ECC71',
    borderWidth: 0,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 5,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 5,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 5,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 5,
  },
  artCenter: {
    alignItems: 'center',
    gap: 8,
  },
  artLeaf: {
    fontSize: 36,
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 32,
  },
  barLine: {
    height: '100%',
    borderRadius: 2,
  },
  artCaption: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2ECC71',
    letterSpacing: 3,
  },

  /* ── Branding ── */
  brandBlock: {
    alignItems: 'center',
    marginBottom: 40,
  },
  leafBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0D2016',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#1A4A30',
  },
  leafBadgeIcon: {
    fontSize: 28,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 15,
    color: '#6DAB86',
    textAlign: 'center',
    lineHeight: 22,
  },

  /* ── CTA button ── */
  ctaButton: {
    width: '100%',
    backgroundColor: '#2ECC71',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2ECC71',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 7,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#071209',
    letterSpacing: 0.3,
  },
});
