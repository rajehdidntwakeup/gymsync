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

  it('should handle 401 errors by removing token', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('expired-token');
    
    const error = {
      response: { status: 401 },
    };
    
    // @ts-ignore
    await api.interceptors.response.handlers[0].rejected(error);
    
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
  });
});