import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { logStep, logWarning, logError, logSuccess } from '../utils/logger.js';
import { getStagedFiles } from '../utils/git.js';
import { execStreaming } from '../utils/exec.js';

/**
 * Enterprise-Grade Security & Secret Leak Scanner
 * Scans staged diff for hardcoded credentials, API keys, tokens, connection strings, and certificates
 */
export function scanSecurityRules(diffOutput) {
  if (!diffOutput || diffOutput.trim() === '') return true;

  logStep(7, 'Security & Secret Leak Scanning');

  const forbiddenPatterns = [
    // 1. Google / Gemini / Vertex AI Keys
    { pattern: /AIzaSy[0-9A-Za-z-_]{33}/, name: 'Google / Gemini Studio API Key' },
    { pattern: /AQ\.[0-9A-Za-z_-]{40,}/, name: 'Google Cloud / Vertex AI Bearer Token (AQ...)' },
    { pattern: /ya29\.[0-9A-Za-z_-]{70,}/, name: 'Google OAuth Access Token (ya29...)' },

    // 2. OpenAI & AI Providers
    { pattern: /sk-(?:proj-|admin-|none-)?[a-zA-Z0-9_-]{20,}/, name: 'OpenAI Secret API Key' },
    { pattern: /sk-ant-api[0-9]{2}-[a-zA-Z0-9_-]{80,}/, name: 'Anthropic Claude API Key' },
    { pattern: /hf_[a-zA-Z0-9]{34,}/, name: 'HuggingFace Access Token' },
    { pattern: /co-[a-zA-Z0-9]{40,}/, name: 'Cohere API Key' },

    // 3. Cloud Providers (AWS, Azure, GCP)
    { pattern: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[0-9A-Z]{16}/, name: 'AWS Access Key ID' },
    { pattern: /(?:aws_secret_access_key|aws_access_key_id)\s*=\s*['"][A-Za-z0-9\/+=]{20,}['"]/i, name: 'AWS Secret Access Key' },
    { pattern: /(?:AccountKey=[a-zA-Z0-9+\/=]{80,}|DefaultEndpointsProtocol=https;AccountName=)/i, name: 'Azure Storage Connection String' },

    // 4. Source Control & Developer Platforms (GitHub, GitLab, NPM)
    { pattern: /gh[pousr]_[0-9a-zA-Z]{36,}/, name: 'GitHub Token (Personal / OAuth / User / Refresh)' },
    { pattern: /glpat-[0-9a-zA-Z\-_]{20,}/, name: 'GitLab Personal Access Token' },
    { pattern: /npm_[0-9a-zA-Z]{36}/, name: 'NPM Access Token' },

    // 5. Payment & Communication (Stripe, Twilio, Slack, SendGrid)
    { pattern: /(?:sk|rk)_(?:test|live)_[0-9a-zA-Z]{24,}/, name: 'Stripe Secret API Key' },
    { pattern: /xox[baprs]-[0-9a-zA-Z]{10,48}/, name: 'Slack Bot / User Token' },
    { pattern: /SG\.[0-9A-Za-z-_]{22}\.[0-9A-Za-z-_]{43}/, name: 'SendGrid API Key' },
    { pattern: /SK[0-9a-fA-F]{32}/, name: 'Twilio API Key' },

    // 6. Database Connection Strings & Generic Secrets
    { pattern: /(?:mongodb(?:\+srv)?|postgres|postgresql|mysql|redis):\/\/[^:\s]+:[^@\s]+@[^\s/]+/i, name: 'Database Connection String with Password' },
    { pattern: /(?:password|secret|passwd|pwd)\s*[:=]\s*['"][^'"\s]{8,}['"]/i, name: 'Hardcoded Password Assignment' },

    // 7. Cryptographic Keys & Certificates
    { pattern: /-----BEGIN\s+(?:RSA\s+|EC\s+|DSA\s+|OPENSSH\s+)?PRIVATE\s+KEY-----/, name: 'Unencrypted Private Key (PEM/RSA/EC)' },
    { pattern: /-----BEGIN\s+CERTIFICATE-----/, name: 'Raw SSL/TLS Certificate Block' },

    // 8. Git Merge Conflict Markers (Stops CI Syntax/Compilation Disasters)
    { pattern: /<{7}\s+HEAD/, name: 'Unresolved Git Merge Conflict Marker (<<<<<<< HEAD)' },
    { pattern: /={7}/, name: 'Unresolved Git Merge Conflict Separator (=======)' },
    { pattern: />{7}\s+/, name: 'Unresolved Git Merge Conflict Marker (>>>>>>> branch)' }
  ];

  let violations = [];
  const lines = diffOutput.split('\n');

  // Only inspect ADDED lines (starting with '+') in diff to avoid false positives on deletions
  const addedLines = lines.filter(l => l.startsWith('+') && !l.startsWith('+++'));

  for (const item of forbiddenPatterns) {
    for (const line of addedLines) {
      if (item.pattern.test(line)) {
        // Redact matching secret preview
        const match = line.match(item.pattern);
        const snippet = match ? match[0].substring(0, 8) + '...' + match[0].slice(-4) : '***';
        violations.push({ name: item.name, snippet, rawLine: line.substring(1).trim() });
        break;
      }
    }
  }

  if (violations.length > 0) {
    logError('CRITICAL SECURITY ALERT: Hardcoded credentials / secret tokens detected in staged commit!');
    console.log(chalk.red('\n  ═════════════════════════════════════════════════════════════════════'));
    console.log(chalk.red.bold('  ❌ COMMIT REJECTED: Sensitive credentials found in your staged files:'));
    violations.forEach(v => {
      console.log(chalk.red(`    • ${chalk.bold(v.name)} [Pattern: ${chalk.yellow(v.snippet)}]`));
      if (v.rawLine) {
        console.log(chalk.gray(`      Code: "${v.rawLine.substring(0, 60)}${v.rawLine.length > 60 ? '...' : ''}"`));
      }
    });
    console.log(chalk.yellow('\n  Security Requirement:'));
    console.log(chalk.yellow('  Never commit secrets to Git. Move credentials to .env / environment variables.'));
    console.log(chalk.red('  ═════════════════════════════════════════════════════════════════\n'));
    throw new Error(`Hardcoded secrets detected: ${violations.map(v => v.name).join(', ')}`);
  }

  // 9. Accidental Heavy & Ignored Files Scanner (Stops repo bloat in CI)
  scanStagedFileIntegrity();

  logSuccess('Security scan passed: Zero leaked API keys, tokens, or private credentials.');
  return true;
}

/**
 * Scans staged filenames for forbidden sensitive extensions (.env, .pem, .key) or oversized binary blobs (>10MB)
 */
export function scanStagedFileIntegrity(cwd = process.cwd(), stagedFilesOverride = null) {
  try {
    const files = stagedFilesOverride || getStagedFiles(cwd);
    const forbiddenFiles = [];

    for (const f of files) {
      const base = path.basename(f).toLowerCase();
      // Block sensitive local env / key files
      if (
        (base.startsWith('.env') && !base.endsWith('.example') && !base.endsWith('.template')) ||
        base.endsWith('.pem') ||
        base.endsWith('.key') ||
        base.endsWith('.pfx') ||
        base.endsWith('.p12') ||
        base === 'thumbs.db' ||
        base === '.ds_store'
      ) {
        forbiddenFiles.push({ file: f, reason: 'Sensitive / Local OS environment file' });
      }

      // Check for oversized binary files (>10MB)
      const fullPath = path.join(cwd, f);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        if (stats.size > 10 * 1024 * 1024) { // 10MB limit
          forbiddenFiles.push({ file: f, reason: `Oversized binary file (${(stats.size / (1024 * 1024)).toFixed(2)} MB exceeds 10MB limit)` });
        }
      }
    }

    if (forbiddenFiles.length > 0) {
      logError('CRITICAL: Forbidden or oversized files detected in active commit stage:');
      forbiddenFiles.forEach(item => {
        console.log(chalk.red(`    • ${chalk.bold(item.file)} [${item.reason}]`));
      });
      console.log(chalk.yellow('\n  Remove these files from git staging using "git reset HEAD <file>".'));
      const fileListStr = forbiddenFiles.map(item => `  • ${item.file} [${item.reason}]`).join('\n');
      throw new Error(`Forbidden or oversized files detected in staged commit:\n${fileListStr}`);
    }
  } catch (err) {
    if (err.message.includes('Forbidden or oversized')) throw err;
    // Otherwise continue
  }
}

/**
 * Enterprise Dependency Security & Vulnerability Audit
 * Checks package dependencies for High/Critical CVEs
 */
export async function scanDependencyVulnerabilities(cwd = process.cwd()) {
  logStep(3, 'Dependency Vulnerability & Security Audit (npm audit)');
  
  const pkgLockExists = fs.existsSync(path.join(cwd, 'package-lock.json')) ||
                        fs.existsSync(path.join(cwd, 'yarn.lock')) ||
                        fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'));

  if (!pkgLockExists) {
    logWarning('No package lockfile found (package-lock.json). Skipping dependency vulnerability audit.');
    return true;
  }

  console.log(chalk.blue('  Running dependency security audit (npm audit --audit-level=high)...'));
  try {
    await execStreaming('npm audit --audit-level=high', { cwd });
    logSuccess('Dependency vulnerability audit passed: 0 High/Critical CVEs.');
    return true;
  } catch (err) {
    const output = (err.combined || err.stdout || err.stderr || err.message || '').trim();

    // Check if it's actual vulnerabilities or just no network / npm error
    if (output.includes('vulnerabilities') || output.includes('severity')) {
      logError('CRITICAL: High or Critical security vulnerabilities detected in dependencies!');
      console.log(chalk.red('\n  ═════════════════════════════════════════════════════════════════'));
      console.log(chalk.red.bold('  ❌ COMMIT REJECTED: Security vulnerabilities found in npm packages!'));
      console.log(chalk.yellow('  Run "npm audit" or "npm audit fix" to resolve known CVEs.'));
      console.log(chalk.red('  ═════════════════════════════════════════════════════════════════\n'));
      const secErr = new Error('Dependency security audit failed (High/Critical CVEs detected)');
      secErr.auditOutput = output;
      throw secErr;
    } else {
      // Network issue or npm audit offline - warn instead of hard blocking
      logWarning('npm audit could not connect to registry; skipping offline.');
      return true;
    }
  }
}

/**
 * Validates that commit messages follow Conventional Commits specification
 */
export function validateCommitMessage(message) {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Commit message is empty' };
  }

  const clean = message.trim().split('\n')[0].trim();
  if (!clean) {
    return { valid: false, error: 'Commit message is empty' };
  }

  // Disallow lazy commit messages
  const lazyPatterns = /^(wip|fix|update|test|stuff|changes|commit|done|temp)$/i;
  if (lazyPatterns.test(clean)) {
    return {
      valid: false,
      error: `Commit message "${clean}" is too vague. Follow Conventional Commits (e.g. "feat: add user profile page").`
    };
  }

  // Conventional Commits regex: type(scope)!: description
  const convRegex = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(?:\(([a-zA-Z0-9_.\-/]+)\))?!?:\s*(.+)$/i;
  const match = clean.match(convRegex);

  if (!match) {
    return {
      valid: false,
      error: `Commit message does not adhere to Conventional Commits format ("type(scope): description"). Received: "${clean}"`
    };
  }

  return {
    valid: true,
    type: match[1].toLowerCase(),
    scope: match[2] || null,
    description: match[3].trim()
  };
}


