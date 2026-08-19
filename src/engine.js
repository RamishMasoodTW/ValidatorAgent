#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { GoogleGenAI } from '@google/genai';
import { MINI_BANNER } from './ascii-art.js';

// Resolve configuration directory (%APPDATA%/FrontendGatekeeper on Windows)
const appDataDir = process.env.APPDATA 
  ? path.join(process.env.APPDATA, 'FrontendGatekeeper')
  : path.join(process.env.HOME || process.env.USERPROFILE || '.', '.frontend-gatekeeper');

const envPath = path.join(appDataDir, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
dotenv.config(); // Also check local repo .env

function logStep(stepNum, title) {
  console.log(`\n${chalk.cyan.bold(`[Step ${stepNum}]`)} ${chalk.white.bold(title)}`);
  console.log(chalk.gray('─'.repeat(60)));
}

function logSuccess(msg) {
  console.log(`${chalk.green('✔')} ${chalk.green.bold(msg)}`);
}

function logWarning(msg) {
  console.log(`${chalk.yellow('⚠')} ${chalk.yellow(msg)}`);
}

function logError(msg) {
  console.log(`${chalk.red('✖')} ${chalk.red.bold(msg)}`);
}

function runGit(command, allowFail = false) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    if (!allowFail) {
      throw err;
    }
    return '';
  }
}

