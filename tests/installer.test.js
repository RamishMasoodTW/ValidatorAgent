/**
 * Unit Tests: installer workflow generator
 * Verifies that the auto-generated CI/CD workflow enforces strict CI gates
 * without swallowing errors (zero '|| true' on type checks) and includes CD stages.
 */

import fs from 'fs';
import path from 'path';

describe('Auto-generated CI/CD Workflow Specification', () => {
  let installerContent;

  beforeAll(() => {
    const installerPath = path.join(__dirname, '..', 'src', 'installer.js');
    installerContent = fs.readFileSync(installerPath, 'utf8');
  });

  test('workflow generation template exists in installer.js', () => {
    expect(installerContent).toContain('name: Angular CI/CD Quality & Delivery Pipeline');
  });

  test('strictly enforces TypeScript compilation without swallowing errors (no "|| true")', () => {
    // Look for the tsc step in the workflow template
    const tscMatch = installerContent.match(/npx tsc --noEmit[^\n]*/);
    expect(tscMatch).not.toBeNull();
    // Must NOT contain '|| true' which would hide TypeScript compile errors in CI
    expect(tscMatch[0]).not.toContain('|| true');
    expect(tscMatch[0]).toContain('--skipLibCheck');
  });

  test('includes dependency security audit in generated CI workflow', () => {
    expect(installerContent).toContain('npm audit --audit-level=high');
  });

  test('includes clean dependencies install (npm ci) in generated CI workflow', () => {
    expect(installerContent).toContain('run: npm ci');
  });

  test('includes CD delivery readiness job in generated workflow', () => {
    expect(installerContent).toContain('delivery-readiness:');
    expect(installerContent).toContain('actions/upload-artifact@v4');
    expect(installerContent).toContain('index.html verified');
  });

  test('enforces concurrency cancel-in-progress to save runner compute', () => {
    expect(installerContent).toContain('cancel-in-progress: true');
  });
});
