import { execSync } from 'child_process';
import chalk from 'chalk';
import { logStep, logSuccess, logError } from '../utils/logger.js';

/**
 * Step 4: Mandatory Angular Build & TypeScript Compilation Checks
 */
export function runTypeScriptAndLintChecks(cwd = process.cwd(), projectPkg = {}) {
  logStep(4, 'Angular Build, Compilation & Type Checks');
  const scripts = projectPkg.scripts || {};

  // 1. Run custom linters if configured
  if (scripts['lint']) {
    console.log(chalk.blue('  Running Angular Linter (npm run lint)...'));
    try {
      execSync('npm run lint', { stdio: 'inherit', cwd });
      logSuccess('Angular linter passed.');
    } catch (err) {
      logError('Angular linter reported errors!');
      console.log(chalk.red('\n  Fix the linting issues before committing code.\n'));
      process.exit(1);
    }
  }

  // 2. Run TypeScript checks if script exists
  if (scripts['type-check'] || scripts['typecheck']) {
    const typeScript = scripts['type-check'] ? 'type-check' : 'typecheck';
    console.log(chalk.blue(`  Running TypeScript Check (npm run ${typeScript})...`));
    try {
      execSync(`npm run ${typeScript}`, { stdio: 'inherit', cwd });
      logSuccess('TypeScript checks passed.');
    } catch (err) {
      logError('TypeScript type checking failed!');
      console.log(chalk.red('\n  Fix the TypeScript errors before committing code.\n'));
      process.exit(1);
    }
  }

  // 3. Run CI automated tests if configured
  if (scripts['test:ci'] || scripts['test-ci']) {
    const testScript = scripts['test:ci'] ? 'test:ci' : 'test-ci';
    console.log(chalk.blue(`  Running CI Tests (npm run ${testScript})...`));
    try {
      execSync(`npm run ${testScript}`, { stdio: 'inherit', cwd });
      logSuccess('Automated CI tests passed.');
    } catch (err) {
      logError('Automated CI tests failed!');
      console.log(chalk.red('\n  Fix the failing tests before committing code.\n'));
      process.exit(1);
    }
  }

  // 4. MANDATORY ANGULAR BUILD (Catches TS errors, compiler issues, bundle generation failures)
  console.log(chalk.blue('  Running Mandatory Angular Build Compilation...'));
  let buildCommand = 'npm run build';
  if (!scripts['build']) {
    buildCommand = 'npx ng build';
  }

  console.log(chalk.gray(`  Executing: ${buildCommand}`));
  try {
    execSync(buildCommand, { stdio: 'inherit', cwd });
    logSuccess('Angular compilation & build completed successfully with ZERO errors.');
  } catch (buildErr) {
    logError('Angular Build FAILED! Compilation or TypeScript errors detected.');
    console.log(chalk.red('\n  ═════════════════════════════════════════════════════════════════'));
    console.log(chalk.red.bold('  ❌ COMMIT REJECTED: Application bundle generation failed!'));
    console.log(chalk.yellow('  Please fix the Angular/TypeScript build errors displayed above.'));
    console.log(chalk.red('  ═════════════════════════════════════════════════════════════════\n'));
    process.exit(1);
  }
}
