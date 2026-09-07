import fs from 'fs';
import path from 'path';
import os from 'os';
import { runAutomatedUnitTests } from '../src/rules/typescript-validator.js';

describe('Step 5: Automated Unit Tests Execution & Runner Robustness', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatekeeper-test-runner-'));
    fs.mkdirSync(path.join(tmpDir, 'src', 'app'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('executes clean command for Angular CLI projects without unsupported --passWithNoTests flag', () => {
    // Write runner.js that rejects --passWithNoTests
    const runnerScript = `
      const args = process.argv.slice(2);
      if (args.includes('--passWithNoTests')) {
        console.error('Error: Unknown argument: passWithNoTests');
        process.exit(1);
      }
      console.log('Executed 1 of 1 SUCCESS');
      process.exit(0);
    `;
    fs.writeFileSync(path.join(tmpDir, 'runner.js'), runnerScript, 'utf8');

    const pkg = {
      name: 'test-ng-app',
      scripts: {
        test: 'node runner.js'
      }
    };
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'app.component.spec.ts'), '// test spec', 'utf8');

    const result = runAutomatedUnitTests(tmpDir, pkg);
    expect(result).toBeDefined();
    expect(result.command).toBe('npm test -- --watch=false');
    expect(result.command).not.toContain('--passWithNoTests');
    expect(result.specCount).toBe(1);
  });

  test('recovers and retries cleanly if test runner reports Unknown argument: passWithNoTests', () => {
    // Write runner.js that fails if --passWithNoTests is present, passes otherwise
    const runnerScript = `
      const args = process.argv.slice(2);
      if (args.includes('--passWithNoTests')) {
        console.error('Error: Unknown argument: passWithNoTests');
        process.exit(1);
      }
      console.log('All tests passed on retry');
      process.exit(0);
    `;
    fs.writeFileSync(path.join(tmpDir, 'runner.js'), runnerScript, 'utf8');

    const pkg = {
      name: 'test-retry-app',
      scripts: {
        'test:ci': 'node runner.js --passWithNoTests'
      }
    };
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'test.spec.ts'), '// test spec', 'utf8');

    const result = runAutomatedUnitTests(tmpDir, pkg);
    expect(result).toBeDefined();
    expect(result.command).toBe('npm run test:ci');
  });

  test('skips test gracefully if test provider or binary is missing instead of failing commit', () => {
    const runnerScript = `
      console.error('No binary for Chrome browser on your platform');
      process.exit(1);
    `;
    fs.writeFileSync(path.join(tmpDir, 'runner.js'), runnerScript, 'utf8');

    const pkg = {
      name: 'test-missing-provider',
      scripts: {
        'test:ci': 'node runner.js'
      }
    };
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');
    fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'test.spec.ts'), '// test spec', 'utf8');

    const result = runAutomatedUnitTests(tmpDir, pkg);
    expect(result.skipped).toBe(true);
  });

  test('injects and cleans up gatekeeper-smoke.spec.ts when no specs exist in project', () => {
    const runnerScript = `
      console.log('Smoke test passed');
      process.exit(0);
    `;
    fs.writeFileSync(path.join(tmpDir, 'runner.js'), runnerScript, 'utf8');

    const pkg = {
      name: 'test-smoke-injection',
      scripts: {
        'test:ci': 'node runner.js'
      }
    };
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');

    const result = runAutomatedUnitTests(tmpDir, pkg);
    expect(result.autoInjected).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'src', 'app', 'gatekeeper-smoke.spec.ts'))).toBe(false);
  });

  test('injects Vitest-compatible smoke spec with explicit imports when vitest is in devDependencies', () => {
    const runnerScript = `
      const fs = require('fs');
      const path = require('path');
      const smokePath = path.join(__dirname, 'src', 'app', 'gatekeeper-smoke.spec.ts');
      if (fs.existsSync(smokePath)) {
        const content = fs.readFileSync(smokePath, 'utf8');
        if (!content.includes("import { describe, it, expect } from 'vitest'")) {
          console.error("ReferenceError: describe is not defined");
          process.exit(1);
        }
      }
      console.log('Smoke test passed with Vitest imports');
      process.exit(0);
    `;
    fs.writeFileSync(path.join(tmpDir, 'runner.js'), runnerScript, 'utf8');

    const pkg = {
      name: 'test-vitest-app',
      devDependencies: {
        vitest: '^4.0.0'
      },
      scripts: {
        'test:ci': 'node runner.js'
      }
    };
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');

    const result = runAutomatedUnitTests(tmpDir, pkg);
    expect(result.autoInjected).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'src', 'app', 'gatekeeper-smoke.spec.ts'))).toBe(false);
  });
});

