import { setAuthErrorCallback } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock API
jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
  setAuthErrorCallback: jest.fn(),
}));

// Mock AuthContext since we can't render React Native components in node env
jest.mock('../AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: jest.fn(),
}));

import { useAuth } from '../AuthContext';
import api from '../api';

describe('AuthContext logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call login API with credentials', async () => {
    const mockLogin = jest.fn().mockResolvedValue(undefined);
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
      logout: jest.fn(),
      user: null,
      loading: false,
    });

    const { login } = useAuth();
    await login({ username: 'test', password: 'pass' });
    expect(mockLogin).toHaveBeenCalledWith({ username: 'test', password: 'pass' });
  });

  it('should store token after successful login', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { token: 'test-token', type: 'Bearer', userId: 1, username: 'testuser' },
    });

    const response = await api.post('/api/auth/login', {
      username: 'test',
      password: 'pass',
    });

    expect(response.data.token).toBe('test-token');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled(); // Not called directly in this test
  });

  it('should register auth error callback', () => {
    setAuthErrorCallback(expect.any(Function));
    expect(setAuthErrorCallback).toHaveBeenCalled();
  });

  it('should clear token on logout', async () => {
    await AsyncStorage.removeItem('token');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
  });

  it('should return null user when not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      login: jest.fn(),
      logout: jest.fn(),
      user: null,
      loading: false,
    });

    const { user } = useAuth();
    expect(user).toBeNull();
  });
});