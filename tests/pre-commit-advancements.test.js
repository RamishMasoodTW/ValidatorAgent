import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  detectCircularDependencies,
  auditTemplateSecurity,
  auditDistributionAssetIntegrity,
  calculateGzipBudgets,
  auditCloudDeploymentConfigs,
  auditIisDeploymentConfig
} from '../src/rules/angular-best-practices.js';
import { validateCommitMessage } from '../src/rules/security-rules.js';

describe('Advanced Pre-Commit Quality & Shift-Left Advancements', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gk-precommit-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Circular Dependency Detection
  // ─────────────────────────────────────────────────────────────
  describe('detectCircularDependencies()', () => {
    test('returns hasCycles false when src directory does not exist or has no cycles', () => {
      const result = detectCircularDependencies(tmpDir);
      expect(result.hasCycles).toBe(false);
      expect(result.cycles).toEqual([]);
    });

    test('detects circular imports (A imports B and B imports A)', () => {
      const srcDir = path.join(tmpDir, 'src', 'app');
      fs.mkdirSync(srcDir, { recursive: true });

      const fileA = path.join(srcDir, 'a.service.ts');
      const fileB = path.join(srcDir, 'b.service.ts');

      fs.writeFileSync(fileA, `import { BService } from './b.service';\nexport class AService {}`, 'utf8');
      fs.writeFileSync(fileB, `import { AService } from './a.service';\nexport class BService {}`, 'utf8');

      const result = detectCircularDependencies(tmpDir);
      expect(result.hasCycles).toBe(true);
      expect(result.cycles.length).toBeGreaterThanOrEqual(1);
      const cycleStr = result.cycles[0].path.join(' ');
      expect(cycleStr).toContain('a.service.ts');
      expect(cycleStr).toContain('b.service.ts');
    });

    test('passes clean linear dependency chains (A imports B, B imports C)', () => {
      const srcDir = path.join(tmpDir, 'src', 'app');
      fs.mkdirSync(srcDir, { recursive: true });

      const fileA = path.join(srcDir, 'a.service.ts');
      const fileB = path.join(srcDir, 'b.service.ts');
      const fileC = path.join(srcDir, 'c.service.ts');

      fs.writeFileSync(fileA, `import { BService } from './b.service';\nexport class AService {}`, 'utf8');
      fs.writeFileSync(fileB, `import { CService } from './c.service';\nexport class BService {}`, 'utf8');
      fs.writeFileSync(fileC, `export class CService {}`, 'utf8');

      const result = detectCircularDependencies(tmpDir);
      expect(result.hasCycles).toBe(false);
      expect(result.cycles).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Template Security & DOM Mutation Audit
  // ─────────────────────────────────────────────────────────────
  describe('auditTemplateSecurity()', () => {
    test('passes clean Angular templates without innerHTML or direct DOM access', () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const cleanHtml = path.join(srcDir, 'clean.component.html');
      fs.writeFileSync(cleanHtml, `<div><h1>{{ title }}</h1><p>{{ user.name }}</p></div>`, 'utf8');

      const result = auditTemplateSecurity(tmpDir, ['src/clean.component.html']);
      expect(result.passed).toBe(true);
      expect(result.violationCount).toBe(0);
    });

    test('detects unsanitized [innerHTML] binding in template', () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const unsafeHtml = path.join(srcDir, 'unsafe.component.html');
      fs.writeFileSync(unsafeHtml, `<div [innerHTML]="userUntrustedContent"></div>`, 'utf8');

      const result = auditTemplateSecurity(tmpDir, ['src/unsafe.component.html']);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type === 'Unsanitized innerHTML')).toBe(true);
    });

    test('detects bypassSecurityTrustHtml XSS risk in TypeScript files', () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const compTs = path.join(srcDir, 'risky.component.ts');
      fs.writeFileSync(compTs, `
        import { DomSanitizer } from '@angular/platform-browser';
        export class RiskyComponent {
          constructor(private s: DomSanitizer) {}
          render() {
            return this.s.bypassSecurityTrustHtml('<div>test</div>');
          }
        }
      `, 'utf8');

      const result = auditTemplateSecurity(tmpDir, ['src/risky.component.ts']);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type.includes('Security Trust Bypass'))).toBe(true);
    });

    test('detects direct DOM mutations bypassing Renderer2 in TypeScript', () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });

      const compTs = path.join(srcDir, 'dom.component.ts');
      fs.writeFileSync(compTs, `
        export class DomComponent {
          ngOnInit() {
            const el = document.getElementById('my-element');
          }
        }
      `, 'utf8');

      const result = auditTemplateSecurity(tmpDir, ['src/dom.component.ts']);
      expect(result.passed).toBe(false);
      expect(result.violations.some(v => v.type.includes('Direct DOM Mutation'))).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Distribution Asset Integrity
  // ─────────────────────────────────────────────────────────────
  describe('auditDistributionAssetIntegrity()', () => {
    test('passes when all referenced assets exist in distribution output', () => {
      const distDir = path.join(tmpDir, 'dist');
      fs.mkdirSync(distDir, { recursive: true });

      fs.writeFileSync(path.join(distDir, 'index.html'), `
        <!doctype html>
        <html>
          <head>
            <link rel="icon" type="image/x-icon" href="favicon.ico">
            <script src="main.js"></script>
          </head>
          <body><app-root></app-root></body>
        </html>
      `, 'utf8');

      fs.writeFileSync(path.join(distDir, 'favicon.ico'), 'fake-icon', 'utf8');
      fs.writeFileSync(path.join(distDir, 'main.js'), 'console.log("app");', 'utf8');

      const result = auditDistributionAssetIntegrity(distDir);
      expect(result.valid).toBe(true);
      expect(result.brokenAssets).toEqual([]);
    });

    test('flags broken or missing local asset references in index.html', () => {
      const distDir = path.join(tmpDir, 'dist');
      fs.mkdirSync(distDir, { recursive: true });

      fs.writeFileSync(path.join(distDir, 'index.html'), `
        <!doctype html>
        <html>
          <head>
            <link rel="icon" href="missing-favicon.ico">
            <link rel="stylesheet" href="assets/styles/missing.css">
          </head>
          <body></body>
        </html>
      `, 'utf8');

      const result = auditDistributionAssetIntegrity(distDir);
      expect(result.valid).toBe(false);
      expect(result.brokenAssets.length).toBe(2);
      expect(result.brokenAssets.some(b => b.assetPath.includes('missing-favicon.ico'))).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Gzip Compression Budgets
  // ─────────────────────────────────────────────────────────────
  describe('calculateGzipBudgets()', () => {
    test('calculates accurate gzip compressed size for JS bundles', () => {
      const distDir = path.join(tmpDir, 'dist');
      fs.mkdirSync(distDir, { recursive: true });

      const content = 'console.log("hello world");'.repeat(500);
      fs.writeFileSync(path.join(distDir, 'main.js'), content, 'utf8');

      const result = calculateGzipBudgets(distDir, ['main.js']);
      expect(result.totalGzipBytes).toBeGreaterThan(0);
      expect(result.totalGzipBytes).toBeLessThan(content.length);
      expect(Number(result.totalGzipSizeKb)).toBeGreaterThan(0);
      expect(result.budgetExceeded).toBe(false);
    });

    test('handles empty or missing directory gracefully', () => {
      const result = calculateGzipBudgets(null, []);
      expect(result.totalGzipBytes).toBe(0);
      expect(result.totalGzipSizeKb).toBe('0.00');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Cloud Deployment Configs
  // ─────────────────────────────────────────────────────────────
  describe('auditCloudDeploymentConfigs()', () => {
    test('detects multiple cloud target configuration files', () => {
      fs.writeFileSync(path.join(tmpDir, 'vercel.json'), '{"rewrites":[]}', 'utf8');
      fs.writeFileSync(path.join(tmpDir, 'staticwebapp.config.json'), '{"routes":[]}', 'utf8');
      fs.writeFileSync(path.join(tmpDir, 'Dockerfile'), 'FROM node:20', 'utf8');

      const result = auditCloudDeploymentConfigs(tmpDir);
      expect(result.hasAnyCloudTarget).toBe(true);
      expect(result.detectedTargets).toContain('Vercel');
      expect(result.detectedTargets).toContain('Azure Static Web Apps');
      expect(result.detectedTargets).toContain('Docker / Container');
    });

    test('returns clean empty status when no cloud configs exist', () => {
      const result = auditCloudDeploymentConfigs(tmpDir);
      expect(result.hasAnyCloudTarget).toBe(false);
      expect(result.detectedTargets).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Conventional Commit Message Validation
  // ─────────────────────────────────────────────────────────────
  describe('validateCommitMessage()', () => {
    test('validates standard Conventional Commits formats', () => {
      const validMessages = [
        'feat: add multi-factor authentication',
        'fix(auth): resolve JWT token expiration bug',
        'chore(deps): bump typescript to 5.4',
        'refactor: optimize table rendering performance',
        'docs: update API integration guides',
        'ci: add azure static web apps deployment stage'
      ];

      for (const msg of validMessages) {
        const res = validateCommitMessage(msg);
        expect(res.valid).toBe(true);
        expect(res.type).toBeDefined();
        expect(res.description).toBeDefined();
      }
    });

    test('rejects lazy commit messages', () => {
      const lazyMessages = ['wip', 'fix', 'update', 'test', 'changes', 'done', 'temp'];

      for (const msg of lazyMessages) {
        const res = validateCommitMessage(msg);
        expect(res.valid).toBe(false);
        expect(res.error).toContain('too vague');
      }
    });

    test('rejects messages without valid Conventional Commit prefix', () => {
      const invalidMessages = [
        'added some new buttons',
        'bugfix in header',
        '',
        '   '
      ];

      for (const msg of invalidMessages) {
        const res = validateCommitMessage(msg);
        expect(res.valid).toBe(false);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Dedicated IIS (Internet Information Services) Audit
  // ─────────────────────────────────────────────────────────────
  describe('auditIisDeploymentConfig()', () => {
    test('returns isIisConfigured false when no web.config is found', () => {
      const result = auditIisDeploymentConfig(tmpDir);
      expect(result.isIisConfigured).toBe(false);
    });

    test('validates complete Angular web.config for IIS with rewrite rules and MIME types', () => {
      const webConfig = `
        <configuration>
          <system.webServer>
            <rewrite>
              <rules>
                <rule name="Angular Routes" stopProcessing="true">
                  <match url=".*" />
                  <action type="Rewrite" url="./index.html" />
                </rule>
              </rules>
            </rewrite>
            <staticContent>
              <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
              <mimeMap fileExtension=".json" mimeType="application/json" />
            </staticContent>
          </system.webServer>
        </configuration>
      `;
      fs.writeFileSync(path.join(tmpDir, 'web.config'), webConfig, 'utf8');

      const result = auditIisDeploymentConfig(tmpDir);
      expect(result.isIisConfigured).toBe(true);
      expect(result.isValidXml).toBe(true);
      expect(result.hasRewriteRule).toBe(true);
      expect(result.hasMimeTypes).toBe(true);
      expect(result.issues).toEqual([]);
    });

    test('catches malformed XML tags in web.config (prevents IIS 500.19 errors)', () => {
      const brokenXml = `
        <configuration>
          <system.webServer>
            <rewrite>
              <rules>
            </rewrite>
          </system.webServer>
        </configuration>
      `;
      fs.writeFileSync(path.join(tmpDir, 'web.config'), brokenXml, 'utf8');

      const result = auditIisDeploymentConfig(tmpDir);
      expect(result.isIisConfigured).toBe(true);
      expect(result.isValidXml).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('Malformed XML');
    });

    test('warns when src/web.config exists but is not registered in angular.json assets', () => {
      const srcDir = path.join(tmpDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'web.config'), '<configuration><system.webServer></system.webServer></configuration>', 'utf8');
      fs.writeFileSync(path.join(tmpDir, 'angular.json'), JSON.stringify({
        projects: { myapp: { architect: { build: { options: { assets: ['src/favicon.ico'] } } } } }
      }), 'utf8');

      const result = auditIisDeploymentConfig(tmpDir);
      expect(result.isIisConfigured).toBe(true);
      expect(result.isSyncedInAngularJson).toBe(false);
      expect(result.warnings.some(w => w.includes('not registered in angular.json'))).toBe(true);
    });
  });
});
