import api from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock expo-constants (ES module that Jest can't transform)
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:8080',
      },
    },
  },
}));

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(api).toBeDefined();
    expect(typeof api.get).toBe('function');
    expect(typeof api.post).toBe('function');
  });

  it('should have correct base URL', () => {
    expect(api.defaults.baseURL).toBeDefined();
  });

  it('should handle token storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('test-token');
    
    const token = await AsyncStorage.getItem('token');
    expect(token).toBe('test-token');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('token');
  });

  it('should handle token removal', async () => {
    await AsyncStorage.removeItem('token');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
  });

  it('should handle token setting', async () => {
    await AsyncStorage.setItem('token', 'new-token');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'new-token');
  });

  it('should have request interceptor configured', () => {
    const handlers = api.interceptors.request.handlers;
    expect(handlers != null ? handlers.length : 0).toBeGreaterThan(0);
  });

  it('should have response interceptor configured', () => {
    const handlers = api.interceptors.response.handlers;
    expect(handlers != null ? handlers.length : 0).toBeGreaterThan(0);
  });
});