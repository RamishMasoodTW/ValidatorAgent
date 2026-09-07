/**
 * Unit Tests: src/rules/security-rules.js
 * Tests the scanSecurityRules() and scanDependencyVulnerabilities() functions
 * which are pure/side-effect-free enough to test without mocking.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  scanSecurityRules,
  scanStagedFileIntegrity,
  scanDependencyVulnerabilities
} from '../src/rules/security-rules.js';

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────
function makeDiff(addedLine) {
  return `diff --git a/file.ts b/file.ts\n+++ b/file.ts\n+${addedLine}`;
}

// ─────────────────────────────────────────────────
// Clean diff — should always pass
// ─────────────────────────────────────────────────
describe('scanSecurityRules() — clean diffs', () => {
  test('passes on empty diff', () => {
    expect(() => scanSecurityRules('')).not.toThrow();
  });

  test('passes on null/undefined diff', () => {
    expect(() => scanSecurityRules(null)).not.toThrow();
    expect(() => scanSecurityRules(undefined)).not.toThrow();
  });

  test('passes on a normal TypeScript code addition', () => {
    const diff = makeDiff('const greeting = "hello world";');
    expect(() => scanSecurityRules(diff)).not.toThrow();
  });

  test('passes on a deleted line containing a key pattern (not an addition)', () => {
    // Line starting with '-' (deletion) should NOT trigger the scanner
    const diff = `diff --git a/file.ts b/file.ts\n--- a/file.ts\n-const key = "AIzaSyABC123DEF456GHI789JKL012MNO345PQR678";`;
    expect(() => scanSecurityRules(diff)).not.toThrow();
  });

  test('passes on a +++ header line (diff header, not actual addition)', () => {
    const diff = `+++ b/src/app/app.component.ts`;
    expect(() => scanSecurityRules(diff)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────
// Google / Gemini API Keys
// ─────────────────────────────────────────────────
describe('scanSecurityRules() — Google API key detection', () => {
  test('blocks Google Gemini API key (AIzaSy...)', () => {
    const diff = makeDiff('const key = "AIzaSyABC123DEF456GHI789JKL012MNO345PQR6";');
    expect(() => scanSecurityRules(diff)).toThrow(/Google.*API Key|Hardcoded secrets/i);
  });
});

// ─────────────────────────────────────────────────
// OpenAI Keys
// ─────────────────────────────────────────────────
describe('scanSecurityRules() — OpenAI key detection', () => {
  test('blocks OpenAI secret key (sk-...)', () => {
    const diff = makeDiff('const openAiKey = "sk-proj-abc123DEF456ghi789JKL012mno345PQR678stu";');
    expect(() => scanSecurityRules(diff)).toThrow(/OpenAI|Hardcoded secrets/i);
  });
});

// ─────────────────────────────────────────────────
// Anthropic Keys
// ─────────────────────────────────────────────────
describe('scanSecurityRules() — Anthropic key detection', () => {
  test('blocks Anthropic Claude key (sk-ant-api...)', () => {
    const fakeKey = 'sk-ant-api01-' + 'A'.repeat(80);
    const diff = makeDiff(`const claudeKey = "${fakeKey}";`);
    expect(() => scanSecurityRules(diff)).toThrow(/Anthropic|Hardcoded secrets/i);
  });
});

// ─────────────────────────────────────────────────
// AWS Keys
// ─────────────────────────────────────────────────
describe('scanSecurityRules() — AWS key detection', () => {
  test('blocks AWS Access Key ID (AKIA...)', () => {
    const diff = makeDiff('const awsKey = "AKIAIOSFODNN7EXAMPLE";');
    expect(() => scanSecurityRules(diff)).toThrow(/AWS|Hardcoded secrets/i);
  });
});

// ─────────────────────────────────────────────────
// GitHub Tokens
// ─────────────────────────────────────────────────
describe('scanSecurityRules() — GitHub token detection', () => {
  test('blocks GitHub personal access token (ghp_...)', () => {
    const fakeToken = 'ghp_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8';
    const diff = makeDiff(`const token = "${fakeToken}";`);
    expect(() => scanSecurityRules(diff)).toThrow(/GitHub|Hardcoded secrets/i);
  });

  test('blocks GitHub OAuth token (gho_...)', () => {
    const fakeToken = 'gho_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8';
    const diff = makeDiff(`process.env.TOKEN = "${fakeToken}";`);
    expect(() => scanSecurityRules(diff)).toThrow(/GitHub|Hardcoded secrets/i);
  });
});

// ─────────────────────────────────────────────────
// GitLab Tokens
// ─────────────────────────────────────────────────
describe('scanSecurityRules() — GitLab token detection', () => {
  test('blocks GitLab personal access token (glpat-...)', () => {
    const fakeToken = 'glpat-ABC123def456GHI789jkl012';
    const diff = makeDiff(`const gitlabToken = "${fakeToken}";`);
    expect(() => scanSecurityRules(diff)).toThrow(/GitLab|Hardcoded secrets/i);
  });
});

// ─────────────────────────────────────────────────
// Private Key / Certificate
// ─────────────────────────────────────────────────
describe('scanSecurityRules() — private key detection', () => {
  test('blocks PEM private key block', () => {
    const diff = makeDiff('-----BEGIN RSA PRIVATE KEY-----');
    expect(() => scanSecurityRules(diff)).toThrow(/Private Key|Hardcoded secrets/i);
  });

  test('blocks OpenSSH private key block', () => {
    const diff = makeDiff('-----BEGIN OPENSSH PRIVATE KEY-----');
    expect(() => scanSecurityRules(diff)).toThrow(/Private Key|Hardcoded secrets/i);
  });
});

// ─────────────────────────────────────────────────
// Database Connection Strings
// ─────────────────────────────────────────────────
describe('scanSecurityRules() — database connection string detection', () => {
  test('blocks PostgreSQL connection string with credentials', () => {
    const diff = makeDiff('const db = "postgresql://admin:s3cr3tP@ss@prod.db.company.com/mydb";');
    expect(() => scanSecurityRules(diff)).toThrow(/Database|Hardcoded secrets/i);
  });

  test('blocks MongoDB connection string with credentials', () => {
    const diff = makeDiff('const uri = "mongodb://user:password@cluster.mongodb.net/db";');
    expect(() => scanSecurityRules(diff)).toThrow(/Database|Hardcoded secrets/i);
  });
});

// ─────────────────────────────────────────────────
// Merge Conflict Markers
// ─────────────────────────────────────────────────
describe('scanSecurityRules() — merge conflict marker detection', () => {
  test('blocks <<<<<<< HEAD conflict marker', () => {
    const diff = makeDiff('<<<<<<< HEAD');
    expect(() => scanSecurityRules(diff)).toThrow(/Merge Conflict|Hardcoded secrets/i);
  });

  test('blocks >>>>>>> branch conflict marker', () => {
    const diff = makeDiff('>>>>>>> feature/my-branch');
    expect(() => scanSecurityRules(diff)).toThrow(/Merge Conflict|Hardcoded secrets/i);
  });
});

// ─────────────────────────────────────────────────
// Stripe Keys
// ─────────────────────────────────────────────────
describe('scanSecurityRules() — Stripe key detection', () => {
  test('blocks Stripe live secret key (sk_live_...)', () => {
    const fakeKey = 'sk_live_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4';
    const diff = makeDiff(`const stripe = require("stripe")("${fakeKey}");`);
    expect(() => scanSecurityRules(diff)).toThrow(/Stripe|Hardcoded secrets/i);
  });

  test('blocks Stripe test key (sk_test_...)', () => {
    const fakeKey = 'sk_test_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4';
    const diff = makeDiff(`STRIPE_KEY="${fakeKey}"`);
    expect(() => scanSecurityRules(diff)).toThrow(/Stripe|Hardcoded secrets/i);
  });
});

// ─────────────────────────────────────────────────
// Staged File Integrity & Repo Bloat
// ─────────────────────────────────────────────────
describe('scanStagedFileIntegrity()', () => {
  test('passes on safe file stage', () => {
    expect(() => scanStagedFileIntegrity(process.cwd(), ['src/app.ts', 'src/app.html', 'package.json'])).not.toThrow();
  });

  test('blocks .env files', () => {
    expect(() => scanStagedFileIntegrity(process.cwd(), ['.env'])).toThrow(/Forbidden or oversized/i);
  });

  test('allows .env.example files', () => {
    expect(() => scanStagedFileIntegrity(process.cwd(), ['.env.example'])).not.toThrow();
  });

  test('blocks private key files (.pem, .key, .pfx)', () => {
    expect(() => scanStagedFileIntegrity(process.cwd(), ['server.pem'])).toThrow(/Forbidden or oversized/i);
    expect(() => scanStagedFileIntegrity(process.cwd(), ['id_rsa.key'])).toThrow(/Forbidden or oversized/i);
    expect(() => scanStagedFileIntegrity(process.cwd(), ['cert.pfx'])).toThrow(/Forbidden or oversized/i);
  });

  test('blocks OS junk files (Thumbs.db, .DS_Store)', () => {
    expect(() => scanStagedFileIntegrity(process.cwd(), ['Thumbs.db'])).toThrow(/Forbidden or oversized/i);
    expect(() => scanStagedFileIntegrity(process.cwd(), ['.DS_Store'])).toThrow(/Forbidden or oversized/i);
  });
});

// ─────────────────────────────────────────────────
// Dependency Vulnerability Audit
// ─────────────────────────────────────────────────
describe('scanDependencyVulnerabilities()', () => {
  test('skips audit gracefully if no lockfile is present in directory', () => {
    const emptyDir = path.join(os.tmpdir(), 'gatekeeper-empty-lock-' + Date.now());
    fs.mkdirSync(emptyDir, { recursive: true });
    try {
      const res = scanDependencyVulnerabilities(emptyDir);
      expect(res).toBe(true);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});

