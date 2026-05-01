import { renderHook, act } from '@testing-library/react-hooks';
import { AuthProvider, useAuth } from '../AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { handlers: [] },
      response: { handlers: [] },
      use: jest.fn(),
    },
  },
  setAuthErrorCallback: jest.fn(),
}));

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('should start with loading state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
  });

  it('should set user after successful login', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      name: 'Test User',
      email: 'test@test.com',
      fitnessLevel: 'BEGINNER',
    };

    (api.post as jest.Mock).mockResolvedValue({
      data: { token: 'test-token', type: 'Bearer', userId: 1, username: 'testuser' },
    });
    (api.get as jest.Mock).mockResolvedValue({
      data: mockUser,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ username: 'test', password: 'pass' });
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
    expect(api.get).toHaveBeenCalledWith('/users/me');
    expect(result.current.user).toEqual(mockUser);
  });

  it('should clear user and token on logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
    expect(result.current.user).toBeNull();
  });

  it('should fetch user profile on checkAuth when token exists', async () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      name: 'Test User',
      email: 'test@test.com',
      fitnessLevel: 'BEGINNER',
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('existing-token');
    (api.get as jest.Mock).mockResolvedValue({ data: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      // Wait for checkAuth effect to complete
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(api.get).toHaveBeenCalledWith('/users/me');
    expect(result.current.user).toEqual(mockUser);
  });

  it('should clear token when checkAuth fails', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-token');
    (api.get as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
    expect(result.current.user).toBeNull();
  });

  it('should register and then auto-login', async () => {
    const mockUser = {
      id: 1,
      username: 'newuser',
      name: 'New User',
      email: 'new@test.com',
      fitnessLevel: 'BEGINNER',
    };

    (api.post as jest.Mock).mockResolvedValue({ data: { message: 'User registered successfully' } });
    // For the auto-login after register
    (api.post as jest.Mock)
      .mockResolvedValueOnce({ data: { message: 'User registered successfully' } })
      .mockResolvedValueOnce({ data: { token: 'new-token', type: 'Bearer', userId: 1, username: 'newuser' } });
    (api.get as jest.Mock).mockResolvedValue({ data: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.register({
        name: 'New User',
        username: 'newuser',
        email: 'new@test.com',
        password: 'password',
        fitnessLevel: 'BEGINNER',
      });
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'new-token');
    expect(result.current.user).toEqual(mockUser);
  });
});