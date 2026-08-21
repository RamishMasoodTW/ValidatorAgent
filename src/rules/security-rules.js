import chalk from 'chalk';
import { logWarning, logError, logSuccess } from '../utils/logger.js';

/**
 * Scan git diff for hardcoded secrets, private keys, and critical security issues
 */
export function scanSecurityRules(diffOutput) {
  if (!diffOutput || diffOutput.trim() === '') return true;

  const forbiddenPatterns = [
    { pattern: /AIzaSy[0-9A-Za-z-_]{33}/, name: 'Google API Key' },
    { pattern: /sk-(?:proj-|admin-|none-)?[a-zA-Z0-9_-]{20,}/, name: 'OpenAI Secret Key' },
    { pattern: /ghp_[a-zA-Z0-9]{36}/, name: 'GitHub Personal Access Token' },
    { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key ID' },
    { pattern: /BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY/, name: 'Unencrypted Private Key' }
  ];

  let violations = [];

  for (const item of forbiddenPatterns) {
    if (item.pattern.test(diffOutput)) {
      violations.push(item.name);
    }
  }

  if (violations.length > 0) {
    logError(`Security Alert: Hardcoded secrets detected in diff: ${violations.join(', ')}`);
    console.log(chalk.red('  Commit rejected: Remove hardcoded credentials and use environment variables.\n'));
    throw new Error(`Hardcoded secrets detected: ${violations.join(', ')}`);
  }

  return true;
}
