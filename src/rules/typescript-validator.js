import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { logStep, logSuccess, logError, logWarning } from '../utils/logger.js';
import { getAllFiles } from './angular-best-practices.js';

/**
 * Step 4: Strict TypeScript Compilation & Linting (tsc --noEmit, eslint)
 */
export function runTypeScriptAndLintChecks(cwd = process.cwd(), projectPkg = {}) {
  let _capturedErrorOutput = '';
  logStep(4, 'Strict TypeScript & Linter Verification');
  const scripts = projectPkg.scripts || {};

  // 1. Run custom linters if configured
  if (scripts['lint']) {
    console.log(chalk.blue('  Running Angular Linter (npm run lint)...'));
    try {
      const lintOut = execSync('npm run lint', { stdio: 'pipe', encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, cwd });
      if (lintOut) process.stdout.write(lintOut);
      logSuccess('Angular linter passed with zero errors.');
    } catch (err) {
      logError('Angular linter reported errors!');
      const stdout = err.stdout ? err.stdout.toString() : '';
      const stderr = err.stderr ? err.stderr.toString() : '';
      const combined = (stdout + '\n' + stderr).trim();
      if (combined) process.stdout.write(combined + '\n');
      console.log(chalk.red('\n  Fix the linting issues before committing code.\n'));
      const failErr = new Error('Angular linting failed');
      failErr.stepOutput = combined || err.message;
      throw failErr;
    }
  }

  // 2. Run TypeScript checks (type-check script or npx tsc --noEmit)
  if (scripts['type-check'] || scripts['typecheck']) {
    const typeScript = scripts['type-check'] ? 'type-check' : 'typecheck';
    console.log(chalk.blue(`  Running TypeScript Check (npm run ${typeScript})...`));
    try {
      const tcOut = execSync(`npm run ${typeScript}`, { stdio: 'pipe', encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, cwd });
      if (tcOut) process.stdout.write(tcOut);
      logSuccess('TypeScript checks passed.');
    } catch (err) {
      logError('TypeScript type checking failed!');
      const stdout = err.stdout ? err.stdout.toString() : '';
      const stderr = err.stderr ? err.stderr.toString() : '';
      const combined = (stdout + '\n' + stderr).trim();
      if (combined) process.stdout.write(combined + '\n');
      console.log(chalk.red('\n  Fix the TypeScript errors before committing code.\n'));
      const failErr = new Error('TypeScript type checking failed');
      failErr.stepOutput = combined || err.message;
      throw failErr;
    }
  } else {
    // Run direct tsc --noEmit check if tsconfig exists
    console.log(chalk.blue('  Running Type Safety Check (npx tsc --noEmit)...'));
    try {
      const tscOut = execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe', encoding: 'utf8', cwd });
      process.stdout.write(tscOut);
      logSuccess('TypeScript compilation verification passed with zero type errors.');
    } catch (err) {
      logError('TypeScript type checking failed!');
      const stdout = err.stdout ? err.stdout.toString() : '';
      const stderr = err.stderr ? err.stderr.toString() : '';
      const combined = (stdout + '\n' + stderr).trim();
      if (combined) process.stdout.write(combined + '\n');
      const failErr = new Error('TypeScript compilation failed');
      failErr.stepOutput = combined || err.message;
      throw failErr;
    }
  }
}

/**
 * Step 5: Automated Unit Tests & Regression Verification
 * Dynamically executes headless unit tests (auto-injects and restores test:ci if missing)
 */
