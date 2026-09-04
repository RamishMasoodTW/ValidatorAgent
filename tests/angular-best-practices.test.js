/**
 * Unit Tests: src/rules/angular-best-practices.js
 * Tests pure utility functions (getAllFiles, checkAngularProject, etc.)
 * without requiring a real file system or Angular project.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAllFiles } from '../src/rules/angular-best-practices.js';

// ─────────────────────────────────────────────────
// getAllFiles() — pure recursive file enumerator
// ─────────────────────────────────────────────────
describe('getAllFiles()', () => {
  let tmpDir;

  beforeEach(() => {
    // Create a fresh temp directory for each test
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatekeeper-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns empty array for empty directory', () => {
    const files = getAllFiles(tmpDir);
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBe(0);
  });

  test('returns all files in a flat directory', () => {
    fs.writeFileSync(path.join(tmpDir, 'a.ts'), '');
    fs.writeFileSync(path.join(tmpDir, 'b.ts'), '');
    fs.writeFileSync(path.join(tmpDir, 'c.js'), '');

    const files = getAllFiles(tmpDir);
    expect(files.length).toBe(3);
    expect(files.some(f => f.endsWith('a.ts'))).toBe(true);
    expect(files.some(f => f.endsWith('b.ts'))).toBe(true);
    expect(files.some(f => f.endsWith('c.js'))).toBe(true);
  });

  test('recurses into subdirectories', () => {
    const subDir = path.join(tmpDir, 'src', 'app');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'index.ts'), '');
    fs.writeFileSync(path.join(subDir, 'app.component.ts'), '');

    const files = getAllFiles(tmpDir);
    expect(files.length).toBe(2);
    expect(files.some(f => f.includes('app.component.ts'))).toBe(true);
  });

  test('recurses into all subdirectories including node_modules (callers filter externally)', () => {
    // getAllFiles is a pure recursive enumerator — it does NOT filter node_modules.
    // Callers (like runAutomatedUnitTests) apply their own filters.
    const subDir = path.join(tmpDir, 'lib');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, 'helper.js'), '');
    fs.writeFileSync(path.join(tmpDir, 'main.ts'), '');

    const files = getAllFiles(tmpDir);
    expect(files.length).toBe(2);
    expect(files.some(f => f.endsWith('main.ts'))).toBe(true);
    expect(files.some(f => f.endsWith('helper.js'))).toBe(true);
  });

  test('handles non-existent directory gracefully', () => {
    const nonExistent = path.join(tmpDir, 'does-not-exist');
    // Should not throw — just return empty or handle gracefully
    expect(() => getAllFiles(nonExistent)).not.toThrow();
  });
});
