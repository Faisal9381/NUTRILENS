import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, UserRegisterPayload, UserLoginPayload, UserUpdatePayload } from '../types/auth_models';
import {
  registerUser,
  loginUser,
  loginGoogleUser,
  fetchUserProfile,
  updateUserProfile,
} from '../services/apiClient';

const AUTH_TOKEN_KEY = '@nutrilens_auth_token';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: UserLoginPayload) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (payload: { email: string; name?: string; google_id?: string; id_token?: string }) => Promise<{ success: boolean; error?: string }>;
  loginGuestDemo: (email?: string) => Promise<{ success: boolean }>;
  register: (payload: UserRegisterPayload) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (payload: UserUpdatePayload) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadStoredToken();
  }, []);

  const loadStoredToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (storedToken) {
        setToken(storedToken);
        const res = await fetchUserProfile(storedToken);
        if (res.success && res.data) {
          setUser(res.data);
        } else {
          if (storedToken.startsWith('demo_token_')) {
            setUser({
              id: 999,
              email: storedToken.replace('demo_token_', ''),
              age_group: 'Adult (19-50)',
              dietary_preferences: ['Vegetarian'],
              allergies: [],
              nutritional_preferences: { low_sugar: true, high_protein: true },
            });
          } else {
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
            setToken(null);
            setUser(null);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load stored auth token:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (payload: UserLoginPayload) => {
    setIsLoading(true);
    const res = await loginUser(payload);
    if (res.success && res.data?.access_token) {
      const newToken = res.data.access_token;
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken);
      setToken(newToken);
      const profileRes = await fetchUserProfile(newToken);
      if (profileRes.success && profileRes.data) {
        setUser(profileRes.data);
      }
      setIsLoading(false);
      return { success: true };
    } else {
      setIsLoading(false);
      return { success: false, error: res.error || 'Login failed.' };
    }
  };

  const loginWithGoogle = async (payload: { email: string; name?: string; google_id?: string; id_token?: string }) => {
    setIsLoading(true);
    const res = await loginGoogleUser(payload);
    if (res.success && res.data?.access_token) {
      const newToken = res.data.access_token;
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken);
      setToken(newToken);
      const profileRes = await fetchUserProfile(newToken);
      if (profileRes.success && profileRes.data) {
        setUser(profileRes.data);
      }
      setIsLoading(false);
      return { success: true };
    } else {
      setIsLoading(false);
      return { success: false, error: res.error || 'Google login failed.' };
    }
  };

  const loginGuestDemo = async (email: string = 'imraanfaisal376@gmail.com') => {
    setIsLoading(true);
    const demoToken = `demo_token_${email}`;
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, demoToken);
    setToken(demoToken);
    setUser({
      id: 999,
      email: email,
      age_group: 'Adult (19-50)',
      dietary_preferences: ['Vegetarian'],
      allergies: [],
      nutritional_preferences: { low_sugar: true, high_protein: true },
    });
    setIsLoading(false);
    return { success: true };
  };

  const register = async (payload: UserRegisterPayload) => {
    setIsLoading(true);
    const res = await registerUser(payload);
    if (res.success && res.data?.access_token) {
      const newToken = res.data.access_token;
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, newToken);
      setToken(newToken);
      const profileRes = await fetchUserProfile(newToken);
      if (profileRes.success && profileRes.data) {
        setUser(profileRes.data);
      }
      setIsLoading(false);
      return { success: true };
    } else {
      setIsLoading(false);
      return { success: false, error: res.error || 'Registration failed.' };
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
    setIsLoading(false);
  };

  const updateProfile = async (payload: UserUpdatePayload) => {
    if (!token) return { success: false, error: 'User is not logged in.' };
    if (token.startsWith('demo_token_')) {
      setUser((prev) => (prev ? { ...prev, ...payload } : null));
      return { success: true };
    }
    const res = await updateUserProfile(payload, token);
    if (res.success && res.data) {
      setUser(res.data);
      return { success: true };
    } else {
      return { success: false, error: res.error || 'Failed to update profile.' };
    }
  };

  const refreshProfile = async () => {
    if (token && !token.startsWith('demo_token_')) {
      const res = await fetchUserProfile(token);
      if (res.success && res.data) {
        setUser(res.data);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        loginWithGoogle,
        loginGuestDemo,
        register,
        logout,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