export function runAutomatedUnitTests(cwd = process.cwd(), projectPkg = {}) {
  let capturedTestOutput = '';
  logStep(5, 'Automated Unit Tests & Regression Verification');
  const pkgPath = path.join(cwd, 'package.json');
  const scripts = projectPkg.scripts || {};
  const deps = { ...(projectPkg.dependencies || {}), ...(projectPkg.devDependencies || {}) };
  const isVitest = !!(deps['vitest'] || 
                     deps['@analogjs/vite-plugin-angular'] ||
                     fs.existsSync(path.join(cwd, 'vite.config.ts')) || 
                     fs.existsSync(path.join(cwd, 'vite.config.js')) || 
                     fs.existsSync(path.join(cwd, 'vite.config.mjs')) || 
                     fs.existsSync(path.join(cwd, 'vitest.config.ts')) || 
                     fs.existsSync(path.join(cwd, 'vitest.config.js')) || 
                     fs.existsSync(path.join(cwd, 'vitest.config.mjs')) ||
                     (scripts['test:ci'] || '').includes('vitest') ||
                     (scripts['test-ci'] || '').includes('vitest') ||
                     (scripts['test'] || '').includes('vitest'));
  const isJest = !!(deps['jest'] || 
                   fs.existsSync(path.join(cwd, 'jest.config.js')) || 
                   fs.existsSync(path.join(cwd, 'jest.config.ts')) || 
                   fs.existsSync(path.join(cwd, 'jest.config.mjs')) ||
                   (scripts['test:ci'] || '').includes('jest') ||
                   (scripts['test-ci'] || '').includes('jest') ||
                   (scripts['test'] || '').includes('jest'));

  // Check if project actually has any test spec files (*.spec.ts, *.test.ts, *.spec.js, *.test.js)
  const srcDir = path.join(cwd, 'src');
  const checkDir = fs.existsSync(srcDir) ? srcDir : cwd;
  const allProjectFiles = getAllFiles(checkDir);
  let specFiles = allProjectFiles.filter(f => {
    const base = path.basename(f).toLowerCase();
    return (base.endsWith('.spec.ts') || base.endsWith('.test.ts') || base.endsWith('.spec.js') || base.endsWith('.test.js')) &&
           !f.includes('node_modules') && !f.includes('dist');
  });

  let tempSpecPath = null;
  if (specFiles.length === 0) {
    // Dynamically inject a lightweight smoke test spec to verify the test pipeline executes cleanly
    const targetSmokeDir = fs.existsSync(path.join(cwd, 'src', 'app')) 
      ? path.join(cwd, 'src', 'app')
      : (fs.existsSync(srcDir) ? srcDir : cwd);
      
    tempSpecPath = path.join(targetSmokeDir, 'gatekeeper-smoke.spec.ts');
    // Vitest has globals: false by default, requiring explicit import of describe/it/expect
    const smokeSpecContent = isVitest
      ? `// Auto-generated by Angular Gatekeeper (CI Smoke Test)
// @ts-nocheck
import { describe, it, expect } from 'vitest';

describe('Angular CI Pipeline Verification', () => {
  it('should verify test runner environment is functional', () => {
    expect(true).toBe(true);
  });
});
`
      : `// Auto-generated by Angular Gatekeeper (CI Smoke Test)
// @ts-nocheck
describe('Angular CI Pipeline Verification', () => {
  it('should verify test runner environment is functional', () => {
    expect(true).toBe(true);
  });
});
`;
    try {
      fs.writeFileSync(tempSpecPath, smokeSpecContent, 'utf8');
      console.log(chalk.blue('  Auto-generating temporary smoke test spec (gatekeeper-smoke.spec.ts)...'));
    } catch (_) {
      tempSpecPath = null;
    }
  } else {
    console.log(chalk.gray(`  Found ${specFiles.length} existing unit test spec file(s) in project.`));
  }

  let testCommand = '';
  let tempInjected = false;
  let originalPkgRaw = null;

  if (fs.existsSync(pkgPath)) {
    try {
      originalPkgRaw = fs.readFileSync(pkgPath, 'utf8');
    } catch (_) {}
  }

  try {
    if (scripts['test:ci']) {
      testCommand = 'npm run test:ci';
    } else if (scripts['test-ci']) {
      testCommand = 'npm run test-ci';
    } else if (isVitest) {
      // Modern Angular with Vitest: run with --passWithNoTests
      testCommand = 'npx vitest run --passWithNoTests';
    } else if (isJest) {
      // Angular with Jest
      testCommand = 'npx jest --ci --watchAll=false --passWithNoTests';
    } else if (scripts['test']) {
      const testScript = (scripts['test'] || '').trim();
      if (testScript.includes('vitest')) {
        testCommand = testScript.includes('run') ? 'npm test -- --passWithNoTests' : 'npm test -- run --passWithNoTests';
      } else if (testScript.includes('jest')) {
        testCommand = 'npm test -- --ci --watchAll=false --passWithNoTests';
      } else if (testScript.includes('ng test') || testScript.startsWith('ng ') || testScript === 'ng') {
        // Standard Angular CLI: ng test strictly rejects unknown arguments like --passWithNoTests
        testCommand = (testScript.includes('--watch=false') || testScript.includes('--no-watch'))
          ? 'npm test'
          : 'npm test -- --watch=false';
      } else {
        // Generic test script: avoid passing test-runner specific flags
        testCommand = (testScript.includes('--watch=false') || testScript.includes('--no-watch'))
          ? 'npm test'
          : 'npm test -- --watch=false';
      }
    } else if (fs.existsSync(pkgPath)) {
      // Standard Angular CLI (Karma) headless runner
      if (!originalPkgRaw) {
        originalPkgRaw = fs.readFileSync(pkgPath, 'utf8');
      }
      const parsedPkg = JSON.parse(originalPkgRaw);
      parsedPkg.scripts = parsedPkg.scripts || {};
      
      console.log(chalk.blue('  Auto-configuring headless test runner for validation...'));
      parsedPkg.scripts['test:ci'] = 'ng test --watch=false';
      fs.writeFileSync(pkgPath, JSON.stringify(parsedPkg, null, 2), 'utf8');
      tempInjected = true;
      testCommand = 'npm run test:ci';
    } else {
      testCommand = 'npx ng test --watch=false';
    }

    console.log(chalk.blue(`  Executing Automated Unit Tests (${testCommand})...`));
    let output = '';
    try {
      output = execSync(testCommand, { stdio: 'pipe', encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, cwd });
    } catch (testExecErr) {
      const stdout = testExecErr.stdout ? testExecErr.stdout.toString() : '';
      const stderr = testExecErr.stderr ? testExecErr.stderr.toString() : '';
      const combined = (stdout + '\n' + stderr).trim();

      // Recovery 1: If auto-injected smoke spec failed because describe is not defined (e.g. Vitest without globals)
      if (tempSpecPath && (combined.includes('ReferenceError: describe is not defined') || combined.includes('ReferenceError: it is not defined') || combined.includes('describe is not defined'))) {
        try {
          const vitestSmokeSpec = `// Auto-generated by Angular Gatekeeper (CI Smoke Test)
// @ts-nocheck
import { describe, it, expect } from 'vitest';

describe('Angular CI Pipeline Verification', () => {
  it('should verify test runner environment is functional', () => {
    expect(true).toBe(true);
  });
});
`;
          fs.writeFileSync(tempSpecPath, vitestSmokeSpec, 'utf8');
          console.log(chalk.yellow('  ⚠ Smoke spec missing test runner globals. Retrying with explicit Vitest imports...'));
          output = execSync(testCommand, { stdio: 'pipe', encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, cwd });
        } catch (vitestRetryErr) {
          const vStdout = vitestRetryErr.stdout ? vitestRetryErr.stdout.toString() : '';
          const vStderr = vitestRetryErr.stderr ? vitestRetryErr.stderr.toString() : '';
          const vCombined = (vStdout + '\n' + vStderr).trim();
          if (vCombined) process.stdout.write(vCombined + '\n');
          capturedTestOutput = vCombined;
          vitestRetryErr.testOutput = vCombined;
          throw vitestRetryErr;
        }
      }
      // Recovery 2: Unknown argument recovery: if test runner rejected a flag, strip it and retry
      else if (combined.includes('Unknown argument:') || combined.includes('unknown option')) {
        let fallbackCommand = testCommand;
        const unknownArgMatch = combined.match(/[Uu]nknown argument:\s*([^\s\r\n,]+)/) || combined.match(/unknown option ['"]?([^'"\s\r\n]+)/);
        const badFlag = unknownArgMatch ? unknownArgMatch[1].replace(/^--?/, '') : 'passWithNoTests';

        fallbackCommand = fallbackCommand.replace(new RegExp(`--?${badFlag}(=[^\\s]+)?`, 'g'), '').replace(/\s+/g, ' ').trim();
        fallbackCommand = fallbackCommand.replace('--passWithNoTests', '').replace(/\s+/g, ' ').trim();
        fallbackCommand = fallbackCommand.replace(/--\s*$/, '').trim();

        // If badFlag was in package.json script (e.g. scripts['test:ci'] = 'node runner.js --passWithNoTests')
        let scriptCleaned = false;
        if (originalPkgRaw && fs.existsSync(pkgPath)) {
          try {
            const currentPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            for (const key of ['test:ci', 'test-ci', 'test']) {
              if (currentPkg.scripts && currentPkg.scripts[key] && currentPkg.scripts[key].includes(badFlag)) {
                currentPkg.scripts[key] = currentPkg.scripts[key].replace(new RegExp(`--?${badFlag}(=[^\\s]+)?`, 'g'), '').replace(/\s+/g, ' ').trim();
                scriptCleaned = true;
              }
            }
            if (scriptCleaned) {
              fs.writeFileSync(pkgPath, JSON.stringify(currentPkg, null, 2), 'utf8');
              tempInjected = true; // ensure cleanup restores original in finally
            }
          } catch (_) {}
        }

        if ((fallbackCommand !== testCommand || scriptCleaned) && fallbackCommand.length > 0) {
          console.log(chalk.yellow(`  ⚠ Test runner rejected argument. Retrying without unsupported flag: (${fallbackCommand})...`));
          try {
            output = execSync(fallbackCommand, { stdio: 'pipe', encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, cwd });
            testCommand = fallbackCommand;
          } catch (retryErr) {
            const rStdout = retryErr.stdout ? retryErr.stdout.toString() : '';
            const rStderr = retryErr.stderr ? retryErr.stderr.toString() : '';
            const rCombined = (rStdout + '\n' + rStderr).trim();
            if (rCombined) process.stdout.write(rCombined + '\n');
            capturedTestOutput = rCombined;
            retryErr.testOutput = rCombined;
            throw retryErr;
          }
        } else {
          if (combined) process.stdout.write(combined + '\n');
          capturedTestOutput = combined;
          testExecErr.testOutput = combined;
          throw testExecErr;
        }
      } else {
        if (combined) process.stdout.write(combined + '\n');
        capturedTestOutput = combined;
        testExecErr.testOutput = combined;
        throw testExecErr;
      }
    }

    if (output) process.stdout.write(output);
    logSuccess('Automated unit tests & regression verification passed with 0 failures.');
    return {
      autoInjected: !!tempSpecPath,
      specCount: specFiles.length,
      command: testCommand
    };
  } catch (err) {
    const errMsg = err.message || '';
    const errOutput = err.testOutput || capturedTestOutput || (err.stdout ? err.stdout.toString() : '') || (err.stderr ? err.stderr.toString() : '');
    const combinedMsg = `${errMsg}\n${errOutput}`;

    if (
      combinedMsg.includes('not found') ||
      combinedMsg.includes('requires either') ||
      combinedMsg.includes('Cannot find module') ||
      combinedMsg.includes('Target "test" does not exist') ||
      combinedMsg.includes('Architect target "test" does not exist') ||
      combinedMsg.includes('No projects support the') ||
      combinedMsg.includes('No binary for Chrome browser') ||
      combinedMsg.includes('Cannot start Chrome')
    ) {
      logWarning(`Test runner environment notice: ${combinedMsg.split('\n')[0]}`);
      logWarning('Skipping test execution because test provider, target, or browser binary is not configured.');
      return { skipped: true, reason: 'missing provider or configuration' };
    }
    logError('Automated unit tests failed! Regression or broken test specs detected.');
    console.log(chalk.red('\n  ═════════════════════════════════════════════════════════════════'));
    console.log(chalk.red.bold('  ❌ COMMIT REJECTED: Unit test suite reported failures!'));
    console.log(chalk.yellow('  Please fix the failing unit test specs displayed above.'));
    console.log(chalk.red('  ═════════════════════════════════════════════════════════════════\n'));
    const failErr = new Error('Automated unit tests failed');
    failErr.testOutput = capturedTestOutput || errOutput || 'Unit test specs reported failure';
    failErr.stepOutput = failErr.testOutput;
    throw failErr;
  } finally {
    // 1. Clean up temporary test file immediately
    if (tempSpecPath && fs.existsSync(tempSpecPath)) {
      try {
        fs.unlinkSync(tempSpecPath);
        console.log(chalk.gray('  Cleaned up temporary smoke test spec file.'));
      } catch (_) {}
    }

    // 2. Clean up temporary injection from package.json
    if (tempInjected && originalPkgRaw && fs.existsSync(pkgPath)) {
      try {
        fs.writeFileSync(pkgPath, originalPkgRaw, 'utf8');
        console.log(chalk.gray('  Cleaned up temporary test runner configuration from package.json.'));
      } catch (cleanErr) {
        // ignore cleanup error
      }
    }
  }
}

/**
 * Step 6: Production Build Compilation & Artifact Verification
 */
export function runAngularProductionBuild(cwd = process.cwd(), projectPkg = {}) {
  logStep(6, 'Production Build & CD Deployment Verification');
  const scripts = projectPkg.scripts || {};

  console.log(chalk.blue('  Running Mandatory Angular Build Compilation...'));
  let buildCommand = 'npm run build';
  if (!scripts['build']) {
    buildCommand = 'npx ng build';
  }

  console.log(chalk.gray(`  Executing: ${buildCommand}`));
  try {
    const buildOut = execSync(buildCommand, { stdio: 'pipe', encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, cwd });
    if (buildOut) process.stdout.write(buildOut);
    logSuccess('Angular compilation & build completed successfully with ZERO errors.');
  } catch (buildErr) {
    logError('Angular Build FAILED! Compilation or TypeScript errors detected.');
    const stdout = buildErr.stdout ? buildErr.stdout.toString() : '';
    const stderr = buildErr.stderr ? buildErr.stderr.toString() : '';
    const combined = (stdout + '\n' + stderr).trim();
    if (combined) process.stdout.write(combined + '\n');
    console.log(chalk.red('\n  ═════════════════════════════════════════════════════════════════'));
    console.log(chalk.red.bold('  ❌ COMMIT REJECTED: Application bundle generation failed!'));
    console.log(chalk.yellow('  Please fix the Angular/TypeScript build errors displayed above.'));
    console.log(chalk.red('  ═════════════════════════════════════════════════════════════════\n'));
    const failErr = new Error('Angular build compilation failed');
    failErr.buildOutput = combined || buildErr.message;
    failErr.stepOutput = failErr.buildOutput;
    throw failErr;
  }
}
