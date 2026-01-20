import { vi } from "vitest";

// Mock environment variables for testing
process.env.NODE_ENV = "test";

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global test timeout
vi.setConfig({ testTimeout: 10000 });
