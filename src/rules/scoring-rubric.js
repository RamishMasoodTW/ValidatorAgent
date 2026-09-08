import chalk from 'chalk';

/**
 * Enterprise Pre-Flight Quality & Readiness Scoring Rubric
 *
 * Provides a mathematically sound, 100-point deterministic evaluation
 * across 5 core engineering pillars, replacing arbitrary hardcoded percentages
 * with transparent, reproducible quality metrics.
 */

export const RUBRIC_WEIGHTS = {
  // Pillar 1: Security & Hygiene (25 pts)
  SECRETS_AND_CREDENTIALS: 10,
  CONFLICT_MARKERS_AND_BLATANT_FILES: 5,
  LOCKFILE_SYNC: 5,
  STAGED_CLEANROOM: 5,

  // Pillar 2: Static Analysis & Type Safety (25 pts)
  TYPESCRIPT_COMPILATION: 15,
  LINTER_CLEANLINESS: 10,

  // Pillar 3: Angular Architecture & Linux Parity (20 pts)
  LINUX_CASE_SENSITIVITY: 10,
  CIRCULAR_DEPENDENCIES: 5,
  TEMPLATE_SECURITY_DOM: 5,

  // Pillar 4: Regression & Test Health (15 pts)
  UNIT_TEST_EXECUTION: 10,
  TEST_SPEC_AVAILABILITY: 5,

  // Pillar 5: Production & Cloud Readiness (15 pts)
  ENVIRONMENT_PROD_LEAKS: 5,
  SPA_SERVER_REWRITE: 5,
  BUNDLE_AND_GZIP_BUDGETS: 5
};

export const MAX_TOTAL_SCORE = Object.values(RUBRIC_WEIGHTS).reduce((sum, w) => sum + w, 0); // 100

/**
 * Calculates letter grade from numeric score (0 - 100)
 */
export function calculateGrade(score) {
  if (score >= 95) return { grade: 'A+', label: 'Gold Standard (CI/CD Ready)', color: 'green' };
  if (score >= 90) return { grade: 'A', label: 'Ready to Commit & Push', color: 'green' };
  if (score >= 80) return { grade: 'B', label: 'Acceptable (Minor Quality Warnings)', color: 'cyan' };
  if (score >= 70) return { grade: 'C', label: 'Quality Risks Detected', color: 'yellow' };
  return { grade: 'F', label: 'Commit Blocked (Critical Violations)', color: 'red' };
}

/**
 * Evaluates full audit results and produces a deterministic score breakdown
 *
 * @param {object} results - Results collected across all executed steps
 * @returns {object} Score outcome with breakdown, letter grade, and pillar metrics
 */
