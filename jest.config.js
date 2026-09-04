/** @type {import('jest').Config} */
const config = {
  // Use babel-jest to transform ESM modules to CJS for Jest
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  // Allow babel-jest to transform pure-ESM packages in node_modules
  // (chalk v5, #ansi-styles, etc. are pure ESM and need transformation)
  transformIgnorePatterns: [
    '/node_modules/(?!(chalk|#ansi-styles|ansi-styles)/)'
  ],
  // Match test files in the tests/ directory
  testMatch: ['**/tests/**/*.test.js'],
  // Collect coverage only from files that have tests
  // (Large interactive/system modules like installer, branch-watcher are excluded
  //  as they require real git repos, OS interaction, and user input)
  collectCoverageFrom: [
    'src/rules/security-rules.js',
    'src/utils/logger.js'
  ],
  coverageReporters: ['text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      lines: 45,
      functions: 60,
      branches: 28,
      statements: 45
    },
    // Targeted threshold for the key security module
    './src/rules/security-rules.js': {
      lines: 45,
      functions: 65,
      branches: 28,
      statements: 45
    }
  },
  // Treat test environment as Node
  testEnvironment: 'node',
  // Clear mocks between tests
  clearMocks: true,
  // Verbose output for CI readability
  verbose: true
};

export default config;
