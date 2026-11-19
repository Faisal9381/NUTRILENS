import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../src/constants/theme';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>User Profile</Text>
          <Text style={styles.subtitle}>Nutritional preferences & personal diet settings</Text>
        </View>

        {/* Profile Card Placeholder */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarEmoji}>👤</Text>
          </View>
          <Text style={styles.profileName}>Guest User</Text>
          <Text style={styles.profileStatus}>Local Session</Text>
        </View>

        {/* Planned Features Notice */}
        <View style={styles.noticeCard}>
          <Text style={styles.badge}>Milestone: Step 5 Implementation</Text>
          <Text style={styles.noticeHeading}>Profile & Auth Architecture</Text>
          <Text style={styles.noticeBody}>
            User authentication (Firebase or FastAPI JWT), personal dietary settings, allergen alerts, and scan history synchronization will be implemented in Step 5.
          </Text>
        </View>

        {/* Planned Preference Slots (Placeholders) */}
        <Text style={styles.sectionTitle}>Planned Personalization Settings</Text>
        <View style={styles.menuList}>
          <View style={styles.menuItem}>
            <Text style={styles.menuItemTitle}>Dietary Preferences</Text>
            <Text style={styles.menuItemValue}>Vegetarian, Vegan, Gluten-Free...</Text>
          </View>
          <View style={styles.menuItem}>
            <Text style={styles.menuItemTitle}>Allergen Watchlist</Text>
            <Text style={styles.menuItemValue}>Peanuts, Dairy, Soy, Shellfish...</Text>
          </View>
          <View style={styles.menuItem}>
            <Text style={styles.menuItemTitle}>Nutritional Focus</Text>
            <Text style={styles.menuItemValue}>Low Sugar, High Protein, Low Sodium...</Text>
          </View>
          <View style={styles.menuItem}>
            <Text style={styles.menuItemTitle}>Scan History & Bookmarks</Text>
            <Text style={styles.menuItemValue}>Offline cached scans</Text>
          </View>
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
  },
  header: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  avatarCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: Spacing.md,
  },
  avatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  profileStatus: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  noticeCard: {
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    marginBottom: Spacing.lg,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginBottom: 6,
  },
  noticeHeading: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primaryDark,
    marginBottom: 4,
  },
  noticeBody: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  menuList: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  menuItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  menuItemValue: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
