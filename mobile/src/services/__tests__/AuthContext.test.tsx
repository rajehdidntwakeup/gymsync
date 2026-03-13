import { renderHook, act } from '@testing-library/react-hooks';
import { AuthProvider, useAuth } from '../AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../api');

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

  it('should handle login', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { token: 'test-token' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ username: 'test', password: 'pass' });
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
  });

  it('should handle logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
    expect(result.current.user).toBeNull();
  });
});