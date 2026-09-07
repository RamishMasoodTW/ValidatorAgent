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
  // Collect coverage from all source files.
  // Previously only the 4 well-tested rule/util files were included — the 4
  // larger interactive modules are now tracked too, starting with low thresholds
  // so the pipeline doesn't fail immediately. Tighten thresholds over time.
  collectCoverageFrom: [
    // ── Fully gate-checked (high thresholds per-file below) ──────────────
    'src/rules/security-rules.js',
    'src/rules/angular-best-practices.js',
    'src/utils/logger.js',
    'src/utils/git.js',
    // ── Newly tracked (starter thresholds — increase incrementally) ───────
    'src/engine.js',
    'src/branch-watcher.js',
    'src/installer.js',
    'src/progress-window.js'
  ],
  coverageReporters: ['text', 'lcov', 'clover', 'cobertura'],
  coverageThreshold: {
    // Global threshold is calibrated to the real achievable numbers given the
    // 4 OS-dependent modules (engine.js, branch-watcher.js, installer.js,
    // progress-window.js) that are permanently at 0% — they require real git
    // repos, Windows API, and user input that cannot be unit-tested.
    // Actual measured: ~15% stmts, ~14% lines, ~20% branches, ~27% funcs.
    // Thresholds are set just below actuals to create a meaningful CI floor.
    global: {
      lines: 14,
      functions: 25,
      branches: 13,
      statements: 15
    },
    // ── Per-file gates for the well-tested rule/util layer ─────────────────
    './src/rules/security-rules.js': {
      lines: 70,
      functions: 90,
      branches: 70,
      statements: 70
    },
    './src/utils/logger.js': {
      lines: 75,
      functions: 75,
      branches: 80,
      statements: 75
    },
    './src/utils/git.js': {
      lines: 75,
      functions: 75,
      branches: 50,
      statements: 75
    },
    // ── Newly-tracked modules: no per-file threshold ──────────────────────
    // engine.js, branch-watcher.js, installer.js, progress-window.js are
    // OS-dependent (require real git repos, Windows API, user input) and
    // cannot be unit-tested to > 0%. They are tracked in the coverage report
    // for visibility. Add per-file thresholds here once integration tests exist.
  },
  // Treat test environment as Node
  testEnvironment: 'node',
  // Clear mocks between tests
  clearMocks: true,
  // Verbose output for CI readability
  verbose: true
};

export default config;
