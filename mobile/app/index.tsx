/**
 * NutriLens — App Entry Point / Auth Gate
 *
 * This screen runs first on every launch. It checks the auth state
 * and redirects the user appropriately:
 *   - Not logged in  →  /welcome  (Get Started / onboarding)
 *   - Logged in      →  /(tabs)   (main app)
 *
 * Shows a simple loading indicator while auth state is resolving
 * (AsyncStorage read), so the user never sees a flash.
 */
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContextProvider';

export default function IndexScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/welcome');
      }
    }
  }, [isLoading, isAuthenticated]);

  // Show a centered spinner while checking auth state
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#237A45" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2FBF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
