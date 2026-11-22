/**
 * NutriLens — Sign In / Sign Up Screen
 *
 * Authentication:
 *   • Email + Password → FastAPI backend (/auth/register, /auth/login)
 *   • Google Sign-In   → expo-auth-session Google provider → FastAPI /auth/google
 *   • Apple / Demo     → offline demo session (Apple OAuth needs paid dev cert)
 *
 * Google OAuth setup (one-time, free):
 *   1. Go to https://console.cloud.google.com
 *   2. Create a project → Enable "Google+ API" or "Google Identity"
 *   3. OAuth 2.0 Credentials → Web Client → Authorised redirect URI:
 *      https://auth.expo.io/@your-expo-username/nutrilens
 *   4. Copy the Web Client ID into EXPO_PUBLIC_GOOGLE_CLIENT_ID in mobile/.env
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  StatusBar,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../../src/context/AuthContextProvider';

// Required for Expo managed Google OAuth to complete the browser session
WebBrowser.maybeCompleteAuthSession();

// ── Google Client ID from env ────────────────────────────────────────────
// Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in mobile/.env
// Get it from: https://console.cloud.google.com → APIs & Services → Credentials
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

export default function SignInScreen() {
  const router = useRouter();
  const { login, register, loginWithGoogle, loginGuestDemo } = useAuth();

  const [mode, setMode]                   = useState<'signin' | 'signup'>('signin');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const handledAuthRef = useRef(false);

  // ── Google Auth Session ──────────────────────────────────────────────
  const redirectUri = AuthSession.makeRedirectUri({
    native: 'com.nutrilens.app:/oauthredirect',
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
    redirectUri,
  });

  // Direct incoming deep-link listener to capture OAuth redirect
  useEffect(() => {
    const processOAuthUrl = async (url: string) => {
      if (!url || !url.includes('oauthredirect')) return;
      if (handledAuthRef.current) return;

      const codeMatch = url.match(/[?&]code=([^&#]*)/);
      const errorMatch = url.match(/[?&]error=([^&#]*)/);

      if (errorMatch) {
        setGoogleLoading(false);
        setError('Google Sign-In was cancelled or denied.');
        return;
      }

      if (codeMatch && request) {
        handledAuthRef.current = true;
        setGoogleLoading(true);
        try {
          const code = decodeURIComponent(codeMatch[1]);
          const tokenResult = await AuthSession.exchangeCodeAsync(
            {
              clientId: GOOGLE_WEB_CLIENT_ID,
              code,
              redirectUri: request.redirectUri,
              extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : {},
            },
            Google.discovery
          );
          await handleGoogleSuccess(tokenResult);
        } catch {
          handledAuthRef.current = false;
          setGoogleLoading(false);
          setError('Google authentication failed. Please try again.');
        }
      }
    };

    const sub = Linking.addEventListener('url', (event) => {
      processOAuthUrl(event.url);
    });

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) processOAuthUrl(initialUrl);
    });

    return () => {
      sub.remove();
    };
  }, [request]);

  // Handle Google OAuth response from hook
  useEffect(() => {
    if (response?.type === 'success') {
      if (!handledAuthRef.current) {
        handledAuthRef.current = true;
        handleGoogleSuccess(response.authentication || (response as any).params);
      }
    } else if (response?.type === 'error') {
      setGoogleLoading(false);
      setError('Google Sign-In failed. Please try again.');
    } else if (response?.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleSuccess = async (auth: any) => {
    setGoogleLoading(true);
    try {
      const responseParams = (response && response.type === 'success') ? (response as any).params : undefined;
      const accessToken = auth?.accessToken || auth?.access_token || responseParams?.access_token;
      const idToken = auth?.idToken || auth?.id_token || responseParams?.id_token || accessToken;

      let email = '';
      let name = '';
      let googleId = '';

      if (accessToken) {
        try {
          const userInfoRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (userInfoRes.ok) {
            const googleUser = await userInfoRes.json();
            email = googleUser.email || '';
            name = googleUser.name || '';
            googleId = googleUser.id || '';
          }
        } catch {
          // Backend validates token cryptographically
        }
      }

      const res = await loginWithGoogle({
        email,
        name,
        google_id: googleId,
        id_token: idToken,
      });

      setGoogleLoading(false);
      if (res.success) {
        router.replace('/(tabs)');
      } else {
        handledAuthRef.current = false;
        setError(res.error || 'Google Sign-In failed.');
      }
    } catch {
      handledAuthRef.current = false;
      setGoogleLoading(false);
      setError('Could not complete Google Sign-In. Please try again.');
    }
  };

  // ── Email / Password ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    let result;
    try {
      if (mode === 'signin') {
        result = await login({ email: email.trim(), password });
      } else {
        result = await register({
          email: email.trim(),
          password,
          age_group: 'Adult (19-50)',
          dietary_preferences: [],
          allergies: [],
        });
      }
    } catch (err: any) {
      result = { success: false, error: err.message || 'Network connection failed.' };
    }

    setLoading(false);
    if (result.success) {
      router.replace('/(tabs)');
    } else {
      setError(result.error || 'Connection failed. Make sure the backend is running.');
    }
  };

  // ── Trigger Google OAuth popup ────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setError(null);

    if (!GOOGLE_WEB_CLIENT_ID) {
      // No client ID configured — show setup instructions
      Alert.alert(
        'Google Sign-In Setup Required',
        'To enable Google Sign-In:\n\n' +
        '1. Go to console.cloud.google.com\n' +
        '2. Create a project & OAuth Web Client ID\n' +
        '3. Add EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_id to mobile/.env\n' +
        '4. Restart Expo\n\n' +
        'For now, use the Demo Session to explore the app.',
        [
          { text: 'Use Demo Session', onPress: handleOfflineDemo },
          { text: 'OK' },
        ]
      );
      return;
    }

    setGoogleLoading(true);
    try {
      await promptAsync();
    } catch (err) {
      setGoogleLoading(false);
      setError('Google Sign-In could not start.');
    }
  };

  // ── Offline / Demo session ────────────────────────────────────────────
  const handleOfflineDemo = async () => {
    await loginGuestDemo(email.trim() || 'demo@nutrilens.app');
    router.replace('/(tabs)');
  };

  const handleForgotPassword = () => {
    Alert.alert('Reset Password', 'Password reset instructions will be sent to your email.');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo + Title ── */}
          <View style={styles.logoGroup}>
            <View style={styles.leafBadge}>
              <Text style={styles.leafIcon}>🍃</Text>
            </View>
            <Text style={styles.appName}>NutriLens</Text>
            <Text style={styles.subtitle}>Optimize your health, simply.</Text>
          </View>

          {/* ── Segmented Tabs ── */}
          <View style={styles.segContainer}>
            <TouchableOpacity
              style={[styles.segTab, mode === 'signin' && styles.segTabActive]}
              onPress={() => { setMode('signin'); setError(null); }}
            >
              <Text style={[styles.segLabel, mode === 'signin' && styles.segLabelActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segTab, mode === 'signup' && styles.segTabActive]}
              onPress={() => { setMode('signup'); setError(null); }}
            >
              <Text style={[styles.segLabel, mode === 'signup' && styles.segLabelActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Error Banner ── */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️  {error}</Text>
              <TouchableOpacity onPress={handleOfflineDemo} style={styles.demoBtn}>
                <Text style={styles.demoBtnText}>⚡ Continue with Demo Session</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Form ── */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email *"
              placeholderTextColor="#A0ADA3"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0, padding: 0 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Password *"
                placeholderTextColor="#A0ADA3"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            {mode === 'signin' && (
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotRow}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.ctaBtn, loading && styles.ctaBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.87}
            >
              {loading
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <Text style={styles.ctaBtnText}>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
              }
            </TouchableOpacity>
          </View>

          {/* ── Divider ── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Social Buttons ── */}
          <View style={styles.socialRow}>
            {/* Google */}
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={handleGoogleSignIn}
              disabled={googleLoading || !request}
              activeOpacity={0.8}
            >
              {googleLoading
                ? <ActivityIndicator size="small" color="#237A45" />
                : (
                  <>
                    <Text style={styles.googleG}>G</Text>
                    <Text style={styles.socialBtnText}>Google</Text>
                  </>
                )
              }
            </TouchableOpacity>

            {/* Apple / Demo */}
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={handleOfflineDemo}
              activeOpacity={0.8}
            >
              <Text style={styles.appleIcon}></Text>
              <Text style={styles.socialBtnText}>Demo</Text>
            </TouchableOpacity>
          </View>

          {/* Google setup hint when no client ID is set */}
          {!GOOGLE_WEB_CLIENT_ID && (
            <Text style={styles.googleHint}>
              💡 Google Sign-In needs a free Google Cloud OAuth Client ID.{'\n'}
              Tap "G Google" for setup instructions.
            </Text>
          )}

          {/* ── Back link ── */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F5FBF6',
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },

  logoGroup: {
    alignItems: 'center',
    marginBottom: 28,
  },
  leafBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#237A45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  leafIcon:   { fontSize: 32 },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#185C35',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#607869',
  },

  segContainer: {
    flexDirection: 'row',
    backgroundColor: '#EEF5EF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  segTab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  segTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  segLabel:       { fontSize: 14, fontWeight: '600', color: '#7A9980' },
  segLabelActive: { color: '#185C35' },

  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { fontSize: 13, color: '#DC2626', fontWeight: '500' },
  demoBtn: {
    backgroundColor: '#185C35',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 7,
    alignSelf: 'flex-start',
  },
  demoBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  form: {
    gap: 14,
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D9E6DC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 15 : 13,
    fontSize: 15,
    color: '#1A2E22',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D9E6DC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 15 : 13,
  },
  eyeBtn:  { paddingLeft: 10 },
  eyeIcon: { fontSize: 18, color: '#237A45' },

  forgotRow: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { fontSize: 14, fontWeight: '600', color: '#237A45' },

  ctaBtn: {
    backgroundColor: '#185C35',
    paddingVertical: 16,
    borderRadius: 13,
    alignItems: 'center',
    shadowColor: '#185C35',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaBtnDisabled: { opacity: 0.65 },
  ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#D9E6DC' },
  dividerText: { fontSize: 13, color: '#7A9980', paddingHorizontal: 12, fontWeight: '500' },

  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#237A45',
    backgroundColor: '#FFFFFF',
  },
  googleG:       { fontSize: 16, fontWeight: '900', color: '#4285F4' },
  appleIcon:     { fontSize: 18, color: '#1A1A1A' },
  socialBtnText: { fontSize: 14, fontWeight: '700', color: '#185C35' },

  googleHint: {
    fontSize: 12,
    color: '#7A9980',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },

  backRow: { alignItems: 'center', marginTop: 8 },
  backText: { fontSize: 13, color: '#7A9980', fontWeight: '500' },
});
