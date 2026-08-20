import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { MINI_BANNER } from './ascii-art.js';
import { logStep, logSuccess, logWarning, logError } from './utils/logger.js';
import { runGit, getCurrentBranch, getDiff } from './utils/git.js';
import {
  checkAngularProject,
  checkCriticalArchitecture,
  validateCompiledArtifacts,
  updateBuildMetadata
} from './rules/angular-best-practices.js';
import { runTypeScriptAndLintChecks } from './rules/typescript-validator.js';
import { scanSecurityRules } from './rules/security-rules.js';
import { runAiKnowledgeBaseAudit } from './rules/ai-prompt.js';
import {
  enableBranchWatcher,
  disableBranchWatcher,
  statusBranchWatcher,
  runDaemonLoop
} from './branch-watcher.js';

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
  const { isAngular, projectPkg } = checkAngularProject(cwd);

  // STEP 2: Remote Repository Sync Check (Informational)
  logStep(2, 'Remote Repository Sync Check');
  try {
    const currentBranch = getCurrentBranch(cwd);
    console.log(chalk.blue(`  Current active branch: ${chalk.bold(currentBranch)}`));

    let fetched = false;
    try {
      runGit('git fetch origin', true, cwd);
      fetched = true;
    } catch (e) {
      // offline or origin unreachable
    }

    if (fetched) {
      const unpulledCountStr = runGit(`git rev-list --count HEAD..origin/${currentBranch}`, true, cwd);
      const unpulledCount = parseInt(unpulledCountStr, 10);

      if (!isNaN(unpulledCount) && unpulledCount > 0) {
        logWarning(`Note: Your branch is behind origin/${currentBranch} by ${unpulledCount} commit(s). Remember to rebase before pushing.`);
      } else {
        logSuccess('Local branch is up to date with remote origin.');
      }
    } else {
      console.log(chalk.gray('  Remote sync check skipped (working locally).'));
    }
  } catch (err) {
    logWarning(`Sync check notice: ${err.message || err}. Continuing...`);
  }

  // STEP 3: Critical Architecture & Entry Point Validation
  checkCriticalArchitecture(cwd);

  // STEP 4: Mandatory Angular Build & TypeScript Compilation Checks
  runTypeScriptAndLintChecks(cwd, projectPkg);

  // STEP 5: Compiled Production Artifacts Validation
  validateCompiledArtifacts(cwd);

  // STEP 6: Automated Build Versioning (Staged in active commit)
  updateBuildMetadata(cwd, projectPkg);

  // STEP 7: Security & Secret Leak Scanning
  const diffOutput = getDiff(cwd);
  scanSecurityRules(diffOutput);

  // STEP 8: AI Knowledge Base Audit (Gemini 2.5 Flash)
  const apiKey = process.env.GEMINI_API_KEY;
  await runAiKnowledgeBaseAudit(apiKey, cwd);

  // FINAL VERDICT
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
    const isEnable = argv.some(a => a === '--enable' || a === 'enable' || a === '-e');
    const isDisable = argv.some(a => a === '--disable' || a === 'disable' || a === '-d');
    const isStatus = argv.some(a => a === '--status' || a === 'status' || a === '-s');

    if (isEnable) {
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

main().catch(err => {
  console.error(chalk.red.bold(`\nUnhandled Gatekeeper Error: ${err.message}`));
  console.error(err);
  process.exit(1);
});
