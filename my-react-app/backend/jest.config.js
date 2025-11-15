/**
 * Jest 테스트 설정
 */
module.exports = {
  rootDir: './',
  testMatch: ['**/tests/**/*.test.js'],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'routes/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  verbose: true
};

