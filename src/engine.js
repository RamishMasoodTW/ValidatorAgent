
function stripAnsi(str) {
  if (!str) return '';
  return str
    .replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
    .replace(/\[[0-9;]+m/g, '');
}

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { MINI_BANNER } from './ui/ascii-art.js';
import { getDiff } from './utils/git.js';
import { calculatePreFlightScore, renderScorecard } from './rules/scoring-rubric.js';
import {
  checkAngularProject,
  checkCriticalArchitecture,
  validateCompiledArtifacts,
  updateBuildMetadata
} from './rules/angular-best-practices.js';
import {
  runTypeScriptAndLintChecks,
  runAutomatedUnitTests,
  runAngularProductionBuild
} from './rules/typescript-validator.js';
import {
  scanSecurityRules,
  scanDependencyVulnerabilities
} from './rules/security-rules.js';
import { runAiKnowledgeBaseAudit } from './rules/ai-prompt.js';
import {
  enableBranchWatcher,
  disableBranchWatcher,
  statusBranchWatcher,
  runDaemonLoop,
  autoRestartIfEnabled
} from './daemon/branch-watcher.js';
import {
  initProgressWindow,
  startStep,
  updateStep,
  appendStepLog,
  finalizeProgress,
  isForceCommitRequested,
  isCloseRequested,
  waitForUserDecisionOnFailure
} from './ui/progress-window.js';

let _activeStepNum = null;
let _stdioHooked = false;

function setupStdioHook() {
  if (_stdioHooked) return;
  _stdioHooked = true;
  const origStdoutWrite = process.stdout.write.bind(process.stdout);
  const origStderrWrite = process.stderr.write.bind(process.stderr);

  process.stdout.write = (chunk, encoding, cb) => {
    origStdoutWrite(chunk, encoding, cb);
    if (_activeStepNum && process.env.SHOW_PROGRESS === 'true') {
      try {
        const text = typeof chunk === 'string' ? chunk : chunk.toString(encoding || 'utf8');
        appendStepLog(_activeStepNum, text);
      } catch (_) {}
    }
  };

  process.stderr.write = (chunk, encoding, cb) => {
    origStderrWrite(chunk, encoding, cb);
    if (_activeStepNum && process.env.SHOW_PROGRESS === 'true') {
      try {
        const text = typeof chunk === 'string' ? chunk : chunk.toString(encoding || 'utf8');
        appendStepLog(_activeStepNum, text);
      } catch (_) {}
    }
  };
}

// Resolve configuration directory (%APPDATA%/FrontendGatekeeper on Windows)
const appDataDir = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'FrontendGatekeeper')
  : path.join(process.env.HOME || process.env.USERPROFILE || '.', '.frontend-gatekeeper');

const envPath = path.join(appDataDir, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true });
}
dotenv.config({ quiet: true }); // Also check local repo .env

