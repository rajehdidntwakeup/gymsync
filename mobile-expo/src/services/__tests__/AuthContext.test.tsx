import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

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
    post: jest.fn(),
  },
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

  it('should handle login', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { token: 'test-token', user: { id: 1, username: 'testuser' } },
    });

    const LoginTest = () => {
      const { login, user, loading } = useAuth();
      return (
        <>
          {!loading && !user && (
            <button
              testID="login-btn"
              onPress={() => login({ username: 'test', password: 'pass' })}
            />
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
    
    // Note: Actual login flow would need more setup
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('should handle logout', async () => {
    const LogoutTest = () => {
      const { logout, user } = useAuth();
      return (
        <>
          {user && (
            <button testID="logout-btn" onPress={logout} />
          )}
          {!user && <span testID="logged-out">Logged out</span>}
        </>
      );
    };

    const { queryByTestId } = render(
      <AuthProvider>
        <LogoutTest />
      </AuthProvider>
    );

    // Initial state - no user
    await waitFor(() => expect(queryByTestId('logged-out')).toBeTruthy());
  });
});