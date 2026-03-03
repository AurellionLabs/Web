// @ts-nocheck - Test file with vitest setup issues
// Test setup file for vitest
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Extend expect with custom matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () =>
        `expected ${received} to be within range ${floor} - ${ceiling}`,
    };
  },
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollTo
window.scrollTo = vi.fn();

// Suppress specific console errors during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Increase timeout for async tests
vi.setConfig({ testTimeout: 30000 });

// Global mock for @privy-io/react-auth — provides safe defaults when
// PrivyProvider is not mounted (e.g. hooks that call useWallet in unit tests).
// Individual test files can override this with their own vi.mock.
vi.mock('@privy-io/react-auth', () => ({
  usePrivy: vi.fn(() => ({
    authenticated: false,
    ready: false,
    login: vi.fn(),
    logout: vi.fn(),
  })),
  useWallets: vi.fn(() => ({
    wallets: [],
    ready: false,
  })),
}));
