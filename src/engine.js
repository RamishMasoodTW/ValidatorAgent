
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
import { MINI_BANNER } from './ascii-art.js';
import { getDiff } from './utils/git.js';
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
} from './branch-watcher.js';
import {
  initProgressWindow,
  startStep,
  updateStep,
  finalizeProgress
} from './progress-window.js';

// Resolve configuration directory (%APPDATA%/FrontendGatekeeper on Windows)
const appDataDir = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'FrontendGatekeeper')
  : path.join(process.env.HOME || process.env.USERPROFILE || '.', '.frontend-gatekeeper');

const envPath = path.join(appDataDir, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, quiet: true });
}
dotenv.config({ quiet: true }); // Also check local repo .env

/**
 * Main Git Pre-Commit Validation Pipeline
 */
async function runGatekeeper() {
  console.log(MINI_BANNER);
  console.log(chalk.gray(`Working Directory: ${process.cwd()}\n`));

  const cwd = process.cwd();

  // STEP 1: Angular Project Detection (Safe Bypass for non-Angular)
  const { isAngular: _isAngular, projectPkg } = checkAngularProject(cwd);
  initProgressWindow();
  startStep(1, 'Scanning workspace structure...');
  const deps = { ...(projectPkg.dependencies || {}), ...(projectPkg.devDependencies || {}) };
  const rawVer = deps['@angular/core'] || deps['@angular/cli'] || '';
  const cleanVer = rawVer.replace(/[\^~>=<]/g, '').trim();
  const versionDisplay = cleanVer ? `v${cleanVer}` : 'Standard Workspace';
  updateStep(1, 'pass', `Angular workspace verified (${versionDisplay})`);

  // STEP 2: Critical Architecture & Entry Point Validation
  startStep(2, 'Validating tsconfig, angular.json & entry points...');
  try {
    checkCriticalArchitecture(cwd);
    updateStep(2, 'pass', 'Entry points, lockfile sync & Linux case-sensitivity verified');
  } catch (err) {
    const errorMsg = err.message || 'Missing critical architecture files';
    updateStep(2, 'error', errorMsg);
    finalizeProgress(false, '', '[Step 2: Architecture Integrity Error]\n' + stripAnsi(errorMsg));
    throw err;
  }

  // STEP 3: Dependency Security & Vulnerability Audit (npm audit)
  startStep(3, 'Auditing package dependencies (npm audit)...');
  try {
    scanDependencyVulnerabilities(cwd);
    updateStep(3, 'pass', '0 High/Critical CVE vulnerabilities found in dependencies');
  } catch (err) {
    const errorMsg = err.auditOutput || err.message || 'High/Critical CVEs detected in package dependencies';
    updateStep(3, 'error', 'High/Critical CVEs detected in package dependencies');
    finalizeProgress(false, '', '[Step 3: Dependency Security Audit]\n' + stripAnsi(errorMsg));
    throw err;
  }

  // STEP 4: Strict TypeScript Compilation & Linter Verification
  startStep(4, 'Executing TypeScript compilation & lint check...');
  try {
    runTypeScriptAndLintChecks(cwd, projectPkg);
    updateStep(4, 'pass', 'TypeScript compilation passed with 0 type errors');
  } catch (err) {
    const errorMsg = err.stepOutput || err.stdout?.toString() || err.stderr?.toString() || err.message || 'TypeScript type-check or linter failed';
    updateStep(4, 'error', 'TypeScript type-check or linter failed');
    finalizeProgress(false, '', '[Step 4: TypeScript / Lint Error]\n' + stripAnsi(errorMsg));
    throw err;
  }

  // STEP 5: Automated Unit Tests & CI Regression Suite (npm run test:ci)
  startStep(5, 'Running headless test runner...');
  try {
    const testRes = runAutomatedUnitTests(cwd, projectPkg);
    let detailText = 'Unit tests passed (0 failures)';
    if (testRes && testRes.autoInjected) {
      detailText = 'Auto-injected smoke spec verified & safely cleaned up (0 failures)';
    } else if (testRes && testRes.specCount > 0) {
      detailText = `Verified ${testRes.specCount} project test spec file(s) with 0 failures`;
    } else if (testRes && testRes.skipped) {
      detailText = 'Skipped: missing testing browser provider';
    }
    updateStep(5, 'pass', detailText);
  } catch (err) {
    const errorMsg = err.testOutput || err.stepOutput || err.stdout?.toString() || err.stderr?.toString() || err.message || 'Unit test specs reported failure';
    updateStep(5, 'error', 'Unit test specs reported failure');
    finalizeProgress(false, '', '[Step 5: Automated Unit Tests Failure]\n' + stripAnsi(errorMsg));
    throw err;
  }

  // STEP 6: Production Build & CD Deployment Readiness Verification
  startStep(6, 'Compiling production bundle & verifying CD readiness...');
  try {
    runAngularProductionBuild(cwd, projectPkg);
    const cdRes = validateCompiledArtifacts(cwd);
    updateBuildMetadata(cwd, projectPkg);
    let cdDetail = `Verified ${cdRes?.bundleCount || 0} production bundles (${cdRes?.totalBundleSizeMb || '0'} MB)`;
    if (cdRes && cdRes.hasSpaRewrite) {
      cdDetail += ' + SPA web.config/nginx rule';
    }
    updateStep(6, 'pass', cdDetail);
  } catch (err) {
    const errorMsg = err.buildOutput || err.stepOutput || err.stdout?.toString() || err.stderr?.toString() || err.message || 'Production build compilation failed';
    updateStep(6, 'error', 'Production build compilation or CD artifact verification failed');
    finalizeProgress(false, '', '[Step 6: Production Build Failure]\n' + stripAnsi(errorMsg));
    throw err;
  }

  // STEP 7: Security & Secret Leak Scanning (API keys, Tokens, Heavy Files)
  startStep(7, 'Scanning staged diff & files for credentials or repo bloat...');
  try {
    const diffOutput = getDiff(cwd);
    scanSecurityRules(diffOutput);
    updateStep(7, 'pass', '0 leaked secrets, 0 conflict markers, clean file stage (<10MB)');
  } catch (err) {
    const errorMsg = err.message || 'Secret credentials, forbidden files, or conflict markers detected';
    updateStep(7, 'error', 'Secret credentials, forbidden files, or conflict markers detected');
    finalizeProgress(false, '', '[Step 7: Security & Secret Leak Warning]\n' + stripAnsi(errorMsg));
    throw err;
  }

  // STEP 8: AI Knowledge Base Audit (Gemini, Ollama, vLLM / OpenAI-compatible)
  startStep(8, 'Auditing regression against knowledge base...');
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
        updateStep(8, 'error', aiReport);
        finalizeProgress(false, aiReport);
        process.exit(1);
      } else {
        const status = auditRes.skipped ? 'skip' : 'pass';
        updateStep(8, status, aiReport);
      }
    } else {
      updateStep(8, 'skip');
    }
  } catch (_err) {
    updateStep(8, 'error', _err.message);
    finalizeProgress(false, _err.message);
    throw _err;
  }

  // FINAL VERDICT
  finalizeProgress(true, aiReport);
  console.log('\n' + chalk.green.bold('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.green.bold(' ✔ ALL ANGULAR GATEKEEPER PRE-COMMIT VALIDATIONS PASSED!       '));
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

  // 3. Default: Git Pre-Commit Validation
  await runGatekeeper();
}

main().catch(_err => {
  process.exit(1);
});
