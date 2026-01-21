import { vi, beforeEach, afterEach } from "vitest";

// Mock environment variables for testing
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "error"; // Reduce log noise in tests
process.env.LOG_CONSOLE = "false"; // Disable console logging in tests

// Reset logger singleton before each test
beforeEach(async () => {
  const { resetLogger } = await import("../server/logging/logger");
  resetLogger();
});

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global test timeout
vi.setConfig({ testTimeout: 10000 });
