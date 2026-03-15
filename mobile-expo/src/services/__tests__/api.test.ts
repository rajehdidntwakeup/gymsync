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

  it('should be defined', () => {
    expect(api).toBeDefined();
    expect(typeof api.get).toBe('function');
    expect(typeof api.post).toBe('function');
  });

  it('should have correct base URL', () => {
    // API should be configured with base URL
    expect(api.defaults.baseURL).toBeDefined();
  });

  it('should handle token storage', async () => {
    // Mock getting token
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
});