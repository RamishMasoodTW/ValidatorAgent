import js from '@eslint/js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Apply recommended rules globally
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Web globals available in Node 18+
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly'
      }
    },
    rules: {
      // ── Unused variables ──────────────────────────────────────────────
      // Allow unused catch-binding variables prefixed with _ or named e/err
      // (common silent-catch pattern in a CLI installer tool)
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|e|err|error|cleanErr|buildErr|npmErr|addErr)'
        }
      ],

      // ── Empty blocks ──────────────────────────────────────────────────
      // Allow empty catch blocks (used throughout installer as silent-fail pattern)
      'no-empty': ['error', { allowEmptyCatch: true }],

      // ── Regex ──────────────────────────────────────────────────────────
      // This CLI tool intentionally uses ANSI control chars in regex to strip them
      'no-control-regex': 'off',
      // Regex escapes in ANSI terminal strings are intentional — off for this CLI tool
      'no-useless-escape': 'off',

      // ── General quality rules ─────────────────────────────────────────
      'no-debugger': 'error',
      'eqeqeq': ['error', 'always'],
      'no-unreachable': 'error',
      // Allow console (this is a CLI tool — console IS the output)
      'no-console': 'off'
    }
  },
  {
    // Ignore generated/build directories and config files
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'tests/**',
      'jest.config.js',
      'babel.config.json'
    ]
  }
];
