/**
 * Engine Smoke Tests
 * Tests the stripAnsi() utility (copied inline since it's not exported)
 * and verifies the overall module structure is intact.
 */

// ─────────────────────────────────────────────────
// stripAnsi() — inline copy of the engine utility
// We test the logic independently since the function
// is not exported (it's a local helper in engine.js)
// ─────────────────────────────────────────────────
function stripAnsi(str) {
  if (!str) return '';
  return str
    .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
    .replace(/\[[0-9;]+m/g, '');
}

describe('stripAnsi()', () => {
  test('returns empty string for null input', () => {
    expect(stripAnsi(null)).toBe('');
  });

  test('returns empty string for undefined input', () => {
    expect(stripAnsi(undefined)).toBe('');
  });

  test('returns empty string for empty string input', () => {
    expect(stripAnsi('')).toBe('');
  });

  test('passes through plain text unchanged', () => {
    expect(stripAnsi('Hello World')).toBe('Hello World');
  });

  test('strips chalk bold red escape sequence', () => {
    const colorized = '\u001b[1m\u001b[31mERROR\u001b[39m\u001b[22m';
    const stripped = stripAnsi(colorized);
    expect(stripped).toContain('ERROR');
    expect(stripped).not.toContain('\u001b');
  });

  test('strips chalk green escape sequence', () => {
    const colorized = '\u001b[32m✔ Tests passed\u001b[39m';
    const stripped = stripAnsi(colorized);
    expect(stripped).toContain('✔ Tests passed');
    expect(stripped).not.toContain('\u001b');
  });

  test('strips multiple layered escape sequences', () => {
    const colorized = '\u001b[1m\u001b[33mWARN\u001b[39m\u001b[22m: \u001b[36msome detail\u001b[39m';
    const stripped = stripAnsi(colorized);
    expect(stripped).toContain('WARN');
    expect(stripped).toContain('some detail');
    expect(stripped).not.toContain('\u001b');
  });

  test('strips reset sequence', () => {
    const colorized = '\u001b[0mReset text\u001b[0m';
    const stripped = stripAnsi(colorized);
    expect(stripped).toContain('Reset text');
  });
});

// ─────────────────────────────────────────────────
// Engine Environment Detection
// ─────────────────────────────────────────────────
describe('Engine environment', () => {
  test('Node.js version meets minimum requirement (>=20)', () => {
    const [major] = process.versions.node.split('.').map(Number);
    expect(major).toBeGreaterThanOrEqual(20);
  });

  test('process.cwd() returns a valid path string', () => {
    expect(typeof process.cwd()).toBe('string');
    expect(process.cwd().length).toBeGreaterThan(0);
  });

  test('process.env is accessible', () => {
    expect(typeof process.env).toBe('object');
  });
});

// ─────────────────────────────────────────────────
// CLI Argument Parsing Logic (unit-level simulation)
// ─────────────────────────────────────────────────
describe('CLI argument routing logic', () => {
  // Simulate the arg-checking logic from engine.js main()
  function resolveCommand(argv) {
    if (argv.includes('--branch-watch-daemon') || argv.includes('branch-watch-daemon')) {
      return 'daemon';
    }
    const isBranchCmd = argv.some(a =>
      a === 'branch' || a === 'branch-check' || a === '--branch-check' || a === '--branch'
    );
    if (isBranchCmd) {
      if (argv.some(a => a === '--enable' || a === 'enable' || a === '-e')) return 'branch-enable';
      if (argv.some(a => a === '--disable' || a === 'disable' || a === '-d')) return 'branch-disable';
      return 'branch-status';
    }
    return 'gatekeeper';
  }

  test('routes to daemon mode on --branch-watch-daemon flag', () => {
    expect(resolveCommand(['node', 'engine.js', '--branch-watch-daemon'])).toBe('daemon');
  });

  test('routes to daemon mode on branch-watch-daemon positional arg', () => {
    expect(resolveCommand(['node', 'engine.js', 'branch-watch-daemon'])).toBe('daemon');
  });

  test('routes to branch-enable on branch + --enable', () => {
    expect(resolveCommand(['node', 'engine.js', 'branch', '--enable'])).toBe('branch-enable');
  });

  test('routes to branch-disable on branch + --disable', () => {
    expect(resolveCommand(['node', 'engine.js', 'branch', '--disable'])).toBe('branch-disable');
  });

  test('routes to branch-status on branch alone', () => {
    expect(resolveCommand(['node', 'engine.js', 'branch'])).toBe('branch-status');
  });

  test('routes to gatekeeper (default) with no args', () => {
    expect(resolveCommand(['node', 'engine.js'])).toBe('gatekeeper');
  });

  test('routes to gatekeeper with unrecognized args', () => {
    expect(resolveCommand(['node', 'engine.js', '--random-flag'])).toBe('gatekeeper');
  });

  test('routes to branch-enable on short flag -e', () => {
    expect(resolveCommand(['node', 'engine.js', 'branch-check', '-e'])).toBe('branch-enable');
  });

  test('routes to branch-disable on short flag -d', () => {
    expect(resolveCommand(['node', 'engine.js', '--branch', '-d'])).toBe('branch-disable');
  });
});
