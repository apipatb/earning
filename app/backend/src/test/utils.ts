/**
 * Test utilities for backend tests
 * Provides common helper functions and mocks
 */

import { Request, Response } from 'express';

/**
 * Create mock Express request
 */
export function createMockRequest(overrides = {}): Partial<Request> {
  return {
    body: {},
    params: {},
    query: {},
    headers: {
      authorization: 'Bearer test_token',
    },
    user: { id: '1', email: 'test@example.com' },
    ...overrides,
  };
}

/**
 * Create mock Express response
 */
export function createMockResponse(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
}

/**
 * Create mock user data
 */
export function createMockUser(overrides = {}) {
  return {
    id: '1',
    email: 'test@example.com',
    password: 'hashed_password',
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
    amount: 100.0,
    source: 'test-platform',
    date: new Date(),
    description: 'Test earning',
    platformId: null,
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
    amount: 50.0,
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
 * Create mock customer data
 */
export function createMockCustomer(overrides = {}) {
  return {
    id: '1',
    userId: '1',
    name: 'Test Customer',
    email: 'customer@example.com',
    phone: '1234567890',
    address: '123 Test St',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create mock invoice data
 */
export function createMockInvoice(overrides = {}) {
  return {
    id: '1',
    userId: '1',
    customerId: '1',
    amount: 1000.0,
    status: 'draft',
    dueDate: new Date(),
    description: 'Test invoice',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Verify response structure
 */
export function verifySuccessResponse(response: any, expectedStatus = 200) {
  expect(response.status).toHaveBeenCalledWith(expectedStatus);
  expect(response.json).toHaveBeenCalled();
}

/**
 * Verify error response structure
 */
export function verifyErrorResponse(response: any, expectedStatus = 400) {
  expect(response.status).toHaveBeenCalledWith(expectedStatus);
  expect(response.json).toHaveBeenCalled();
}

/**
 * Extract response data from mock response
 */
export function getResponseData(response: any) {
  if (!response.json.mock.calls.length) {
    return null;
  }
  return response.json.mock.calls[0][0];
}
