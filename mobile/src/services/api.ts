import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth error callback - set by AuthContext to handle 401 errors
let onAuthError: (() => Promise<void>) | null = null;

export function setAuthErrorCallback(callback: (() => Promise<void>) | null) {
  onAuthError = callback;
}

// Request interceptor to add JWT token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loops - don't retry if already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Token expired or invalid - clear storage and notify AuthContext
      await AsyncStorage.removeItem('token');

      if (onAuthError) {
        await onAuthError();
      }
    }

    return Promise.reject(error);
  }
);

export default api;