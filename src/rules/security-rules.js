import chalk from 'chalk';
import { logStep, logWarning, logError, logSuccess } from '../utils/logger.js';

/**
 * Enterprise-Grade Security & Secret Leak Scanner
 * Scans staged diff for hardcoded credentials, API keys, tokens, connection strings, and certificates
 */
export function scanSecurityRules(diffOutput) {
  if (!diffOutput || diffOutput.trim() === '') return true;

  logStep(6, 'Enterprise Security & Secret Leak Scanning');

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
    { pattern: /-----BEGIN\s+CERTIFICATE-----/, name: 'Raw SSL/TLS Certificate Block' }
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
    console.log(chalk.red('  ═════════════════════════════════════════════════════════════════════\n'));
    throw new Error(`Hardcoded secrets detected: ${violations.map(v => v.name).join(', ')}`);
  }

  logSuccess('Security scan passed: Zero leaked API keys, tokens, or private credentials.');
  return true;
}
