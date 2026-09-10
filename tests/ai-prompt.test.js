import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  getProjectSourceSnapshot,
  buildGeminiAuditPrompt,
  runAiKnowledgeBaseAudit
} from '../src/rules/ai-prompt.js';

describe('Step 8: AI Knowledge Base Full-Project Audit Engine', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gk-ai-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  });

  test('getProjectSourceSnapshot() collects files from src/ and root configs while ignoring node_modules & dist', () => {
    const srcDir = path.join(tempDir, 'src', 'app');
    fs.mkdirSync(srcDir, { recursive: true });

    // Allowed code files
    fs.writeFileSync(path.join(srcDir, 'app.component.ts'), 'export class AppComponent {}', 'utf8');
    fs.writeFileSync(path.join(srcDir, 'app.component.html'), '<h1>Hello World</h1>', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'angular.json'), '{"projects": {}}', 'utf8');

    // Ignored directories & files
    const nodeModules = path.join(tempDir, 'node_modules', 'some-pkg');
    fs.mkdirSync(nodeModules, { recursive: true });
    fs.writeFileSync(path.join(nodeModules, 'index.js'), 'module.exports = {};', 'utf8');

    const distDir = path.join(tempDir, 'dist');
    fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(path.join(distDir, 'bundle.js'), 'console.log("dist");', 'utf8');

    fs.writeFileSync(path.join(tempDir, 'package-lock.json'), '{"lock": 1}', 'utf8');
    fs.writeFileSync(path.join(tempDir, 'resolved_issues.md'), '# Knowledge Base', 'utf8');

    const result = getProjectSourceSnapshot(tempDir);

    expect(result.fileCount).toBe(3);
    expect(result.snapshot).toContain('app.component.ts');
    expect(result.snapshot).toContain('app.component.html');
    expect(result.snapshot).toContain('angular.json');
    expect(result.snapshot).not.toContain('node_modules');
    expect(result.snapshot).not.toContain('bundle.js');
    expect(result.snapshot).not.toContain('package-lock.json');
  });

  test('buildGeminiAuditPrompt() includes full project source code and enforces full-project audit instructions', () => {
    const knowledgeBase = '### Issue 1: Always unsubscribe from RxJS observables using takeUntilDestroyed.';
    const diffOutput = '';
    const projectTree = 'src/app/app.component.ts\nsrc/app/user.service.ts';
    const projectSource = '--- FILE: src/app/user.service.ts ---\nexport class UserService { data$ = new Subject(); }';

    const prompt = buildGeminiAuditPrompt(knowledgeBase, diffOutput, projectTree, projectSource);

    expect(prompt).toContain('FULL PROJECT AUDIT MANDATE');
    expect(prompt).toContain('DO NOT LIMIT YOUR AUDIT TO ONLY THE GIT DIFF');
    expect(prompt).toContain('ABSOLUTE RULE: ACCEPT RESOLVED_ISSUES.MD AS-IS');
    expect(prompt).toContain('NEVER complain, critique, or question whether "resolved_issues.md" is complete');
    expect(prompt).toContain('FULL PROJECT SOURCE CODE AUDIT (Entire Repository Files)');
    expect(prompt).toContain('UserService { data$ = new Subject(); }');
    expect(prompt).toContain('No pending git diff detected');
    expect(prompt).toContain('Always unsubscribe from RxJS observables');
  });

  test('buildGeminiAuditPrompt() includes both active diff and full project source when diff is provided', () => {
    const knowledgeBase = '### Issue 2: Never use nativeElement.innerHTML.';
    const diffOutput = '+ el.nativeElement.innerHTML = "<p>danger</p>";';
    const projectTree = 'src/app/app.component.ts';
    const projectSource = '--- FILE: src/app/app.component.ts ---\nexport class AppComponent {}';

    const prompt = buildGeminiAuditPrompt(knowledgeBase, diffOutput, projectTree, projectSource);

    expect(prompt).toContain('ACTIVE CODE DIFF / COMMITTED CHANGES:');
    expect(prompt).toContain('+ el.nativeElement.innerHTML');
    expect(prompt).toContain('FULL PROJECT SOURCE CODE AUDIT (Entire Repository Files)');
    expect(prompt).toContain('export class AppComponent {}');
  });

  test('runAiKnowledgeBaseAudit() skips if resolved_issues.md does not exist', async () => {
    const res = await runAiKnowledgeBaseAudit({ AI_PROVIDER: 'none' }, tempDir);
    expect(res.passed).toBe(true);
    expect(res.skipped).toBe(true);
    expect(res.report).toContain('No resolved_issues.md found');
  });

  test('runAiKnowledgeBaseAudit() skips if provider is set to none', async () => {
    fs.writeFileSync(path.join(tempDir, 'resolved_issues.md'), '# Known issues', 'utf8');
    const res = await runAiKnowledgeBaseAudit({ AI_PROVIDER: 'none' }, tempDir);
    expect(res.passed).toBe(true);
    expect(res.skipped).toBe(true);
    expect(res.report).toContain('AI Audit disabled in configuration');
  });

  test('runAiKnowledgeBaseAudit() skips gracefully if GEMINI_API_KEY is missing for gemini provider', async () => {
    fs.writeFileSync(path.join(tempDir, 'resolved_issues.md'), '# Known issues', 'utf8');
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'src', 'main.ts'), 'console.log("hello");', 'utf8');
    const res = await runAiKnowledgeBaseAudit({ AI_PROVIDER: 'gemini', GEMINI_API_KEY: '' }, tempDir);
    expect(res.passed).toBe(true);
    expect(res.skipped).toBe(true);
    expect(res.report).toContain('GEMINI_API_KEY not configured');
  });
});
