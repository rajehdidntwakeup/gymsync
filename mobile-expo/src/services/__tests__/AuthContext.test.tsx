import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthErrorCallback } from '../api';

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

// Test component to access auth context
function TestComponent() {
  const auth = useAuth();
  return (
    <>
      {auth.loading && <span testID="loading">Loading</span>}
      {auth.user && <span testID="user">{auth.user.username}</span>}
      {!auth.user && !auth.loading && <span testID="no-user">No user</span>}
    </>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start with loading state', () => {
    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(getByTestId('loading')).toBeTruthy();
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

    const LoginTest = () => {
      const { login, user, loading } = useAuth();
      return (
        <>
          {!loading && !user && (
            <button testID="login-btn" onPress={() => login({ username: 'test', password: 'pass' })} />
          )}
          {user && <span testID="logged-in">{user.username}</span>}
        </>
      );
    };

    const { getByTestId, queryByTestId } = render(
      <AuthProvider>
        <LoginTest />
      </AuthProvider>
    );

    await waitFor(() => expect(queryByTestId('login-btn')).toBeTruthy());

    await act(async () => {
      await getByTestId('login-btn').props.onPress();
    });

    await waitFor(() => expect(queryByTestId('logged-in')).toBeTruthy());
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
  });

  it('should clear user on logout', async () => {
    const LogoutTest = () => {
      const { logout, user } = useAuth();
      return (
        <>
          {user && <button testID="logout-btn" onPress={logout} />}
          {!user && <span testID="logged-out">Logged out</span>}
        </>
      );
    };

    const { queryByTestId } = render(
      <AuthProvider>
        <LogoutTest />
      </AuthProvider>
    );

    await waitFor(() => expect(queryByTestId('logged-out')).toBeTruthy());
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

    const { queryByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(queryByTestId('user')).toBeTruthy());
  });

  it('should clear token when checkAuth fails', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-token');
    (api.get as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

    const { queryByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(queryByTestId('no-user')).toBeTruthy());
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
  });
});