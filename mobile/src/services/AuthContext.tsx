import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginCredentials, RegisterData } from '@types';
import api, { setAuthErrorCallback } from './api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('token');
    setUser(null);
  }, []);

  // Register the 401 callback so the api interceptor can trigger logout
  useEffect(() => {
    setAuthErrorCallback(logout);
    return () => setAuthErrorCallback(null);
  }, [logout]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        // Validate token by fetching user profile
        const response = await api.get('/users/me');
        setUser(response.data);
      }
    } catch (error) {
      // Token is invalid or expired — clear it
      console.error('Auth check failed:', error);
      await AsyncStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    const response = await api.post('/auth/login', credentials);
    const { token } = response.data;
    await AsyncStorage.setItem('token', token);
    // Fetch the full user profile after login
    const userResponse = await api.get('/users/me');
    setUser(userResponse.data);
  };

  const register = async (data: RegisterData) => {
    await api.post('/auth/register', data);
    // Auto-login after register
    await login({ username: data.username, password: data.password });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}