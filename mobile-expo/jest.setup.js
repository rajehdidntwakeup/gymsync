// Jest setup file for Expo
import '@testing-library/jest-native/extend-expect';

// Mock Expo modules
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));