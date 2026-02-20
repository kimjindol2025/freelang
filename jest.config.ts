export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/mvp.test.ts'],
  collectCoverageFrom: ['src/mvp/**/*.ts'],
  testTimeout: 20000,
  maxWorkers: 1,
};