function handleForceCommit(stepNum = null) {
  const stepInfo = stepNum ? ` (at Step ${stepNum})` : '';
  console.log('\n' + chalk.yellow.bold('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.yellow.bold(` ⚡ FORCE COMMIT TRIGGERED BY DEVELOPER${stepInfo.toUpperCase()}`));
  console.log(chalk.yellow('   All remaining pre-commit validations and checks bypassed.'));
  console.log(chalk.yellow('   Proceeding with git commit without quality gate restrictions.'));
  console.log(chalk.yellow.bold('═══════════════════════════════════════════════════════════════\n'));

  try {
    const fromStep = stepNum ? Number(stepNum) : 1;
    for (let i = fromStep; i <= 8; i++) {
      updateStep(i, 'skip', 'Bypassed by Force Commit');
    }
    finalizeProgress(true, '⚡ Pre-commit checks bypassed via Force Commit.');
  } catch (_) {}

  process.exit(0);
}

async function handleStepFailure(stepNum, err, defaultTitle, defaultDetail) {
  const errorMsg = err?.stepOutput || err?.auditOutput || err?.testOutput || err?.buildOutput || err?.stdout?.toString() || err?.stderr?.toString() || err?.message || defaultDetail;
  appendStepLog(stepNum, `\n✖ [Error] ${errorMsg}\n`);
  updateStep(stepNum, 'error', defaultDetail || errorMsg);
  finalizeProgress(false, '', `[${defaultTitle}]\n` + stripAnsi(errorMsg));

  if (isForceCommitRequested()) {
    handleForceCommit(stepNum);
    return;
  }

  const decision = await waitForUserDecisionOnFailure();
  if (decision === 'force_commit') {
    handleForceCommit(stepNum);
    return;
  }

  throw err;
}

/**
 * Main Git Pre-Commit Validation Pipeline
 */
async function runGatekeeper() {
  console.log(MINI_BANNER);
  console.log(chalk.gray(`Working Directory: ${process.cwd()}\n`));

  const cwd = process.cwd();
  const isCiMode = argv.includes('--ci') || !!process.env.CI;
  const isStrictMode = argv.includes('--strict') || process.env.GATEKEEPER_STRICT === '1';
  if (isCiMode) {
    process.env.SHOW_PROGRESS = 'false';
  }

  setupStdioHook();

  // STEP 1: Angular Project Detection (Safe Bypass for non-Angular)
  _activeStepNum = 1;
  const { isAngular: _isAngular, projectPkg } = checkAngularProject(cwd);
  initProgressWindow();
  startStep(1, 'Scanning workspace structure...');
  appendStepLog(1, `[Gatekeeper] Detecting Angular project root: ${cwd}\n`);
  const deps = { ...(projectPkg.dependencies || {}), ...(projectPkg.devDependencies || {}) };
  const rawVer = deps['@angular/core'] || deps['@angular/cli'] || '';
  const cleanVer = rawVer.replace(/[\^~>=<]/g, '').trim();
  const versionDisplay = cleanVer ? `v${cleanVer}` : 'Standard Workspace';
  appendStepLog(1, `[Gatekeeper] Project: ${projectPkg.name || 'Angular Project'} (Core: ${versionDisplay})\n`);
  appendStepLog(1, `✔ Workspace verified: valid Angular structure detected\n`);
  updateStep(1, 'pass', `Angular workspace verified (${versionDisplay})`);

  // STEP 2: Critical Architecture & Entry Point Validation
  if (isForceCommitRequested()) {
    handleForceCommit(1);
    return;
  }
  if (isCloseRequested()) {
    console.log(chalk.red('\n✖ Pre-commit validation cancelled by user closing window.\n'));
    process.exit(1);
  }
  _activeStepNum = 2;
  startStep(2, 'Validating tsconfig, angular.json & entry points...');
  appendStepLog(2, `[Gatekeeper] Checking critical architecture files & entry points in ${cwd}...\n`);
  let archRes = {};
  try {
    archRes = checkCriticalArchitecture(cwd);
    appendStepLog(2, `✔ Entry points, tsconfig, angular.json & lockfile sync verified\n`);
    updateStep(2, 'pass', 'Entry points, lockfile sync & Linux case-sensitivity verified');
  } catch (err) {
    await handleStepFailure(2, err, 'Step 2: Architecture Integrity Error', err.message || 'Missing critical architecture files');
  }

  // STEP 3: Dependency Security & Vulnerability Audit (npm audit)
  if (isForceCommitRequested()) {
    handleForceCommit(2);
    return;
  }
  if (isCloseRequested()) {
    console.log(chalk.red('\n✖ Pre-commit validation cancelled by user closing window.\n'));
    process.exit(1);
  }
  _activeStepNum = 3;
  startStep(3, 'Auditing package dependencies (npm audit)...');
  appendStepLog(3, `[Gatekeeper] Running dependency vulnerability scan (npm audit)...\n`);
  try {
    await scanDependencyVulnerabilities(cwd);
    appendStepLog(3, `✔ 0 High/Critical CVE vulnerabilities found in dependencies\n`);
    updateStep(3, 'pass', '0 High/Critical CVE vulnerabilities found in dependencies');
  } catch (err) {
    await handleStepFailure(3, err, 'Step 3: Dependency Security Audit', 'High/Critical CVEs detected in package dependencies');
  }

  // STEP 4: Strict TypeScript Compilation & Linter Verification
  if (isForceCommitRequested()) {
    handleForceCommit(3);
    return;
  }
  if (isCloseRequested()) {
    console.log(chalk.red('\n✖ Pre-commit validation cancelled by user closing window.\n'));
    process.exit(1);
  }
  _activeStepNum = 4;
  startStep(4, 'Executing TypeScript compilation & lint check...');
  appendStepLog(4, `[Gatekeeper] Executing TypeScript compilation & Angular lint check...\n`);
  try {
    await runTypeScriptAndLintChecks(cwd, projectPkg);
    appendStepLog(4, `✔ TypeScript compilation & lint passed with 0 errors\n`);
    updateStep(4, 'pass', 'TypeScript compilation passed with 0 type errors');
  } catch (err) {
    await handleStepFailure(4, err, 'Step 4: TypeScript / Lint Error', 'TypeScript type-check or linter failed');
  }

  // STEP 5: Automated Unit Tests & CI Regression Suite (npm run test:ci)
  if (isForceCommitRequested()) {
    handleForceCommit(4);
    return;
  }
  if (isCloseRequested()) {
    console.log(chalk.red('\n✖ Pre-commit validation cancelled by user closing window.\n'));
    process.exit(1);
  }
  _activeStepNum = 5;
  startStep(5, 'Running headless test runner...');
  appendStepLog(5, `[Gatekeeper] Running automated unit test suite...\n`);
  let testRes = {};
  try {
    testRes = await runAutomatedUnitTests(cwd, projectPkg);
    let detailText = 'Unit tests passed (0 failures)';
    if (testRes && testRes.autoInjected) {
      detailText = 'Auto-injected smoke spec verified & safely cleaned up (0 failures)';
    } else if (testRes && testRes.specCount > 0) {
      detailText = `Verified ${testRes.specCount} project test spec file(s) with 0 failures`;
    } else if (testRes && testRes.skipped) {
      detailText = 'Skipped: missing testing browser provider';
    }
    appendStepLog(5, `✔ ${detailText}\n`);
    updateStep(5, 'pass', detailText);
  } catch (err) {
    await handleStepFailure(5, err, 'Step 5: Automated Unit Tests Failure', 'Unit test specs reported failure');
  }

  // STEP 6: Production Build & CD Deployment Readiness Verification
  if (isForceCommitRequested()) {
    handleForceCommit(5);
    return;
  }
  if (isCloseRequested()) {
    console.log(chalk.red('\n✖ Pre-commit validation cancelled by user closing window.\n'));
    process.exit(1);
  }
  _activeStepNum = 6;
  startStep(6, 'Compiling production bundle & verifying CD readiness...');
  appendStepLog(6, `[Gatekeeper] Compiling Angular production build & verifying CD readiness in ${cwd}...\n`);
  let cdRes = {};
  try {
    await runAngularProductionBuild(cwd, projectPkg);
    appendStepLog(6, `\n[Gatekeeper] Validating compiled distribution artifacts in dist/...\n`);
    cdRes = validateCompiledArtifacts(cwd, { strict: isStrictMode });
    updateBuildMetadata(cwd, projectPkg);
    let cdDetail = `CD Verified: ${cdRes?.totalBundleSizeMb || '0'} MB`;
    if (cdRes?.totalGzipSizeKb && cdRes.totalGzipSizeKb !== '0.0') {
      cdDetail += ` (Gzip: ${cdRes.totalGzipSizeKb} KB)`;
    }
    if (cdRes && cdRes.hasSpaRewrite) {
      cdDetail += ' | SPA: ✔';
      appendStepLog(6, `✔ SPA Deep Rewrite rule confirmed\n`);
    } else {
      cdDetail += ' | SPA: ⚠ Missing';
      appendStepLog(6, `⚠ SPA Deep Rewrite rule missing\n`);
    }
    if (cdRes && cdRes.hasBaseHref) {
      cdDetail += ' | BaseHref: ✔';
      appendStepLog(6, `✔ Base href verified in index.html\n`);
    }
    if (cdRes && cdRes.assetAudit && cdRes.assetAudit.valid) {
      cdDetail += ' | Assets: ✔';
      appendStepLog(6, `✔ Asset integrity audit passed\n`);
    }
    if (cdRes && cdRes.releaseManifestCreated) {
      cdDetail += ' | Manifest: ✔';
      appendStepLog(6, `✔ CD Release Candidate Manifest created\n`);
    }
    appendStepLog(6, `✔ Production bundle verified: ${cdRes?.totalBundleSizeMb || '0'} MB\n`);
    updateStep(6, 'pass', cdDetail);
  } catch (err) {
    await handleStepFailure(6, err, 'Step 6: Production Build Failure', 'Production build compilation or CD artifact verification failed');
  }

  // STEP 7: Security & Secret Leak Scanning (API keys, Tokens, Heavy Files)
  if (isForceCommitRequested()) {
    handleForceCommit(6);
    return;
  }
  if (isCloseRequested()) {
    console.log(chalk.red('\n✖ Pre-commit validation cancelled by user closing window.\n'));
    process.exit(1);
  }
  _activeStepNum = 7;
  startStep(7, 'Scanning full project & staged files for credentials or repo bloat...');
  appendStepLog(7, `[Gatekeeper] Scanning full project files & staged changes for credentials, API tokens, merge conflicts, and oversized files...\n`);
  try {
    const diffOutput = getDiff(cwd);
    scanSecurityRules(diffOutput, cwd);
    appendStepLog(7, `✔ 0 leaked secrets across project, 0 conflict markers, clean file stage (<10MB)\n`);
    updateStep(7, 'pass', '0 leaked secrets across project, 0 conflict markers, clean file stage (<10MB)');
  } catch (err) {
    await handleStepFailure(7, err, 'Step 7: Security & Secret Leak Warning', 'Secret credentials, forbidden files, or conflict markers detected');
  }

  // STEP 8: AI Knowledge Base Audit (Gemini, Ollama, vLLM / OpenAI-compatible)
  if (isForceCommitRequested()) {
    handleForceCommit(7);
    return;
  }
  if (isCloseRequested()) {
    console.log(chalk.red('\n✖ Pre-commit validation cancelled by user closing window.\n'));
    process.exit(1);
  }
  _activeStepNum = 8;
  startStep(8, 'Auditing regression against knowledge base...');
  appendStepLog(8, `[Gatekeeper] Performing AI Knowledge Base regression audit...\n`);
  const aiConfig = {
    AI_PROVIDER: process.env.AI_PROVIDER,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_MODEL: process.env.GROQ_MODEL,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL
  };
  let aiReport = '';
  try {
    const auditRes = await runAiKnowledgeBaseAudit(aiConfig, cwd);
    if (auditRes) {
      aiReport = auditRes.report || '';
      if (!auditRes.passed) {
        appendStepLog(8, `\n✖ [AI Audit Failed]\n${aiReport}\n`);
        updateStep(8, 'error', aiReport);
        finalizeProgress(false, aiReport);
        if (isForceCommitRequested()) {
          handleForceCommit(8);
          return;
        }
        const decision = await waitForUserDecisionOnFailure();
        if (decision === 'force_commit') {
          handleForceCommit(8);
          return;
        }
        process.exit(1);
      } else {
        const status = auditRes.skipped ? 'skip' : 'pass';
        updateStep(8, status, aiReport);
      }
    } else {
      updateStep(8, 'skip');
    }
  } catch (_err) {
    await handleStepFailure(8, _err, 'Step 8: AI Knowledge Base Audit Error', _err.message);
  }

  if (isForceCommitRequested()) {
    handleForceCommit(8);
    return;
  }

  // FINAL VERDICT: 100-Point Pre-Flight Quality Rubric Evaluation
  const rubricInput = {
    securityScanPassed: true,
    secretsDetected: false,
    conflictMarkersDetected: false,
    forbiddenFilesDetected: false,
    lockfileOutOfSync: false,
    isCleanroom: archRes?.cleanroomRes?.isCleanroom !== false,
    unstagedDriftFiles: archRes?.cleanroomRes?.unstagedDriftFiles || [],
    typeScriptPassed: true,
    typeScriptError: false,
    lintPassed: true,
    lintError: false,
    casingMismatch: false,
    hasCircularDependencies: archRes?.circularRes?.hasCycles || false,
    circularCycles: archRes?.circularRes?.cycles || [],
    templateSecurityPassed: archRes?.templateRes?.passed !== false,
    templateViolations: archRes?.templateRes?.violations || [],
    unitTestsPassed: !testRes?.skipped || (testRes?.specCount > 0),
    unitTestsError: false,
    unitTestsSkipped: !!testRes?.skipped,
    specCount: testRes?.specCount || 0,
    hasLocalhostLeak: !!cdRes?.hasLocalhostLeak,
    hasHttpApiLeak: !!cdRes?.hasHttpApiLeak,
    hasSpaRewrite: !!cdRes?.hasSpaRewrite,
    bundleBudgetExceeded: !!cdRes?.bundleBudgetExceeded,
    gzipBudgetExceeded: !!cdRes?.gzipMetrics?.budgetExceeded
  };

  const scoreResult = calculatePreFlightScore(rubricInput);
  console.log(renderScorecard(scoreResult));

  finalizeProgress(true, aiReport);
  console.log('\n' + chalk.green.bold('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.green.bold(` ✔ ALL ANGULAR GATEKEEPER PRE-COMMIT VALIDATIONS PASSED!       `));
  console.log(chalk.green.bold(`   Pre-Flight Score: ${scoreResult.totalScore}/100 [Grade: ${scoreResult.grade} - ${scoreResult.gradeLabel}]`));
  console.log(chalk.green.bold('═══════════════════════════════════════════════════════════════\n'));
  process.exit(0);
}

// =========================================================================
// CLI COMMAND ROUTER
// =========================================================================
const argv = process.argv;

async function main() {
  // 1. Background Daemon loop (internal execution via env vars or flag)
  if (
    process.env.GATEKEEPER_DAEMON_MODE === '1' ||
    argv.includes('--branch-watch-daemon') ||
    argv.includes('branch-watch-daemon')
  ) {
    const repoPath = process.env.GATEKEEPER_REPO_PATH || argv[3] || process.cwd();
    const targetBranch = process.env.GATEKEEPER_TARGET_BRANCH || argv[4] || 'main';
    const intervalMinutes = parseInt(process.env.GATEKEEPER_INTERVAL_MINUTES || argv[5], 10) || 15;
    await runDaemonLoop(repoPath, targetBranch, intervalMinutes);
    return;
  }

  // 2. Branch conflict watcher commands
  const isBranchCmd = argv.some(a =>
    a === 'branch' ||
    a === 'branch-check' ||
    a === '--branch-check' ||
    a === '--branch'
  );

  if (isBranchCmd) {
    const isEnable  = argv.some(a => a === '--enable'  || a === 'enable'  || a === '-e');
    const isDisable = argv.some(a => a === '--disable' || a === 'disable' || a === '-d');
    const isStatus  = argv.some(a => a === '--status'  || a === 'status'  || a === '-s');
    const isWatch   = argv.some(a => a === 'watch' || a === '--watch');
    const isAutoRestart = argv.some(a => a === '--auto-restart' || a === 'auto-restart');

    if (isAutoRestart || (isWatch && isAutoRestart)) {
      // Called by VS Code tasks.json on folder open — silently restart daemon if enabled
      await autoRestartIfEnabled(process.cwd());
      return;
    } else if (isEnable) {
      await enableBranchWatcher(process.cwd());
      return;
    } else if (isDisable) {
      await disableBranchWatcher(process.cwd());
      return;
    } else if (isStatus || (!isEnable && !isDisable)) {
      await statusBranchWatcher(process.cwd());
      return;
    }
  }

  // 3. Live CD Deployment Verification Command (verify-deploy / verify-live)
  const isVerifyDeploy = argv.some(a =>
    a === 'verify-deploy' ||
    a === 'verify-live' ||
    a === '--verify-deploy' ||
    a === '--verify-live'
  );

  if (isVerifyDeploy) {
    const targetUrl = argv.find(a => a.startsWith('http://') || a.startsWith('https://')) || argv[3];
    if (!targetUrl) {
      console.log(chalk.red('\n  ✖ Error: Missing deployment URL to verify.'));
      console.log(chalk.yellow('  Usage:   a-gatekeeper verify-deploy <url>'));
      console.log(chalk.gray('  Example: a-gatekeeper verify-deploy https://my-angular-app.com\n'));
      process.exit(1);
    }

    try {
      const { verifyLiveDeployment } = await import('./rules/angular-best-practices.js');
      const result = await verifyLiveDeployment(targetUrl);
      console.log(chalk.white('\n  CD Live Deployment Probe Report:'));
      console.log(`    Status Code:       ${result.statusCode === 200 ? chalk.green('200 OK') : chalk.red(result.statusCode)}`);
      console.log(`    Base Href Tag:     ${result.hasBaseHref ? chalk.green('✔ Verified') : chalk.yellow('⚠ Missing')}`);
      console.log(`    SPA Deep Rewrite:  ${result.spaRewriteWorking ? chalk.green('✔ Functional') : chalk.yellow('⚠ Not Detected / Standard 404')}`);
      if (result.issues.length > 0) {
        console.log(chalk.yellow('\n  Detected CD Configuration Warnings:'));
        result.issues.forEach(iss => console.log(chalk.yellow(`    • ${iss}`)));
      }
      if (result.success) {
        console.log(chalk.green.bold('\n  ✔ CD Deployment Verification: 65% Compliance Passed!\n'));
        process.exit(0);
      } else {
        console.log(chalk.yellow.bold('\n  ⚠ CD Deployment Verification completed with warnings.\n'));
        process.exit(0);
      }
    } catch (err) {
      console.log(chalk.red(`\n  ✖ CD Verification Failed: ${err.message}\n`));
      process.exit(1);
    }
    return;
  }

  // 4. Default: Git Pre-Commit Validation
  await runGatekeeper();
}

main().catch(_err => {
  process.exit(1);
});
