import {
  calculatePreFlightScore,
  calculateGrade,
  renderScorecard,
  RUBRIC_WEIGHTS,
  MAX_TOTAL_SCORE
} from '../src/rules/scoring-rubric.js';

describe('Pre-Flight Quality & Readiness Scoring Rubric', () => {
  test('total rubric max weights equal exactly 100 points', () => {
    expect(MAX_TOTAL_SCORE).toBe(100);
    const sum = Object.values(RUBRIC_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  test('calculates perfect 100/100 score and A+ grade when all checks pass cleanly', () => {
    const perfectInput = {
      securityScanPassed: true,
      secretsDetected: false,
      conflictMarkersDetected: false,
      forbiddenFilesDetected: false,
      lockfileOutOfSync: false,
      isCleanroom: true,
      unstagedDriftFiles: [],
      typeScriptPassed: true,
      typeScriptError: false,
      lintPassed: true,
      lintError: false,
      casingMismatch: false,
      hasCircularDependencies: false,
      circularCycles: [],
      templateSecurityPassed: true,
      templateViolations: [],
      unitTestsPassed: true,
      unitTestsError: false,
      unitTestsSkipped: false,
      specCount: 15,
      hasLocalhostLeak: false,
      hasHttpApiLeak: false,
      hasSpaRewrite: true,
      bundleBudgetExceeded: false,
      gzipBudgetExceeded: false
    };

    const result = calculatePreFlightScore(perfectInput);
    expect(result.totalScore).toBe(100);
    expect(result.grade).toBe('A+');
    expect(result.ciReadinessScore).toBe('100%');
    expect(result.cdReadinessScore).toBe('100%');
    expect(result.allPassed).toBe(true);
  });

  test('docks points honestly when 0 unit test specs exist', () => {
    const noTestsInput = {
      securityScanPassed: true,
      secretsDetected: false,
      typeScriptPassed: true,
      lintPassed: true,
      unitTestsPassed: true,
      unitTestsSkipped: true,
      specCount: 0, // Zero specs
      hasSpaRewrite: true
    };

    const result = calculatePreFlightScore(noTestsInput);
    // Docks 5 pts for TEST_SPEC_AVAILABILITY
    expect(result.totalScore).toBe(95);
    expect(result.pillars.testHealth.earned).toBe(10); // 10 earned out of 15
    expect(result.pillars.testHealth.checks.some(c => c.name === 'Test Spec Availability' && c.earned === 0)).toBe(true);
  });

  test('docks points for localhost leak in production config and unencrypted http', () => {
    const leakInput = {
      securityScanPassed: true,
      typeScriptPassed: true,
      lintPassed: true,
      specCount: 5,
      hasLocalhostLeak: true,
      hasHttpApiLeak: true,
      hasSpaRewrite: true
    };

    const result = calculatePreFlightScore(leakInput);
    // Docks 5 pts from CD readiness (ENVIRONMENT_PROD_LEAKS)
    expect(result.pillars.cdReadiness.earned).toBe(10); // 10 out of 15
    expect(result.totalScore).toBe(95);
  });

  test('docks points for missing SPA rewrite rules', () => {
    const noSpaInput = {
      securityScanPassed: true,
      typeScriptPassed: true,
      lintPassed: true,
      specCount: 5,
      hasSpaRewrite: false
    };

    const result = calculatePreFlightScore(noSpaInput);
    expect(result.pillars.cdReadiness.earned).toBe(10);
    expect(result.pillars.cdReadiness.checks.some(c => c.name.includes('SPA') && c.status === 'warn')).toBe(true);
  });

  test('calculates correct letter grades across thresholds', () => {
    expect(calculateGrade(97).grade).toBe('A+');
    expect(calculateGrade(92).grade).toBe('A');
    expect(calculateGrade(84).grade).toBe('B');
    expect(calculateGrade(74).grade).toBe('C');
    expect(calculateGrade(65).grade).toBe('F');
  });

  test('renderScorecard outputs formatted string containing all 5 pillars and grade', () => {
    const result = calculatePreFlightScore({
      specCount: 3,
      hasSpaRewrite: true
    });

    const rendered = renderScorecard(result);
    expect(rendered).toContain('ANGULAR GATEKEEPER PRE-FLIGHT SCORECARD');
    expect(rendered).toContain('Security & Hygiene Gate');
    expect(rendered).toContain('Static Analysis & Type Safety');
    expect(rendered).toContain('Angular Architecture & Linux Parity');
    expect(rendered).toContain('Regression & Test Health');
    expect(rendered).toContain('Production & Cloud Readiness');
    expect(rendered).toContain('TOTAL SCORE:');
  });
});
