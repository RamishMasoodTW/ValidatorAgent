import chalk from 'chalk';
import { logWarning, logError, logSuccess } from '../utils/logger.js';

/**
 * Scan git diff for hardcoded secrets, private keys, and critical security issues
 */
export function scanSecurityRules(diffOutput) {
  if (!diffOutput || diffOutput.trim() === '') return true;

  const forbiddenPatterns = [
    { pattern: /(?:AIzaSy[0-9A-Za-z-_]{33})/g, name: 'Google API Key' },
    { pattern: /(?:sk-[a-zA-Z0-9]{32,})/g, name: 'OpenAI Secret Key' },
    { pattern: /(?:ghp_[a-zA-Z0-9]{36})/g, name: 'GitHub Personal Access Token' },
    { pattern: /(?:BEGIN\s+PRIVATE\s+KEY)/g, name: 'Unencrypted Private Key' }
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
    process.exit(1);
  }

  return true;
}
