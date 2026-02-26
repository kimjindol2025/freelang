export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', 'runtime/**/*.ts'],
  testTimeout: 20000,
  maxWorkers: 1,
};