export function calculatePreFlightScore(results = {}) {
  const pillars = {
    security: { name: 'Security & Hygiene Gate', max: 25, earned: 0, checks: [] },
    staticAnalysis: { name: 'Static Analysis & Type Safety', max: 25, earned: 0, checks: [] },
    architecture: { name: 'Angular Architecture & Linux Parity', max: 20, earned: 0, checks: [] },
    testHealth: { name: 'Regression & Test Health', max: 15, earned: 0, checks: [] },
    cdReadiness: { name: 'Production & Cloud Readiness', max: 15, earned: 0, checks: [] }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. Security & Hygiene Gate (25 pts)
  // ─────────────────────────────────────────────────────────────
  const secretsPassed = results.securityScanPassed !== false && !results.secretsDetected;
  if (secretsPassed) {
    pillars.security.earned += RUBRIC_WEIGHTS.SECRETS_AND_CREDENTIALS;
    pillars.security.checks.push({ name: 'Secret & Credential Scan', earned: 10, max: 10, status: 'pass' });
  } else {
    pillars.security.checks.push({ name: 'Secret & Credential Scan', earned: 0, max: 10, status: 'fail', detail: 'Leaked credentials or API keys found in diff' });
  }

  const filesPassed = !results.conflictMarkersDetected && !results.forbiddenFilesDetected;
  if (filesPassed) {
    pillars.security.earned += RUBRIC_WEIGHTS.CONFLICT_MARKERS_AND_BLATANT_FILES;
    pillars.security.checks.push({ name: 'Git Conflict Markers & File Stage', earned: 5, max: 5, status: 'pass' });
  } else {
    pillars.security.checks.push({ name: 'Git Conflict Markers & File Stage', earned: 0, max: 5, status: 'fail', detail: 'Conflict markers or oversized/forbidden files staged' });
  }

  const lockfilePassed = results.lockfileOutOfSync !== true;
  if (lockfilePassed) {
    pillars.security.earned += RUBRIC_WEIGHTS.LOCKFILE_SYNC;
    pillars.security.checks.push({ name: 'Package Lockfile Sync (npm ci safe)', earned: 5, max: 5, status: 'pass' });
  } else {
    pillars.security.checks.push({ name: 'Package Lockfile Sync (npm ci safe)', earned: 0, max: 5, status: 'fail', detail: 'package.json staged without lockfile' });
  }

  const cleanroomPassed = results.isCleanroom !== false && (!results.unstagedDriftFiles || results.unstagedDriftFiles.length === 0);
  if (cleanroomPassed) {
    pillars.security.earned += RUBRIC_WEIGHTS.STAGED_CLEANROOM;
    pillars.security.checks.push({ name: 'Cleanroom Staged Integrity', earned: 5, max: 5, status: 'pass' });
  } else {
    pillars.security.earned += 2;
    pillars.security.checks.push({ name: 'Cleanroom Staged Integrity', earned: 2, max: 5, status: 'warn', detail: 'Unstaged modifications on staged files' });
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Static Analysis & Type Safety (25 pts)
  // ─────────────────────────────────────────────────────────────
  const tsPassed = results.typeScriptPassed !== false && !results.typeScriptError;
  if (tsPassed) {
    pillars.staticAnalysis.earned += RUBRIC_WEIGHTS.TYPESCRIPT_COMPILATION;
    pillars.staticAnalysis.checks.push({ name: 'Strict TypeScript Compilation', earned: 15, max: 15, status: 'pass' });
  } else {
    pillars.staticAnalysis.checks.push({ name: 'Strict TypeScript Compilation', earned: 0, max: 15, status: 'fail', detail: 'TypeScript compilation errors detected' });
  }

  const lintPassed = results.lintPassed !== false && !results.lintError;
  if (lintPassed) {
    pillars.staticAnalysis.earned += RUBRIC_WEIGHTS.LINTER_CLEANLINESS;
    pillars.staticAnalysis.checks.push({ name: 'Angular Linter Verification', earned: 10, max: 10, status: 'pass' });
  } else if (results.lintWarningsOnly) {
    pillars.staticAnalysis.earned += 6;
    pillars.staticAnalysis.checks.push({ name: 'Angular Linter Verification', earned: 6, max: 10, status: 'warn', detail: 'Lint warnings detected' });
  } else {
    pillars.staticAnalysis.checks.push({ name: 'Angular Linter Verification', earned: 0, max: 10, status: 'fail', detail: 'Linter reported syntax or rule errors' });
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Angular Architecture & Linux Parity (20 pts)
  // ─────────────────────────────────────────────────────────────
  const casingPassed = results.casingMismatch !== true;
  if (casingPassed) {
    pillars.architecture.earned += RUBRIC_WEIGHTS.LINUX_CASE_SENSITIVITY;
    pillars.architecture.checks.push({ name: 'Linux CI Case-Sensitive Imports', earned: 10, max: 10, status: 'pass' });
  } else {
    pillars.architecture.checks.push({ name: 'Linux CI Case-Sensitive Imports', earned: 0, max: 10, status: 'fail', detail: 'Import casing does not match physical disk files' });
  }

  const circularPassed = !results.hasCircularDependencies && (!results.circularCycles || results.circularCycles.length === 0);
  if (circularPassed) {
    pillars.architecture.earned += RUBRIC_WEIGHTS.CIRCULAR_DEPENDENCIES;
    pillars.architecture.checks.push({ name: 'Circular Dependency Graph DFS', earned: 5, max: 5, status: 'pass' });
  } else {
    pillars.architecture.checks.push({ name: 'Circular Dependency Graph DFS', earned: 0, max: 5, status: 'warn', detail: `${results.circularCycles?.length || 1} circular dependency cycle(s) detected` });
  }

  const templatePassed = results.templateSecurityPassed !== false && (!results.templateViolations || results.templateViolations.length === 0);
  if (templatePassed) {
    pillars.architecture.earned += RUBRIC_WEIGHTS.TEMPLATE_SECURITY_DOM;
    pillars.architecture.checks.push({ name: 'Template Security & Safe DOM Audit', earned: 5, max: 5, status: 'pass' });
  } else {
    pillars.architecture.checks.push({ name: 'Template Security & Safe DOM Audit', earned: 0, max: 5, status: 'warn', detail: `${results.templateViolations?.length || 1} template/DOM security pattern(s) flagged` });
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Regression & Test Health (15 pts)
  // ─────────────────────────────────────────────────────────────
  const testsPassed = results.unitTestsPassed !== false && !results.unitTestsError;
  if (testsPassed) {
    pillars.testHealth.earned += RUBRIC_WEIGHTS.UNIT_TEST_EXECUTION;
    pillars.testHealth.checks.push({ name: 'Unit Test Suite Execution', earned: 10, max: 10, status: 'pass' });
  } else {
    pillars.testHealth.checks.push({ name: 'Unit Test Suite Execution', earned: 0, max: 10, status: 'fail', detail: 'Unit test runner reported spec failures' });
  }

  const specCount = Number(results.specCount) || 0;
  if (specCount > 0) {
    pillars.testHealth.earned += RUBRIC_WEIGHTS.TEST_SPEC_AVAILABILITY;
    pillars.testHealth.checks.push({ name: 'Test Spec Availability', earned: 5, max: 5, status: 'pass', detail: `${specCount} active test spec(s)` });
  } else if (results.unitTestsSkipped) {
    pillars.testHealth.checks.push({ name: 'Test Spec Availability', earned: 0, max: 5, status: 'warn', detail: 'Zero test specs detected (*.spec.ts) — 0% test coverage' });
  } else {
    pillars.testHealth.checks.push({ name: 'Test Spec Availability', earned: 0, max: 5, status: 'warn', detail: 'No test specs found in project' });
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Production & Cloud Readiness (15 pts)
  // ─────────────────────────────────────────────────────────────
  const noLeaks = !results.hasLocalhostLeak && !results.hasHttpApiLeak;
  if (noLeaks) {
    pillars.cdReadiness.earned += RUBRIC_WEIGHTS.ENVIRONMENT_PROD_LEAKS;
    pillars.cdReadiness.checks.push({ name: 'Production Endpoint Security (No Localhost)', earned: 5, max: 5, status: 'pass' });
  } else {
    const leakReasons = [];
    if (results.hasLocalhostLeak) leakReasons.push('localhost in environment.prod.ts');
    if (results.hasHttpApiLeak) leakReasons.push('unencrypted http:// endpoint');
    pillars.cdReadiness.checks.push({ name: 'Production Endpoint Security (No Localhost)', earned: 0, max: 5, status: 'warn', detail: leakReasons.join(', ') });
  }

  const spaPassed = !!results.hasSpaRewrite;
  if (spaPassed) {
    pillars.cdReadiness.earned += RUBRIC_WEIGHTS.SPA_SERVER_REWRITE;
    pillars.cdReadiness.checks.push({ name: 'SPA Deep Route Server Rewrite', earned: 5, max: 5, status: 'pass' });
  } else {
    pillars.cdReadiness.checks.push({ name: 'SPA Deep Route Server Rewrite', earned: 0, max: 5, status: 'warn', detail: 'Missing web.config / nginx.conf / _redirects (route reloads may 404)' });
  }

  const budgetPassed = !results.bundleBudgetExceeded && !results.gzipBudgetExceeded;
  if (budgetPassed) {
    pillars.cdReadiness.earned += RUBRIC_WEIGHTS.BUNDLE_AND_GZIP_BUDGETS;
    pillars.cdReadiness.checks.push({ name: 'Bundle Sizing & Gzip Budgets', earned: 5, max: 5, status: 'pass' });
  } else {
    pillars.cdReadiness.earned += 2;
    pillars.cdReadiness.checks.push({ name: 'Bundle Sizing & Gzip Budgets', earned: 2, max: 5, status: 'warn', detail: 'Bundle or gzip exceeds enterprise performance budget' });
  }

  // Total Score & Grade Calculation
  const totalEarned = Object.values(pillars).reduce((sum, p) => sum + p.earned, 0);
  const totalScore = Math.max(0, Math.min(100, Math.round((totalEarned / MAX_TOTAL_SCORE) * 100)));
  const { grade, label, color } = calculateGrade(totalScore);

  // Dynamic CI/CD Sub-Scores (mathematically derived from actual pillar performance)
  const ciPillarsScore = pillars.security.earned + pillars.staticAnalysis.earned + pillars.architecture.earned + pillars.testHealth.earned;
  const ciPillarsMax = pillars.security.max + pillars.staticAnalysis.max + pillars.architecture.max + pillars.testHealth.max; // 85
  const dynamicCiScore = Math.round((ciPillarsScore / ciPillarsMax) * 100);

  const cdPillarsScore = pillars.cdReadiness.earned;
  const cdPillarsMax = pillars.cdReadiness.max; // 15
  const dynamicCdScore = Math.round((cdPillarsScore / cdPillarsMax) * 100);

  return {
    totalScore,
    grade,
    gradeLabel: label,
    gradeColor: color,
    pillars,
    ciReadinessScore: `${dynamicCiScore}%`,
    cdReadinessScore: `${dynamicCdScore}%`,
    ciComplianceScore: `${dynamicCiScore}%`,
    cdComplianceScore: `${dynamicCdScore}%`,
    allPassed: totalScore >= 70 && !results.typeScriptError && !results.secretsDetected && !results.conflictMarkersDetected
  };
}

/**
 * Renders a clean, executive ASCII scorecard for terminal output
 */
export function renderScorecard(scoreResult) {
  const { totalScore, grade, gradeLabel, pillars } = scoreResult;

  const lines = [];
  lines.push('');
  lines.push(chalk.cyan('┌─────────────────────────────────────────────────────────────────────────────┐'));
  lines.push(chalk.cyan('│') + chalk.bold.white('             🛡️  ANGULAR GATEKEEPER PRE-FLIGHT SCORECARD                     ') + chalk.cyan('│'));
  lines.push(chalk.cyan('├───────────────────────────────────────────────────┬─────────────────────────┤'));

  for (const pillar of Object.values(pillars)) {
    const earnedStr = `${pillar.earned}/${pillar.max} pts`.padStart(11);
    lines.push(chalk.cyan('│ ') + chalk.bold.white(pillar.name.padEnd(49)) + chalk.cyan(' │ ') + chalk.yellow(earnedStr) + chalk.cyan(' │'));

    for (const chk of pillar.checks) {
      let icon = chalk.green('✔');
      if (chk.status === 'warn') icon = chalk.yellow('⚠');
      if (chk.status === 'fail') icon = chalk.red('✖');

      const namePart = `  ${icon} ${chk.name}`.padEnd(49);
      const ptPart = `${chk.earned}/${chk.max}`.padStart(11);
      lines.push(chalk.cyan('│ ') + chalk.gray(namePart) + chalk.cyan(' │ ') + chalk.gray(ptPart) + chalk.cyan(' │'));
    }
    lines.push(chalk.cyan('├───────────────────────────────────────────────────┼─────────────────────────┤'));
  }

  const scoreSummary = `TOTAL SCORE: ${totalScore}/100  [GRADE: ${grade} - ${gradeLabel}]`;
  lines.push(chalk.cyan('│ ') + chalk.bold.green(scoreSummary.padEnd(75)) + chalk.cyan(' │'));
  lines.push(chalk.cyan('└─────────────────────────────────────────────────────────────────────────────┘'));
  lines.push('');

  return lines.join('\n');
}
