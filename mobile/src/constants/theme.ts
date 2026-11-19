
/**
 * NutriLens — Complete Mobile Design System
 * Premium, modern, India-focused nutrition application.
 *
 * Design direction:
 * - Fresh forest green identity
 * - Soft neutral backgrounds
 * - Clean white surfaces
 * - Accessible typography
 * - Consistent spacing and rounded components
 * - Nutrition-specific semantic colors
 */

import { Platform } from 'react-native';

// --------------------------------------------------
// COLORS
// --------------------------------------------------

export const Colors = {
  // Brand
  primary: '#237A45',
  primaryDark: '#185C35',
  primaryLight: '#E7F4EB',
  primarySoft: '#F0F8F2',

  secondary: '#79A98A',
  secondaryLight: '#DCEDE1',

  accent: '#E9A23B',
  accentLight: '#FFF3DE',

  // Backgrounds
  background: '#F6F8F6',
  backgroundSecondary: '#EEF3EF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',

  // Borders
  border: '#E4EAE5',
  cardBorder: '#E4EAE5',
  borderStrong: '#CFDAD1',

  // Text
  textPrimary: '#192820',
  textSecondary: '#65736A',
  textMuted: '#96A198',
  textInverse: '#FFFFFF',

  // Nutrition indicators
  nutrition: {
    excellent: '#218653',
    good: '#6DAD66',
    moderate: '#E6AD3D',
    caution: '#E88742',
    high: '#D95C52',
  },

  // Status
  success: '#218653',
  successLight: '#E6F4EA',

  warning: '#D99424',
  warningLight: '#FFF4DD',

  error: '#D94B45',
  errorLight: '#FCEAE8',

  info: '#3984C6',
  infoLight: '#E8F2FC',

  // Navigation
  tabActive: '#237A45',
  tabInactive: '#929D95',

  // Overlays
  overlay: 'rgba(16, 35, 23, 0.45)',
  transparent: 'transparent',
};

// --------------------------------------------------
// SPACING
// --------------------------------------------------

export const Spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  smMd: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  massive: 64,
};

// --------------------------------------------------
// BORDER RADIUS
// --------------------------------------------------

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 30,
  pill: 999,
};

// --------------------------------------------------
// TYPOGRAPHY
// --------------------------------------------------

export const Typography = {
  display: {
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 40,
    color: Colors.textPrimary,
  },

  title: {
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 34,
    color: Colors.textPrimary,
  },

  heading: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 30,
    color: Colors.textPrimary,
  },

  subtitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
    color: Colors.textPrimary,
  },

  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 25,
    color: Colors.textSecondary,
  },

  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 23,
    color: Colors.textSecondary,
  },

  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 21,
    color: Colors.textSecondary,
  },

  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 18,
    color: Colors.textMuted,
  },

  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
    color: Colors.textSecondary,
  },

  button: {
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 22,
    color: Colors.textInverse,
  },

  overline: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    lineHeight: 16,
    color: Colors.textMuted,
  },
};

// --------------------------------------------------
// SHADOWS
// --------------------------------------------------

export const Shadows = {
  none: {},

  small: Platform.select({
    ios: {
      shadowColor: '#183D27',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 5,
    },
    android: {
      elevation: 2,
    },
  }),

  card: Platform.select({
    ios: {
      shadowColor: '#183D27',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
    },
    android: {
      elevation: 3,
    },
  }),

  elevated: Platform.select({
    ios: {
      shadowColor: '#183D27',
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.10,
      shadowRadius: 16,
    },
    android: {
      elevation: 6,
    },
  }),
};

// --------------------------------------------------
// COMPONENT DIMENSIONS
// --------------------------------------------------

export const Components = {
  buttonHeight: 54,
  buttonHeightSmall: 44,

  inputHeight: 52,

  iconButtonSize: 44,

  bottomTabHeight: 64,

  headerHeight: 60,

  cardPadding: 18,

  scannerFrameSize: 250,

  progressBarHeight: 8,
};

// --------------------------------------------------
// ANIMATION
// --------------------------------------------------

export const Animation = {
  instant: 100,
  fast: 150,
  normal: 250,
  smooth: 350,
  slow: 500,
};

// --------------------------------------------------
// LAYOUT
// --------------------------------------------------

export const Layout = {
  screenPadding: 20,
  screenPaddingSmall: 16,
  maxContentWidth: 600,
};

// --------------------------------------------------
// TYPOGRAPHY / RESPONSIVE BREAKPOINTS
// --------------------------------------------------

export const Breakpoints = {
  small: 360,
  medium: 390,
  large: 430,
};

// --------------------------------------------------
// NUTRITION SCORE COLORS
// --------------------------------------------------

export const getNutritionColor = (score: number): string => {
  if (score >= 4.5) return Colors.nutrition.excellent;
  if (score >= 3.5) return Colors.nutrition.good;
  if (score >= 2.5) return Colors.nutrition.moderate;
  if (score >= 1.5) return Colors.nutrition.caution;

  return Colors.nutrition.high;
};

// --------------------------------------------------
// EXPORT DEFAULT THEME
// --------------------------------------------------

const Theme = {
  Colors,
  Spacing,
  Radius,
  Typography,
  Shadows,
  Components,
  Animation,
  Layout,
  Breakpoints,
  getNutritionColor,
};

export default Theme;

