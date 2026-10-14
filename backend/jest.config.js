/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/*.test.ts", "**/*.spec.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/server.ts",
    "!src/seed.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  // Increase timeout for DB tests
  testTimeout: 60000,
  globalSetup: undefined,
  globalTeardown: undefined,
};
