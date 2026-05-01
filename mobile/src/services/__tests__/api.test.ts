import api from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add token to requests when available', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('test-token');
    
    // Mock axios request
    const mockRequest = { headers: {} };
    // @ts-ignore - accessing internal interceptor
    const result = await api.interceptors.request.handlers[0].fulfilled(mockRequest);
    
    expect(result.headers.Authorization).toBe('Bearer test-token');
  });

  it('should not add Authorization header when no token', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    
    const mockRequest = { headers: {} };
    // @ts-ignore
    const result = await api.interceptors.request.handlers[0].fulfilled(mockRequest);
    
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('should handle 401 errors by removing token and calling auth callback', async () => {
    const mockCallback = jest.fn().mockResolvedValue(undefined);
    
    // @ts-ignore - accessing the exported function
    const { setAuthErrorCallback } = require('../api');
    setAuthErrorCallback(mockCallback);
    
    const error = {
      response: { status: 401 },
      config: {},
    };
    
    // @ts-ignore
    await api.interceptors.response.handlers[0].rejected(error);
    
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockCallback).toHaveBeenCalled();
  });

  it('should not retry on 401 if already retried', async () => {
    const error = {
      response: { status: 401 },
      config: { _retry: true },
    };
    
    // @ts-ignore
    await api.interceptors.response.handlers[0].rejected(error);
    
    // Should still remove the token
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
  });

  it('should not handle non-401 errors as auth errors', async () => {
    const error = {
      response: { status: 500 },
      config: {},
    };
    
    // @ts-ignore
    const result = api.interceptors.response.handlers[0].rejected(error);
    
    await expect(result).rejects.toEqual(error);
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });
});