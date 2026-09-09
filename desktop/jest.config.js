module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@main/(.*)$': '<rootDir>/src/main/$1',
    '^@renderer/(.*)$': '<rootDir>/src/renderer/$1'
  },
  testMatch: ['<rootDir>/src/**/*.test.js']
};
