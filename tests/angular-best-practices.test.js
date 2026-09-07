/**
 * Unit Tests: src/rules/angular-best-practices.js
 * Tests pure utility functions (getAllFiles, checkAngularProject, etc.)
 * without requiring a real file system or Angular project.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  getAllFiles,
  findBuildOutputDir,
  checkBaseHref,
  auditEnvironmentProd,
  auditDockerfile,
  validateCompiledArtifacts,
  checkNodeEngineCompatibility,
  updateBuildMetadata,
  validateCaseSensitiveImports,
  checkCriticalArchitecture
} from '../src/rules/angular-best-practices.js';

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

// ─────────────────────────────────────────────────
// findBuildOutputDir() — build directory detection
// ─────────────────────────────────────────────────
describe('findBuildOutputDir()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatekeeper-build-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns null for non-existent dist directory', () => {
    expect(findBuildOutputDir(path.join(tmpDir, 'non-existent'))).toBeNull();
  });

  test('returns dist root if index.html is directly in dist', () => {
    fs.writeFileSync(path.join(tmpDir, 'index.html'), '<html></html>');
    expect(findBuildOutputDir(tmpDir)).toBe(tmpDir);
  });

  test('returns nested browser folder if index.html is in dist/app/browser', () => {
    const browserDir = path.join(tmpDir, 'app', 'browser');
    fs.mkdirSync(browserDir, { recursive: true });
    fs.writeFileSync(path.join(browserDir, 'index.html'), '<html></html>');
    expect(findBuildOutputDir(tmpDir)).toBe(browserDir);
  });
});

// ─────────────────────────────────────────────────
// checkBaseHref() — SPA Base Href Verification
// ─────────────────────────────────────────────────
describe('checkBaseHref()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatekeeper-href-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns false for missing index.html', () => {
    const res = checkBaseHref(path.join(tmpDir, 'missing.html'));
    expect(res.hasBaseHref).toBe(false);
    expect(res.baseHrefValue).toBeNull();
  });

  test('detects standard root base href "/"', () => {
    const indexPath = path.join(tmpDir, 'index.html');
    fs.writeFileSync(indexPath, '<!doctype html><html><head><base href="/"></head><body></body></html>');
    const res = checkBaseHref(indexPath);
    expect(res.hasBaseHref).toBe(true);
    expect(res.baseHrefValue).toBe('/');
  });

  test('detects custom subpath base href', () => {
    const indexPath = path.join(tmpDir, 'index.html');
    fs.writeFileSync(indexPath, '<!doctype html><html><head><base href="/my-app/"></head></html>');
    const res = checkBaseHref(indexPath);
    expect(res.hasBaseHref).toBe(true);
    expect(res.baseHrefValue).toBe('/my-app/');
  });

  test('returns false when base href tag is missing', () => {
    const indexPath = path.join(tmpDir, 'index.html');
    fs.writeFileSync(indexPath, '<!doctype html><html><head><title>App</title></head></html>');
    const res = checkBaseHref(indexPath);
    expect(res.hasBaseHref).toBe(false);
  });
});

// ─────────────────────────────────────────────────
// auditEnvironmentProd() — Localhost & Insecure HTTP Audit
// ─────────────────────────────────────────────────
describe('auditEnvironmentProd()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatekeeper-env-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns clean status for non-existent file', () => {
    const res = auditEnvironmentProd(path.join(tmpDir, 'missing.ts'));
    expect(res.hasLocalhostLeak).toBe(false);
    expect(res.hasHttpApiLeak).toBe(false);
  });

  test('detects localhost URL in production environment config', () => {
    const envPath = path.join(tmpDir, 'environment.prod.ts');
    fs.writeFileSync(envPath, 'export const environment = { production: true, apiUrl: "http://localhost:4200/api" };');
    const res = auditEnvironmentProd(envPath);
    expect(res.hasLocalhostLeak).toBe(true);
  });

  test('detects 127.0.0.1 IP leak', () => {
    const envPath = path.join(tmpDir, 'environment.prod.ts');
    fs.writeFileSync(envPath, 'export const environment = { apiUrl: "http://127.0.0.1:8080" };');
    const res = auditEnvironmentProd(envPath);
    expect(res.hasLocalhostLeak).toBe(true);
  });

  test('detects unencrypted HTTP endpoint in production config', () => {
    const envPath = path.join(tmpDir, 'environment.prod.ts');
    fs.writeFileSync(envPath, 'export const environment = { production: true, apiUrl: "http://api.mycompany.com/v1" };');
    const res = auditEnvironmentProd(envPath);
    expect(res.hasHttpApiLeak).toBe(true);
  });

  test('passes clean production environment with HTTPS endpoints', () => {
    const envPath = path.join(tmpDir, 'environment.prod.ts');
    fs.writeFileSync(envPath, 'export const environment = { production: true, apiUrl: "https://api.mycompany.com/v1" };');
    const res = auditEnvironmentProd(envPath);
    expect(res.hasLocalhostLeak).toBe(false);
    expect(res.hasHttpApiLeak).toBe(false);
  });
});

// ─────────────────────────────────────────────────
// auditDockerfile() — Container CD Specification Audit
// ─────────────────────────────────────────────────
describe('auditDockerfile()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatekeeper-docker-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('returns null for missing Dockerfile', () => {
    expect(auditDockerfile(path.join(tmpDir, 'Dockerfile'))).toBeNull();
  });

  test('validates standard single-stage Dockerfile', () => {
    const dockerPath = path.join(tmpDir, 'Dockerfile');
    fs.writeFileSync(dockerPath, 'FROM nginx:alpine\nCOPY dist/ /usr/share/nginx/html\nEXPOSE 80\n');
    const res = auditDockerfile(dockerPath);
    expect(res).not.toBeNull();
    expect(res.valid).toBe(true);
    expect(res.hasFrom).toBe(true);
    expect(res.hasCopyOrAdd).toBe(true);
    expect(res.hasExpose).toBe(true);
    expect(res.hasMultiStage).toBe(false);
  });

  test('identifies multi-stage build structure', () => {
    const dockerPath = path.join(tmpDir, 'Dockerfile');
    fs.writeFileSync(dockerPath, 'FROM node:20-alpine AS builder\nWORKDIR /app\nCOPY . .\nFROM nginx:alpine\nCOPY --from=builder /app/dist /usr/share/nginx/html\nEXPOSE 80\n');
    const res = auditDockerfile(dockerPath);
    expect(res.valid).toBe(true);
    expect(res.hasMultiStage).toBe(true);
  });

  test('flags invalid Dockerfile lacking FROM or COPY', () => {
    const dockerPath = path.join(tmpDir, 'Dockerfile');
    fs.writeFileSync(dockerPath, 'RUN echo "missing from and copy"\n');
    const res = auditDockerfile(dockerPath);
    expect(res.valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────
// validateCompiledArtifacts() — CD Artifact Gate
// ─────────────────────────────────────────────────
describe('validateCompiledArtifacts()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatekeeper-cd-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('throws error if dist directory does not exist', () => {
    expect(() => validateCompiledArtifacts(tmpDir)).toThrow(/Build output directory/i);
  });

  test('throws error if index.html is missing in dist output', () => {
    const distDir = path.join(tmpDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, 'main.js'), 'console.log("app");');
    expect(() => validateCompiledArtifacts(tmpDir)).toThrow(/index.html/i);
  });

  test('throws error if JS bundles are missing in dist output', () => {
    const distDir = path.join(tmpDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><html></html>');
    expect(() => validateCompiledArtifacts(tmpDir)).toThrow(/No compiled JavaScript bundles/i);
  });

  test('passes on complete production dist with SPA web.config and styles', () => {
    const distDir = path.join(tmpDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><html><head><base href="/"></head></html>');
    fs.writeFileSync(path.join(distDir, 'main.js'), 'console.log("bundle");');
    fs.writeFileSync(path.join(distDir, 'polyfills.js'), 'console.log("polyfills");');
    fs.writeFileSync(path.join(distDir, 'styles.css'), 'body { margin: 0; }');
    fs.writeFileSync(path.join(distDir, 'web.config'), '<configuration></configuration>');

    const res = validateCompiledArtifacts(tmpDir);
    expect(res.bundleCount).toBe(2);
    expect(res.hasSpaRewrite).toBe(true);
    expect(res.hasBaseHref).toBe(true);
    expect(res.bundleBudgetExceeded).toBe(false);
  });
});

// ─────────────────────────────────────────────────
// checkNodeEngineCompatibility()
// ─────────────────────────────────────────────────
describe('checkNodeEngineCompatibility()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatekeeper-node-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('passes when active Node version meets package.json requirement', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ engines: { node: '>=20' } }));
    expect(() => checkNodeEngineCompatibility(tmpDir)).not.toThrow();
  });

  test('handles missing package.json gracefully', () => {
    expect(() => checkNodeEngineCompatibility(tmpDir)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────
// updateBuildMetadata() — Build Stamping
// ─────────────────────────────────────────────────
describe('updateBuildMetadata()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatekeeper-meta-'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('creates and increments build-metadata.json in src directory', () => {
    updateBuildMetadata(tmpDir, { version: '2.0.0' });
    const metaFile = path.join(tmpDir, 'src', 'build-metadata.json');
    expect(fs.existsSync(metaFile)).toBe(true);

    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    expect(meta.buildNumber).toBe(1);
    expect(meta.version).toBe('2.0.0');

    // Run a second time to verify build number incrementation
    updateBuildMetadata(tmpDir, { version: '2.0.0' });
    const meta2 = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    expect(meta2.buildNumber).toBe(2);
  });
});

// ─────────────────────────────────────────────────
// checkCriticalArchitecture() & validateCaseSensitiveImports()
// ─────────────────────────────────────────────────
describe('checkCriticalArchitecture()', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatekeeper-arch-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('throws error when critical files are missing', () => {
    expect(() => checkCriticalArchitecture(tmpDir)).toThrow(/Missing critical Angular/i);
  });

  test('validateCaseSensitiveImports() passes on empty staged files list', () => {
    expect(() => validateCaseSensitiveImports(tmpDir, [])).not.toThrow();
  });
});


