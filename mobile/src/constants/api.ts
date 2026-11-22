/**
 * Application Network & API Configuration
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getDevApiUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Automatically extract host machine LAN IP for physical devices running via Expo Go
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:8000`;
    }
  }
  
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  
  return 'http://localhost:8000';
};

export const API_BASE_URL = getDevApiUrl();

export const API_ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/health`,
  API_V1_HEALTH: `${API_BASE_URL}/api/v1/health`,
  SCAN: `${API_BASE_URL}/api/v1/products/barcode`,
  NUTRITION_SCORE: `${API_BASE_URL}/api/v1/nutrition/score`,
  PARSE_TEXT: `${API_BASE_URL}/api/v1/nutrition/parse-text`,
  OCR_IMAGE: `${API_BASE_URL}/api/v1/nutrition/ocr-image`,
  AI_EXPLAIN: `${API_BASE_URL}/api/v1/ai/explain`,
  AI_COMPARE: `${API_BASE_URL}/api/v1/ai/compare`,
  AI_CHAT: `${API_BASE_URL}/api/v1/ai/chat`,
  AUTH_REGISTER: `${API_BASE_URL}/api/v1/auth/register`,
  AUTH_LOGIN: `${API_BASE_URL}/api/v1/auth/login`,
  AUTH_GOOGLE: `${API_BASE_URL}/api/v1/auth/google`,
  AUTH_ME: `${API_BASE_URL}/api/v1/auth/me`,
  HISTORY: `${API_BASE_URL}/api/v1/history`,
};
