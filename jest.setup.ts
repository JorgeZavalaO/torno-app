// Jest setup file
// This file is referenced in jest.config.ts as setupFilesAfterEnv
// Add any global test setup here
import '@testing-library/jest-dom';

// Mock Next.js unstable_cache y helpers de revalidación
jest.mock('next/cache', () => ({
  unstable_cache: jest.fn((fn) => fn),
  unstable_noStore: jest.fn(() => {}),
  revalidatePath: jest.fn(() => {}),
  revalidateTag: jest.fn(() => {}),
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

// Nota: 'server-only' se mapea a un mock vía moduleNameMapper en jest.config.ts