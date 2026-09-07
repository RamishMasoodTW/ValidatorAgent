/**
 * Unit Tests: 95% CI & 65% CD Advancement Suite
 * Validates cleanroom staged verification, Angular bootstrap smoke validation,
 * Conventional Commit SemVer calculations, Release Candidate Manifest generation,
 * and live deployment verification.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  calculateSemVerBump,
  verifyStagedCleanroom,
  verifyAngularBootstrapIntegrity,
  validateCompiledArtifacts,
  verifyLiveDeployment
} from '../src/rules/angular-best-practices.js';

describe('95% CI — Cleanroom & Staged Drift Verification', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatekeeper-ci-clean-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('verifyStagedCleanroom() returns isCleanroom true when no git status drift exists', () => {
    const res = verifyStagedCleanroom(tmpDir);
    expect(res).toBeDefined();
    expect(res.isCleanroom).toBe(true);
    expect(Array.isArray(res.unstagedDriftFiles)).toBe(true);
  });
});

describe('95% CI — Angular Bootstrap & Component Integrity', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatekeeper-ci-boot-'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('detects standard <app-root> selector in src/index.html', () => {
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.html'), '<!doctype html><html><body><app-root></app-root></body></html>');
    const res = verifyAngularBootstrapIntegrity(tmpDir);
    expect(res.hasRootElement).toBe(true);
    expect(res.selector).toBe('app-root');
    expect(res.valid).toBe(true);
  });

  test('detects custom root selector like <my-portal>', () => {
    fs.writeFileSync(path.join(tmpDir, 'src', 'index.html'), '<html><body><my-portal></my-portal></body></html>');
    const res = verifyAngularBootstrapIntegrity(tmpDir);
    expect(res.hasRootElement).toBe(true);
    expect(res.selector).toBe('my-portal');
  });

  test('detects bootstrapApplication in src/main.ts (Angular Standalone)', () => {
    fs.writeFileSync(path.join(tmpDir, 'src', 'main.ts'), "import { bootstrapApplication } from '@angular/platform-browser'; bootstrapApplication(AppComponent);");
    const res = verifyAngularBootstrapIntegrity(tmpDir);
    expect(res.hasBootstrapCall).toBe(true);
    expect(res.valid).toBe(true);
  });

  test('detects bootstrapModule in src/main.ts (NgModule architecture)', () => {
    fs.writeFileSync(path.join(tmpDir, 'src', 'main.ts'), "platformBrowserDynamic().bootstrapModule(AppModule);");
    const res = verifyAngularBootstrapIntegrity(tmpDir);
    expect(res.hasBootstrapCall).toBe(true);
    expect(res.valid).toBe(true);
  });
});

describe('65% CD — Conventional Commit SemVer Calculation', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatekeeper-cd-semver-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('defaults to patch bump when no conventional prefix is detected', () => {
    const res = calculateSemVerBump(tmpDir, '1.0.0');
    expect(res.nextVersion).toBe('1.0.1');
    expect(res.releaseType).toBe('patch');
  });

  test('correctly handles multi-digit semver version', () => {
    const res = calculateSemVerBump(tmpDir, '2.14.3');
    expect(res.nextVersion).toBe('2.14.4');
  });

  test('handles missing or malformed initial versions gracefully', () => {
    const res = calculateSemVerBump(tmpDir, '');
    expect(res.nextVersion).toBe('1.0.1');
  });
});

describe('65% CD — Release Candidate Manifest & SHA256 Checksums', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gatekeeper-cd-manifest-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('generates dist/release-manifest.json with SHA256 checksums of bundles', () => {
    const distDir = path.join(tmpDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><html><head><base href="/"></head><body><app-root></app-root></body></html>');
    fs.writeFileSync(path.join(distDir, 'main.js'), 'console.log("main bundle");');
    fs.writeFileSync(path.join(distDir, 'polyfills.js'), 'console.log("polyfills bundle");');
    fs.writeFileSync(path.join(distDir, 'web.config'), '<configuration></configuration>');

    const res = validateCompiledArtifacts(tmpDir);
    expect(res.releaseManifestCreated).toBe(true);
    expect(res.cdComplianceScore).toMatch(/^(65|75)%$/);

    const manifestPath = path.join(distDir, 'release-manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.cdReadiness).toMatch(/^(65|75)%$/);
    expect(manifest.bundleCount).toBe(2);
    expect(manifest.hasSpaRewrite).toBe(true);
    expect(manifest.hasBaseHref).toBe(true);
    expect(manifest.artifacts.length).toBe(2);
    expect(manifest.artifacts[0].sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('65% CD — Live Deployment Probe (verifyLiveDeployment)', () => {
  test('rejects non-HTTP URLs immediately', async () => {
    await expect(verifyLiveDeployment('ftp://invalid.url')).rejects.toThrow(/Invalid URL/i);
    await expect(verifyLiveDeployment('')).rejects.toThrow(/Invalid URL/i);
    await expect(verifyLiveDeployment(null)).rejects.toThrow(/Invalid URL/i);
  });
});
