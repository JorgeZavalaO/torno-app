// Jest setup file
// This file is referenced in jest.config.ts as setupFilesAfterEnv
// Add any global test setup here

// Mock Next.js unstable_cache
jest.mock('next/cache', () => ({
  unstable_cache: jest.fn((fn) => fn),
}));

// Mock Next.js headers
jest.mock('next/headers', () => ({
  headers: jest.fn(() => new Map()),
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));