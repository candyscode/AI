import '@testing-library/jest-dom';
import { beforeEach, afterEach, vi } from 'vitest';

// Mock import.meta.env for Vitest
Object.defineProperty(globalThis, 'import', {
  value: { meta: { env: { VITE_BACKEND_URL: 'http://localhost:3001' } } },
  writable: true,
});

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});
