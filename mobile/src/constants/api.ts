/**
 * Application Network & API Configuration
 * 
 * IMPORTANT: In local mobile development, 'localhost' on a physical device points
 * to the phone itself, NOT your development computer.
 * 
 * Use the following guidance:
 * - Android Emulator: 'http://10.0.2.2:8000'
 * - iOS Simulator: 'http://localhost:8000'
 * - Physical Phone via Wi-Fi: 'http://<YOUR_LOCAL_PC_IP>:8000' (e.g. http://192.168.1.5:8000)
 */

import { Platform } from 'react-native';

const getDevApiUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  if (Platform.OS === 'android') {
    // Standard Android emulator loopback alias to host machine
    return 'http://10.0.2.2:8000';
  }
  
  // iOS simulator or desktop browser fallback
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
};