async function runGatekeeper() {
  console.log(MINI_BANNER);
  console.log(chalk.gray(`Working Directory: ${process.cwd()}\n`));

  // =========================================================================
  // STEP 1: TARGET DETECTION
  // =========================================================================
  logStep(1, 'Target Node.js Project Detection');
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    logWarning('No package.json found in current directory. Non-Node project detected.');
    console.log(chalk.gray('  Bypassing frontend gatekeeper checks safely.'));
    process.exit(0);
  }
  logSuccess('Node.js project detected with package.json.');

  let projectPkg = {};
  try {
    projectPkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  } catch (e) {
    logError('Invalid package.json format.');
    process.exit(1);
  }

  // =========================================================================
  // STEP 2: REMOTE REPO SYNC CHECK
  // =========================================================================
  logStep(2, 'Remote Repository Sync Check');
  try {
    const currentBranch = runGit('git rev-parse --abbrev-ref HEAD', true) || 'main';
    console.log(chalk.blue(`  Current active branch: ${chalk.bold(currentBranch)}`));

    // Try fetching origin
    try {
      console.log(chalk.gray('  Fetching latest remote status from origin...'));
      runGit('git fetch origin', true);
    } catch (e) {
      logWarning('Could not reach remote repository. Continuing with local checks.');
    }

    const unpulledCountStr = runGit(`git rev-list --count HEAD..origin/${currentBranch}`, true);
    const unpulledCount = parseInt(unpulledCountStr, 10);

    if (!isNaN(unpulledCount) && unpulledCount > 0) {
      logError(`CRITICAL: Your local branch is behind origin/${currentBranch} by ${unpulledCount} commit(s)!`);
      console.log(chalk.yellow('\n  Please pull remote changes first to prevent merge conflicts:'));
      console.log(chalk.cyan.bold('  $ git pull --rebase\n'));
      process.exit(1);
    }
    logSuccess('Local branch is up to date with remote origin.');
  } catch (err) {
    logWarning(`Sync check warning: ${err.message || err}. Continuing...`);
  }

  // =========================================================================
  // STEP 3: CRITICAL FILES VALIDATION
  // =========================================================================
  logStep(3, 'Critical Frontend Files & Directory Structure Validation');
  const requiredItems = [
    { name: 'package.json', path: path.join(process.cwd(), 'package.json'), type: 'file' },
    { name: 'index.html', path: path.join(process.cwd(), 'index.html'), type: 'file', optionalIfNoIndexHtml: false },
    { name: 'src/ directory', path: path.join(process.cwd(), 'src'), type: 'dir' }
  ];

  let missingItems = [];
  for (const item of requiredItems) {
    if (item.type === 'file') {
      if (!fs.existsSync(item.path)) {
        // Special check: some projects have index.html inside public/ or client/ or src/
        if (item.name === 'index.html') {
          const altPaths = [
            path.join(process.cwd(), 'public', 'index.html'),
            path.join(process.cwd(), 'src', 'index.html')
          ];
          if (!altPaths.some(p => fs.existsSync(p))) {
            missingItems.push(item.name);
          }
        } else {
          missingItems.push(item.name);
        }
      }
    } else if (item.type === 'dir') {
      if (!fs.existsSync(item.path) || !fs.statSync(item.path).isDirectory()) {
        missingItems.push(item.name);
      }
    }
  }

  if (missingItems.length > 0) {
    logError(`Missing critical frontend file(s)/directory: ${missingItems.join(', ')}`);
    console.log(chalk.red('  Push rejected: Ensure your project structure adheres to frontend standards.\n'));
    process.exit(1);
  }
  logSuccess('All critical frontend files and directories verified.');

  // =========================================================================
  // STEP 4: CODE QUALITY & TYPE CHECKS
  // =========================================================================
  logStep(4, 'Code Quality, Linting & Type Checks');
  const scripts = projectPkg.scripts || {};
  const checksToRun = [];

  if (scripts['type-check'] || scripts['typecheck']) {
    checksToRun.push({ name: 'Type Check', script: scripts['type-check'] ? 'type-check' : 'typecheck' });
  }
  if (scripts['lint']) {
    checksToRun.push({ name: 'Linter', script: 'lint' });
  }
  if (scripts['test']) {
    // Only run test if it's not the default placeholder
    if (!scripts['test'].includes('no test specified')) {
      checksToRun.push({ name: 'Automated Tests', script: 'test' });
    }
  }

  if (checksToRun.length === 0) {
    console.log(chalk.gray('  No type-check, lint, or test scripts configured in package.json.'));
  } else {
    for (const check of checksToRun) {
      console.log(chalk.blue(`  Running: npm run ${check.script}...`));
      try {
        execSync(`npm run ${check.script}`, { stdio: 'inherit', cwd: process.cwd() });
        logSuccess(`${check.name} passed successfully.`);
      } catch (err) {
        logError(`${check.name} failed!`);
        console.log(chalk.red(`\n  Fix the errors reported above before pushing code.\n`));
        process.exit(1);
      }
    }
  }

  // =========================================================================
  // STEP 5: AUTOMATED BUILD VERSIONING
  // =========================================================================
  logStep(5, 'Automated Build Versioning');
  const srcDir = path.join(process.cwd(), 'src');
  if (fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory()) {
    const buildMetaPath = path.join(srcDir, 'build-metadata.json');
    let buildData = {
      buildNumber: 0,
      version: projectPkg.version || '1.0.0',
      branch: 'main',
      commitHash: 'unknown',
      builtAt: new Date().toISOString()
    };

    if (fs.existsSync(buildMetaPath)) {
      try {
        buildData = { ...buildData, ...JSON.parse(fs.readFileSync(buildMetaPath, 'utf8')) };
      } catch (e) {
        // ignore JSON parse error, start fresh
      }
    }

    buildData.buildNumber = (Number(buildData.buildNumber) || 0) + 1;
    buildData.version = projectPkg.version || buildData.version;
    buildData.branch = runGit('git rev-parse --abbrev-ref HEAD', true) || 'main';
    buildData.commitHash = runGit('git rev-parse --short HEAD', true) || 'uncommitted';
    buildData.builtAt = new Date().toISOString();

    fs.writeFileSync(buildMetaPath, JSON.stringify(buildData, null, 2), 'utf8');
    logSuccess(`Build metadata updated: Build #${buildData.buildNumber} (${buildData.commitHash}) on branch "${buildData.branch}"`);
  } else {
    console.log(chalk.gray('  Skipped: src directory not found.'));
  }

  // =========================================================================
  // STEP 6: AI KNOWLEDGE BASE AUDIT (GEMINI 2.5 FLASH)
  // =========================================================================
  logStep(6, 'AI Knowledge Base Regression Audit (Gemini 2.5 Flash)');
  const resolvedIssuesPath = path.join(process.cwd(), 'resolved_issues.md');

  if (!fs.existsSync(resolvedIssuesPath)) {
    console.log(chalk.gray('  No resolved_issues.md found at repository root. AI audit skipped.'));
  } else {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logWarning('resolved_issues.md detected, but GEMINI_API_KEY is not set in environment or config.');
      console.log(chalk.gray('  To enable AI audits, run FrontendGatekeeperSetup.exe or set GEMINI_API_KEY.'));
    } else {
      const knowledgeBase = fs.readFileSync(resolvedIssuesPath, 'utf8');
      console.log(chalk.blue('  Reading git diff for current changes...'));

      // Extract diff
      let diffOutput = runGit('git diff origin/main...HEAD', true);
      if (!diffOutput || diffOutput.trim() === '') {
        diffOutput = runGit('git diff origin/master...HEAD', true);
      }
      if (!diffOutput || diffOutput.trim() === '') {
        diffOutput = runGit('git diff HEAD~1', true);
      }
      if (!diffOutput || diffOutput.trim() === '') {
        diffOutput = runGit('git diff --cached', true);
      }
      if (!diffOutput || diffOutput.trim() === '') {
        diffOutput = runGit('git diff HEAD', true);
      }

      if (!diffOutput || diffOutput.trim() === '') {
        console.log(chalk.gray('  No diff detected against baseline. AI audit passed.'));
      } else {
        console.log(chalk.cyan('  Consulting Gemini 2.5 Flash to audit code against known issues...'));
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `
You are an expert Senior DevSecOps & Frontend Quality Assurance AI Gatekeeper.
Your job is to audit incoming Git code changes against our repository's historical Knowledge Base of previously resolved issues, anti-patterns, bugs, and architecture rules.

### HISTORICAL RESOLVED ISSUES KNOWLEDGE BASE:
\`\`\`markdown
${knowledgeBase.slice(0, 15000)}
\`\`\`

### INCOMING GIT DIFF:
\`\`\`diff
${diffOutput.slice(0, 25000)}
\`\`\`

### TASK:
1. Thoroughly analyze the Git diff against each rule/bug in the Knowledge Base.
2. If the diff reintroduces any previously resolved bugs, repeats documented bad patterns, violates forbidden patterns, or ignores critical requirements:
   - Output: "VERDICT: FAILED"
   - Provide a concise list of specific violations with line numbers or code snippets from the diff, explaining why it violates the rule and how to fix it.
3. If the diff is clean and adheres to all documented best practices:
   - Output: "VERDICT: PASSED"
   - Provide a 1-2 sentence positive summary.

Ensure your response clearly includes either "VERDICT: PASSED" or "VERDICT: FAILED" in capital letters.
`;

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
          });

          const resultText = response.text || '';
          console.log('\n' + chalk.gray('─'.repeat(60)));
          console.log(chalk.bold('AI Audit Report:'));
          console.log(resultText);
          console.log(chalk.gray('─'.repeat(60)) + '\n');

          if (resultText.includes('VERDICT: FAILED')) {
            logError('AI Gatekeeper detected regressions or violations of resolved_issues.md!');
            console.log(chalk.red('  Push rejected: Please address the AI audit findings above.\n'));
            process.exit(1);
          } else {
            logSuccess('AI Knowledge Base audit PASSED. No known regressions detected.');
          }
        } catch (apiErr) {
          logError(`AI Audit call error: ${apiErr.message || apiErr}`);
          console.log(chalk.yellow('  Allowing push with warning due to AI service error.'));
        }
      }
    }
  }

  // =========================================================================
  // FINAL VERDICT
  // =========================================================================
  console.log('\n' + chalk.green.bold('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.green.bold('       ✔ ALL GATEKEEPER PRE-PUSH VALIDATIONS PASSED!           '));
  console.log(chalk.green.bold('═══════════════════════════════════════════════════════════════\n'));
  process.exit(0);
}

runGatekeeper().catch(err => {
  console.error(chalk.red.bold(`\nUnhandled Gatekeeper Error: ${err.message}`));
  console.error(err);
  process.exit(1);
});
