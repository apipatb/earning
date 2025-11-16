/**
 * Test utilities for frontend tests
 * Provides common helper functions and custom render
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <BrowserRouter>{children}</BrowserRouter>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Mock API response helper
 */
export function mockApiResponse<T>(data: T, status = 200) {
  return Promise.resolve({
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config: {},
  });
}

/**
 * Mock API error response helper
 */
export function mockApiError(message: string, status = 500) {
  const error: any = new Error(message);
  error.response = {
    status,
    data: { message },
  };
  return Promise.reject(error);
}

/**
 * Wait for async operations to complete
 */
export async function waitForAsync() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Create mock user data
 */
export function createMockUser(overrides = {}) {
  return {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock earning data
 */
export function createMockEarning(overrides = {}) {
  return {
    id: '1',
    userId: '1',
    amount: 100,
    source: 'test-platform',
    date: new Date(),
    description: 'Test earning',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock expense data
 */
export function createMockExpense(overrides = {}) {
  return {
    id: '1',
    userId: '1',
    amount: 50,
    category: 'Supplies',
    date: new Date(),
    description: 'Test expense',
    receipt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Reset all mocks helper
 */
export function resetAllMocks() {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
