import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { GoogleGenAI } from '@google/genai';
import { MINI_BANNER } from './ascii-art.js';
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

function logStep(stepNum, title) {
  console.log(`\n${chalk.red.bold(`[Step ${stepNum}]`)} ${chalk.white.bold(title)}`);
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

/**
 * Recursively find all files in a directory
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

/**
 * Locate the primary compiled output folder in dist/ (handles Angular 17+ browser/ and legacy dist/<app>)
 */
function findBuildOutputDir(distPath) {
  if (!fs.existsSync(distPath)) return null;

  // Direct dist folder check
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    return distPath;
  }

  // Look for index.html in subdirectories (e.g. dist/<project>/browser or dist/<project>)
  const allFiles = getAllFiles(distPath);
  const indexHtmlFile = allFiles.find(f => path.basename(f).toLowerCase() === 'index.html');
  if (indexHtmlFile) {
    return path.dirname(indexHtmlFile);
  }

  return distPath;
}

async function runGatekeeper() {
  console.log(MINI_BANNER);
  console.log(chalk.gray(`Working Directory: ${process.cwd()}\n`));

  // =========================================================================
  // STEP 1: TARGET DETECTION (ANGULAR PROJECTS ONLY)
  // =========================================================================
  logStep(1, 'Angular Project Detection');
  const angularJsonPath = path.join(process.cwd(), 'angular.json');
  const packageJsonPath = path.join(process.cwd(), 'package.json');

  let isAngular = false;
  let projectPkg = {};

  if (fs.existsSync(packageJsonPath)) {
    try {
      projectPkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const deps = { ...(projectPkg.dependencies || {}), ...(projectPkg.devDependencies || {}) };
      if (deps['@angular/core'] || deps['@angular/cli'] || fs.existsSync(angularJsonPath)) {
        isAngular = true;
      }
    } catch (e) {
      // ignore parse error for check
    }
  }

  if (!isAngular) {
    logWarning('Non-Angular repository detected (no angular.json or @angular/core found).');
    console.log(chalk.gray('  Bypassing Angular Gatekeeper checks safely.'));
    process.exit(0);
  }

  logSuccess('Angular project verified (angular.json / @angular/core detected).');

  // =========================================================================
  // STEP 2: REMOTE REPO SYNC CHECK (INFORMATIONAL FOR COMMIT)
  // =========================================================================
  logStep(2, 'Remote Repository Sync Check');
  try {
    const currentBranch = runGit('git rev-parse --abbrev-ref HEAD', true) || 'main';
    console.log(chalk.blue(`  Current active branch: ${chalk.bold(currentBranch)}`));

    // Try fetching origin if reachable
    let fetched = false;
    try {
      runGit('git fetch origin', true);
      fetched = true;
    } catch (e) {
      // offline or origin unreachable
    }

    if (fetched) {
      const unpulledCountStr = runGit(`git rev-list --count HEAD..origin/${currentBranch}`, true);
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

  // =========================================================================
  // STEP 3: CRITICAL ANGULAR ARCHITECTURE & SOURCE FILES VALIDATION
  // =========================================================================
  logStep(3, 'Critical Angular Architecture & Source Validation');
  const requiredItems = [
    { name: 'angular.json', path: path.join(process.cwd(), 'angular.json'), type: 'file' },
    { name: 'package.json', path: path.join(process.cwd(), 'package.json'), type: 'file' },
    { name: 'src/ directory', path: path.join(process.cwd(), 'src'), type: 'dir' },
    { name: 'src/app/ directory', path: path.join(process.cwd(), 'src', 'app'), type: 'dir' }
  ];

  let missingItems = [];
  for (const item of requiredItems) {
    if (item.type === 'file') {
      if (!fs.existsSync(item.path)) {
        missingItems.push(item.name);
      }
    } else if (item.type === 'dir') {
      if (!fs.existsSync(item.path) || !fs.statSync(item.path).isDirectory()) {
        missingItems.push(item.name);
      }
    }
  }

  // Check tsconfig
  const tsconfigExists = fs.existsSync(path.join(process.cwd(), 'tsconfig.json')) || 
                         fs.existsSync(path.join(process.cwd(), 'tsconfig.app.json'));
  if (!tsconfigExists) {
    missingItems.push('tsconfig.json (or tsconfig.app.json)');
  }

  // Check main entry points
  const indexHtmlExists = fs.existsSync(path.join(process.cwd(), 'src', 'index.html')) || 
                          fs.existsSync(path.join(process.cwd(), 'src', 'index.csr.html')) ||
                          fs.existsSync(path.join(process.cwd(), 'index.html'));
  if (!indexHtmlExists) {
    missingItems.push('src/index.html (Application Main Entry Point)');
  }

  const mainTsExists = fs.existsSync(path.join(process.cwd(), 'src', 'main.ts'));
  if (!mainTsExists) {
    missingItems.push('src/main.ts (Application Bootstrap Entry Point)');
  }

  if (missingItems.length > 0) {
    logError(`Missing critical Angular file(s)/directory: ${missingItems.join(', ')}`);
    console.log(chalk.red('  Commit rejected: Ensure your project structure adheres to Angular CLI standards.\n'));
    process.exit(1);
  }
  logSuccess('All critical Angular architecture files, tsconfig, and entry points verified.');

  // =========================================================================
  // STEP 4: MANDATORY ANGULAR BUILD & TYPE COMPILATION CHECKS
  // =========================================================================
  logStep(4, 'Angular Build, Compilation & Type Checks');
  const scripts = projectPkg.scripts || {};

  // 1. Run custom linters or CI tests if configured
  if (scripts['lint']) {
    console.log(chalk.blue('  Running Angular Linter (npm run lint)...'));
    try {
      execSync('npm run lint', { stdio: 'inherit', cwd: process.cwd() });
      logSuccess('Angular linter passed.');
    } catch (err) {
      logError('Angular linter reported errors!');
      console.log(chalk.red('\n  Fix the linting issues before committing code.\n'));
      process.exit(1);
    }
  }

  if (scripts['type-check'] || scripts['typecheck']) {
    const typeScript = scripts['type-check'] ? 'type-check' : 'typecheck';
    console.log(chalk.blue(`  Running TypeScript Check (npm run ${typeScript})...`));
    try {
      execSync(`npm run ${typeScript}`, { stdio: 'inherit', cwd: process.cwd() });
      logSuccess('TypeScript checks passed.');
    } catch (err) {
      logError('TypeScript type checking failed!');
      console.log(chalk.red('\n  Fix the TypeScript errors before committing code.\n'));
      process.exit(1);
    }
  }

  if (scripts['test:ci'] || scripts['test-ci']) {
    const testScript = scripts['test:ci'] ? 'test:ci' : 'test-ci';
    console.log(chalk.blue(`  Running CI Tests (npm run ${testScript})...`));
    try {
      execSync(`npm run ${testScript}`, { stdio: 'inherit', cwd: process.cwd() });
      logSuccess('Automated CI tests passed.');
    } catch (err) {
      logError('Automated CI tests failed!');
      console.log(chalk.red('\n  Fix the failing tests before committing code.\n'));
      process.exit(1);
    }
  }

  // 2. MANDATORY ANGULAR BUILD (Catch TS errors, compiler issues, bundle generation failures)
  console.log(chalk.blue('  Running Mandatory Angular Build Compilation...'));
  let buildCommand = 'npm run build';
  if (!scripts['build']) {
    buildCommand = 'npx ng build';
  }

  console.log(chalk.gray(`  Executing: ${buildCommand}`));
  try {
    execSync(buildCommand, { stdio: 'inherit', cwd: process.cwd() });
    logSuccess('Angular compilation & build completed successfully with ZERO errors.');
  } catch (buildErr) {
    logError('Angular Build FAILED! Compilation or TypeScript errors detected.');
    console.log(chalk.red('\n  ═════════════════════════════════════════════════════════════════'));
    console.log(chalk.red.bold('  ❌ COMMIT REJECTED: Application bundle generation failed!'));
    console.log(chalk.yellow('  Please fix the Angular/TypeScript build errors displayed above.'));
    console.log(chalk.red('  ═════════════════════════════════════════════════════════════════\n'));
    process.exit(1);
  }

  // =========================================================================
  // STEP 5: COMPILED PRODUCTION ARTIFACTS VALIDATION (IIS / WEB ENTRY POINTS)
  // =========================================================================
  logStep(5, 'Production Build Artifacts Validation');
  const distPath = path.join(process.cwd(), 'dist');
  const outputDir = findBuildOutputDir(distPath);

  if (!outputDir || !fs.existsSync(outputDir)) {
    logError('Build output directory (dist/) was not generated or is missing!');
    console.log(chalk.red('  Commit rejected: Ensure ng build produces valid output.\n'));
    process.exit(1);
  }

  console.log(chalk.gray(`  Inspecting build distribution output at: ${outputDir}`));
  const outputFiles = getAllFiles(outputDir).map(f => path.relative(outputDir, f).replace(/\\/g, '/'));

  // 1. Check index.html (Main web entry point required for IIS and browsers)
  const hasIndexHtml = outputFiles.some(f => path.basename(f).toLowerCase() === 'index.html');
  if (!hasIndexHtml) {
    logError('Critical build artifact missing: index.html was not generated in distribution output!');
    console.log(chalk.red('  Commit rejected: index.html is required for IIS/web servers to load the application.\n'));
    process.exit(1);
  }

  // 2. Check compiled JavaScript bundles (main.js, polyfills.js, runtime.js / chunk hashes)
  const jsBundles = outputFiles.filter(f => f.endsWith('.js'));
  const hasMainJs = jsBundles.some(f => /^main(\.[a-zA-Z0-9]+)?\.js$/i.test(path.basename(f)) || path.basename(f).toLowerCase().startsWith('main'));
  const hasPolyfillsJs = jsBundles.some(f => /^polyfills(\.[a-zA-Z0-9]+)?\.js$/i.test(path.basename(f)) || path.basename(f).toLowerCase().startsWith('polyfills'));
  const hasRuntimeJs = jsBundles.some(f => /^runtime(\.[a-zA-Z0-9]+)?\.js$/i.test(path.basename(f)) || path.basename(f).toLowerCase().startsWith('runtime') || jsBundles.length >= 1);

  if (jsBundles.length === 0) {
    logError('Critical build artifact missing: No compiled JavaScript bundles found in output!');
    console.log(chalk.red('  Commit rejected: Application logic files (main.js, polyfills.js, runtime.js) are missing.\n'));
    process.exit(1);
  }

  // 3. Check compiled styles (styles.css / styles-*.css)
  const cssFiles = outputFiles.filter(f => f.endsWith('.css'));
  const hasStylesCss = cssFiles.some(f => path.basename(f).toLowerCase().startsWith('styles') || cssFiles.length > 0);

  // 4. Check assets directory (if source assets or public folder exists)
  const srcAssetsPath = path.join(process.cwd(), 'src', 'assets');
  const publicPath = path.join(process.cwd(), 'public');
  const hasSourceAssets = (fs.existsSync(srcAssetsPath) && fs.readdirSync(srcAssetsPath).length > 0) ||
                          (fs.existsSync(publicPath) && fs.readdirSync(publicPath).length > 0);
  
  const hasDistAssets = outputFiles.some(f => f.startsWith('assets/') || f.startsWith('media/'));

  console.log(chalk.white('  Distribution Artifact Checklist:'));
  console.log(`    ${chalk.green('✔')} index.html (Main Entry Point)`);
  console.log(`    ${chalk.green('✔')} Compiled JavaScript Bundles (${jsBundles.length} files: ${jsBundles.slice(0, 3).map(f => path.basename(f)).join(', ')}${jsBundles.length > 3 ? '...' : ''})`);
  if (hasStylesCss) {
    console.log(`    ${chalk.green('✔')} Global Styles (${cssFiles.map(f => path.basename(f)).join(', ')})`);
  }
  if (hasSourceAssets) {
    if (hasDistAssets) {
      console.log(`    ${chalk.green('✔')} Static Assets (images/fonts/icons verified in dist)`);
    } else {
      console.log(`    ${chalk.yellow('⚠')} Static Assets: Source assets detected, please verify assets config in angular.json`);
    }
  }

  logSuccess('Production distribution artifacts validated successfully.');

  // =========================================================================
  // STEP 6: AUTOMATED BUILD VERSIONING (STAGED IN ACTIVE COMMIT)
  // =========================================================================
  logStep(6, 'Automated Angular Build Versioning');
  const srcDir = path.join(process.cwd(), 'src');
  if (fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory()) {
    const buildMetaPath = path.join(srcDir, 'build-metadata.json');
    let buildData = {
      buildNumber: 0,
      version: projectPkg.version || '1.0.0',
      branch: 'main',
      commitHash: 'working-tree',
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

    // Automatically stage build-metadata.json so it gets included in the same commit
    try {
      runGit('git add src/build-metadata.json', true);
      logSuccess(`Build metadata updated & staged in current commit: Build #${buildData.buildNumber} (${buildData.commitHash}) on "${buildData.branch}"`);
    } catch (addErr) {
      logSuccess(`Build metadata updated: Build #${buildData.buildNumber} (${buildData.commitHash})`);
    }
  } else {
    console.log(chalk.gray('  Skipped: src directory not found.'));
  }

  // =========================================================================
  // STEP 7: AI KNOWLEDGE BASE AUDIT (GEMINI 2.5 FLASH)
  // =========================================================================
  logStep(7, 'Angular AI Knowledge Base Regression Audit (Gemini 2.5 Flash)');
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
      console.log(chalk.blue('  Reading git diff for current Angular changes...'));

      // Extract diff (prioritize staged changes for pre-commit)
      let diffOutput = runGit('git diff --cached', true);
      if (!diffOutput || diffOutput.trim() === '') {
        diffOutput = runGit('git diff HEAD~1', true);
      }
      if (!diffOutput || diffOutput.trim() === '') {
        diffOutput = runGit('git diff origin/main...HEAD', true);
      }
      if (!diffOutput || diffOutput.trim() === '') {
        diffOutput = runGit('git diff origin/master...HEAD', true);
      }
      if (!diffOutput || diffOutput.trim() === '') {
        diffOutput = runGit('git diff HEAD', true);
      }

      if (!diffOutput || diffOutput.trim() === '') {
        console.log(chalk.gray('  No diff detected against baseline. AI audit passed.'));
      } else {
        console.log(chalk.cyan('  Consulting Gemini 2.5 Flash to audit Angular code against known issues...'));
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `
You are a Principal Angular Architect, DevSecOps Specialist, and Code Quality Gatekeeper.
Your job is to audit incoming Git code changes in an Angular application against our repository's historical Knowledge Base of previously resolved issues, anti-patterns, bugs, and architecture rules.

### HISTORICAL RESOLVED ISSUES KNOWLEDGE BASE:
\`\`\`markdown
${knowledgeBase.slice(0, 15000)}
\`\`\`

### INCOMING GIT DIFF:
\`\`\`diff
${diffOutput.slice(0, 25000)}
\`\`\`

### ANGULAR AUDIT CRITERIA:
1. Thoroughly analyze the Git diff against each rule/bug in the Knowledge Base.
2. Specifically check for critical Angular regressions:
   - Unhandled RxJS subscription memory leaks (missing takeUntilDestroyed / async pipe).
   - Direct DOM mutations (e.g. element.nativeElement.innerHTML or document.getElementById) bypassing Angular renderer/templates.
   - Any violation of documented business rules, security rules, or architectural standards in resolved_issues.md.
3. If the diff reintroduces any previously resolved bugs or violates forbidden patterns:
   - Output: "VERDICT: FAILED"
   - Provide a concise list of specific violations with line numbers or code snippets from the diff, explaining why it violates the rule and how to fix it in Angular.
4. If the diff is clean and adheres to all documented best practices:
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
            console.log(chalk.red('  Commit/Push rejected: Please address the AI audit findings above.\n'));
            process.exit(1);
          } else {
            logSuccess('AI Knowledge Base audit PASSED. No known regressions detected.');
          }
        } catch (apiErr) {
          logError(`AI Audit call error: ${apiErr.message || apiErr}`);
          console.log(chalk.yellow('  Allowing commit/push with warning due to AI service error.'));
        }
      }
    }
  }

  // =========================================================================
  // FINAL VERDICT
  // =========================================================================
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

