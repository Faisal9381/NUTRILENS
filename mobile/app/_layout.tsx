import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../src/constants/theme';
import { AuthProvider } from '../src/context/AuthContextProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.surface,
          },
          headerTintColor: Colors.primary,
          headerTitleStyle: {
            fontWeight: '600',
          },
          contentStyle: {
            backgroundColor: Colors.background,
          },
        }}
      >
        {/* Auth gate — redirects to /welcome or /(tabs) */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* Onboarding */}
        <Stack.Screen name="welcome" options={{ headerShown: false }} />

        {/* Auth screens */}
        <Stack.Screen name="auth/signin" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />

        {/* Main app tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Product screens */}
        <Stack.Screen
          name="product/analysis"
          options={{
            title: 'Product Analysis',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="product/compare"
          options={{
            title: 'Side-by-Side Comparison',
            presentation: 'card',
          }}
        />

        {/* AI Chat */}
        <Stack.Screen
          name="ai-chat"
          options={{ headerShown: false }}
        />
      </Stack>
    </AuthProvider>
  );
}
