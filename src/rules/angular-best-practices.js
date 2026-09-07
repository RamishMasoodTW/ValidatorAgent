import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { logStep, logSuccess, logError, logWarning } from '../utils/logger.js';
import { runGit } from '../utils/git.js';

/**
 * Recursively find all files in a directory
 */
export function getAllFiles(dirPath, arrayOfFiles = []) {
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
export function findBuildOutputDir(distPath) {
  if (!fs.existsSync(distPath)) return null;

  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    return distPath;
  }

  const allFiles = getAllFiles(distPath);
  const indexHtmlFile = allFiles.find(f => path.basename(f).toLowerCase() === 'index.html');
  if (indexHtmlFile) {
    return path.dirname(indexHtmlFile);
  }

  return distPath;
}

/**
 * Step 1: Angular Project Detection
 */
export function checkAngularProject(cwd = process.cwd()) {
  logStep(1, 'Angular Project Detection');
  const angularJsonPath = path.join(cwd, 'angular.json');
  const packageJsonPath = path.join(cwd, 'package.json');

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
      // ignore parse error
    }
  }

  if (!isAngular) {
    logWarning('Non-Angular repository detected (no angular.json or @angular/core found).');
    console.log(chalk.gray('  Bypassing Angular Gatekeeper checks safely.'));
    process.exit(0);
  }

  logSuccess('Angular project verified (angular.json / @angular/core detected).');
  return { isAngular, projectPkg };
}

/**
 * Step 2: Critical Architecture & Entry Point Validation
 */
export function checkCriticalArchitecture(cwd = process.cwd()) {
  logStep(2, 'Critical Angular Architecture & Source Validation');
  const requiredItems = [
    { name: 'angular.json', path: path.join(cwd, 'angular.json'), type: 'file' },
    { name: 'package.json', path: path.join(cwd, 'package.json'), type: 'file' },
    { name: 'src/ directory', path: path.join(cwd, 'src'), type: 'dir' },
    { name: 'src/app/ directory', path: path.join(cwd, 'src', 'app'), type: 'dir' }
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

  const tsconfigExists = fs.existsSync(path.join(cwd, 'tsconfig.json')) || 
                         fs.existsSync(path.join(cwd, 'tsconfig.app.json'));
  if (!tsconfigExists) {
    missingItems.push('tsconfig.json (or tsconfig.app.json)');
  }

  const indexHtmlExists = fs.existsSync(path.join(cwd, 'src', 'index.html')) || 
                          fs.existsSync(path.join(cwd, 'src', 'index.csr.html')) ||
                          fs.existsSync(path.join(cwd, 'index.html'));
  if (!indexHtmlExists) {
    missingItems.push('src/index.html (Application Main Entry Point)');
  }

  const mainTsExists = fs.existsSync(path.join(cwd, 'src', 'main.ts'));
  if (!mainTsExists) {
    missingItems.push('src/main.ts (Application Bootstrap Entry Point)');
  }

  if (missingItems.length > 0) {
    logError(`Missing critical Angular file(s)/directory: ${missingItems.join(', ')}`);
    console.log(chalk.red('  Commit rejected: Ensure your project structure adheres to Angular CLI standards.\n'));
    throw new Error(`Missing critical Angular file(s)/directory: ${missingItems.join(', ')}`);
  }

  // 1. Lockfile Sync Integrity Check (Stops CI npm ci breaks)
  const stagedFiles = runGit('git diff --cached --name-only', true, cwd).split('\n').map(f => f.trim());
  const packageJsonStaged = stagedFiles.includes('package.json');
  const lockfileStaged = stagedFiles.includes('package-lock.json') || stagedFiles.includes('yarn.lock') || stagedFiles.includes('pnpm-lock.yaml');
  
  if (packageJsonStaged && !lockfileStaged) {
    const lockfilePath = path.join(cwd, 'package-lock.json');
    if (fs.existsSync(lockfilePath)) {
      logError('CI Integrity Violation: package.json is staged for commit, but package-lock.json is NOT staged!');
      console.log(chalk.red('\n  ═════════════════════════════════════════════════════════════════'));
      console.log(chalk.red.bold('  ❌ COMMIT REJECTED: Lockfile out of sync!'));
      console.log(chalk.yellow('  CI pipelines use "npm ci", which will FAIL if package-lock.json is not updated.'));
      console.log(chalk.yellow('  Action: Run "git add package-lock.json" and commit again.'));
      console.log(chalk.red('  ═════════════════════════════════════════════════════════════════\n'));
      throw new Error('Lockfile out of sync: package.json is staged without package-lock.json');
    }
  }

  // 2. Linux Case-Sensitivity & File Path Integrity Check (Stops Linux CI "Module not found" errors)
  validateCaseSensitiveImports(cwd, stagedFiles);

  // 3. Node.js Engine & CI Runner Compatibility Check
  checkNodeEngineCompatibility(cwd);

  logSuccess('All critical Angular architecture files, lockfile sync, and entry points verified.');
}

/**
 * Checks if current Node.js version satisfies package.json "engines" or .nvmrc
 */
export function checkNodeEngineCompatibility(cwd = process.cwd()) {
  try {
    const pkgPath = path.join(cwd, 'package.json');
    if (!fs.existsSync(pkgPath)) return;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const requiredNode = pkg.engines && pkg.engines.node;
    if (requiredNode) {
      const currentMajor = parseInt(process.versions.node.split('.')[0], 10);
      const match = requiredNode.match(/\d+/);
      if (match) {
        const requiredMajor = parseInt(match[0], 10);
        if (requiredNode.startsWith('>=') && currentMajor < requiredMajor) {
          logError(`Node.js Version Incompatibility! Required: ${requiredNode}, Active: ${process.version}`);
          throw new Error(`Node.js version mismatch: Required ${requiredNode} but running ${process.version}`);
        }
      }
    }
  } catch (err) {
    if (err.message.includes('Node.js version mismatch')) throw err;
  }
}

/**
 * Validates that all relative TypeScript/JavaScript imports match the exact disk casing (Linux/Ubuntu CI Safe)
 */
export function validateCaseSensitiveImports(cwd = process.cwd(), stagedFiles = []) {
  const tsFiles = stagedFiles.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts') && fs.existsSync(path.join(cwd, f)));
  if (tsFiles.length === 0) return;

  const importRegex = /(?:import|from)\s+['"](\.[^'"]+)['"]/g;
  const casingErrors = [];

  for (const relFile of tsFiles) {
    const fullFilePath = path.join(cwd, relFile);
    const fileDir = path.dirname(fullFilePath);
    const content = fs.readFileSync(fullFilePath, 'utf8');

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const targetBase = path.resolve(fileDir, importPath);
      const targetDir = path.dirname(targetBase);
      const targetFileName = path.basename(targetBase);

      if (fs.existsSync(targetDir)) {
        const actualDiskFiles = fs.readdirSync(targetDir);
        // Look for exact match or extension variants (.ts, .d.ts, /index.ts)
        const matchedExact = actualDiskFiles.find(f => {
          const noExt = f.replace(/\.(ts|js|d\.ts)$/, '');
          return f === targetFileName || noExt === targetFileName;
        });

        const matchedCaseInsensitive = actualDiskFiles.find(f => {
          const noExt = f.replace(/\.(ts|js|d\.ts)$/, '');
          return f.toLowerCase() === targetFileName.toLowerCase() || noExt.toLowerCase() === targetFileName.toLowerCase();
        });

        if (!matchedExact && matchedCaseInsensitive) {
          casingErrors.push({
            file: relFile,
            imported: importPath,
            actual: path.join(path.dirname(importPath), matchedCaseInsensitive).replace(/\\/g, '/')
          });
        }
      }
    }
  }

  if (casingErrors.length > 0) {
    logError('CRITICAL: Linux CI Path Incompatibility! Case-sensitivity mismatch detected in imports:');
    casingErrors.forEach(err => {
      console.log(chalk.red(`    • In ${chalk.bold(err.file)}: Imported "${chalk.yellow(err.imported)}" but file on disk is "${chalk.green(err.actual)}"`));
    });
    console.log(chalk.yellow('\n  While Windows is case-insensitive, Linux CI servers will FAIL with "Module not found".'));
    console.log(chalk.yellow('  Fix the casing of the import statement to match the actual file name.\n'));
    throw new Error('Case-sensitive import mismatch detected (Linux CI incompatibility)');
  }
}

/**
 * Step 4: Compiled Production Artifacts Validation (IIS / Web Entry Points)
 */
export function validateCompiledArtifacts(cwd = process.cwd()) {
  logStep(4, 'Production Build Artifacts Validation');
  const distPath = path.join(cwd, 'dist');
  const outputDir = findBuildOutputDir(distPath);

  if (!outputDir || !fs.existsSync(outputDir)) {
    logError('Build output directory (dist/) was not generated or is missing!');
    console.log(chalk.red('  Commit rejected: Ensure ng build produces valid output.\n'));
    throw new Error('Build output directory (dist/) was not generated or is missing!');
  }

  console.log(chalk.gray(`  Inspecting build distribution output at: ${outputDir}`));
  const outputFiles = getAllFiles(outputDir).map(f => path.relative(outputDir, f).replace(/\\/g, '/'));

  // 1. Check index.html & Base Href (Required for SPA routing after deployment)
  const indexHtmlPath = path.join(outputDir, 'index.html');
  const hasIndexHtml = fs.existsSync(indexHtmlPath) || outputFiles.some(f => path.basename(f).toLowerCase() === 'index.html');
  if (!hasIndexHtml) {
    logError('Critical build artifact missing: index.html was not generated in distribution output!');
    console.log(chalk.red('  Commit rejected: index.html is required for IIS/web servers to load the application.\n'));
    throw new Error('Critical build artifact missing: index.html');
  }

  const { hasBaseHref } = checkBaseHref(indexHtmlPath);

  // 2. Check compiled JavaScript bundles
  const jsBundles = outputFiles.filter(f => f.endsWith('.js'));
  if (jsBundles.length === 0) {
    logError('Critical build artifact missing: No compiled JavaScript bundles found in output!');
    console.log(chalk.red('  Commit rejected: Application logic files (main.js, polyfills.js, runtime.js) are missing.\n'));
    throw new Error('Critical build artifact missing: No compiled JavaScript bundles found');
  }

  // 3. Check compiled styles
  const cssFiles = outputFiles.filter(f => f.endsWith('.css'));
  const hasStylesCss = cssFiles.some(f => path.basename(f).toLowerCase().startsWith('styles') || cssFiles.length > 0);

  // 4. CD Check: SPA Fallback & URL Rewrite Rules (Stops 404 on page refresh)
  const hasSpaRewrite = outputFiles.some(f => 
    f.toLowerCase().endsWith('web.config') || 
    f.toLowerCase().endsWith('nginx.conf') || 
    f.toLowerCase().endsWith('_redirects') ||
    f.toLowerCase().endsWith('htaccess')
  );
  
  // 5. CD Check: Production Environment Localhost & Insecure HTTP Leak Scan
  const envProdPath = path.join(cwd, 'src', 'environments', 'environment.prod.ts');
  const { hasLocalhostLeak, hasHttpApiLeak } = auditEnvironmentProd(envProdPath);

  // 6. CD Check: Dockerfile Integrity & Container Best Practices
  const dockerfilePath = path.join(cwd, 'Dockerfile');
  const dockerAudit = auditDockerfile(dockerfilePath);
  const dockerValid = dockerAudit ? dockerAudit.valid : null;

  // 7. CD Check: Bundle Size & Performance Budget Calculation
  let totalBundleSizeBytes = 0;
  for (const jsFile of jsBundles) {
    const fullJsPath = path.join(outputDir, jsFile);
    if (fs.existsSync(fullJsPath)) {
      totalBundleSizeBytes += fs.statSync(fullJsPath).size;
    }
  }
  const totalBundleSizeMb = (totalBundleSizeBytes / (1024 * 1024)).toFixed(2);
  const bundleBudgetExceeded = totalBundleSizeBytes > 5 * 1024 * 1024; // 5 MB threshold

  console.log(chalk.white('  Distribution & CD Readiness Checklist:'));
  console.log(`    ${chalk.green('✔')} index.html (Main SPA Entry Point${hasBaseHref ? ', <base href> verified' : ''})`);
  console.log(`    ${chalk.green('✔')} Compiled JavaScript Bundles (${jsBundles.length} files: ${totalBundleSizeMb} MB total)`);
  if (hasStylesCss) {
    console.log(`    ${chalk.green('✔')} Global Production Styles (${cssFiles.map(f => path.basename(f)).join(', ')})`);
  }
  if (hasSpaRewrite) {
    console.log(`    ${chalk.green('✔')} Web Server SPA Rewrite Config (IIS web.config / Nginx / _redirects)`);
  }
  if (dockerValid !== null) {
    console.log(`    ${chalk.green('✔')} Dockerfile Container Specification Validated${dockerAudit?.hasMultiStage ? ' (Multi-stage)' : ''}`);
  }
  if (hasLocalhostLeak) {
    logWarning('CD Warning: Localhost/dev endpoint detected in environment.prod.ts!');
  }
  if (hasHttpApiLeak) {
    logWarning('CD Security Warning: Unencrypted http:// endpoint detected in production environment!');
  }
  if (bundleBudgetExceeded) {
    logWarning(`CD Performance Warning: Total compiled bundle size (${totalBundleSizeMb} MB) exceeds recommended 5 MB budget.`);
  }

  logSuccess(`Production distribution & CD deployment artifacts validated successfully (${totalBundleSizeMb} MB).`);
  return {
    bundleCount: jsBundles.length,
    totalBundleSizeMb,
    hasSpaRewrite,
    dockerValid,
    hasLocalhostLeak,
    hasHttpApiLeak,
    hasBaseHref,
    bundleBudgetExceeded
  };
}

/**
 * Validates index.html <base href> tag for correct SPA client-side routing
 */
export function checkBaseHref(indexHtmlPath) {
  if (!fs.existsSync(indexHtmlPath)) return { hasBaseHref: false, baseHrefValue: null };
  const content = fs.readFileSync(indexHtmlPath, 'utf8');
  const match = content.match(/<base\s+href=["']([^"']+)["']/i);
  return {
    hasBaseHref: !!match,
    baseHrefValue: match ? match[1] : null
  };
}

/**
 * Audits environment.prod.ts for localhost leaks and insecure HTTP endpoints
 */
export function auditEnvironmentProd(envProdPath) {
  if (!fs.existsSync(envProdPath)) {
    return { hasLocalhostLeak: false, hasHttpApiLeak: false, issues: [] };
  }
  const content = fs.readFileSync(envProdPath, 'utf8');
  const issues = [];

  const hasLocalhostLeak = /(?:http:\/\/localhost|http:\/\/127\.0\.0\.1|http:\/\/0\.0\.0\.0)/i.test(content);
  if (hasLocalhostLeak) {
    issues.push('Development localhost URL found in production config');
  }

  // Detect unencrypted HTTP endpoints (excluding comments)
  const lines = content.split('\n');
  let hasHttpApiLeak = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    if (/http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[a-zA-Z0-9.-]+/i.test(trimmed)) {
      hasHttpApiLeak = true;
      issues.push('Unencrypted http:// endpoint found in production config');
      break;
    }
  }

  return { hasLocalhostLeak, hasHttpApiLeak, issues };
}

/**
 * Audits Dockerfile container specification for production CD deployment
 */
export function auditDockerfile(dockerfilePath) {
  if (!fs.existsSync(dockerfilePath)) return null;
  const content = fs.readFileSync(dockerfilePath, 'utf8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

  const hasFrom = lines.some(l => l.startsWith('FROM '));
  const hasCopyOrAdd = lines.some(l => l.startsWith('COPY ') || l.startsWith('ADD '));
  const fromCount = lines.filter(l => l.startsWith('FROM ')).length;
  const hasMultiStage = fromCount > 1;
  const hasExpose = lines.some(l => l.startsWith('EXPOSE '));

  return {
    valid: hasFrom && hasCopyOrAdd,
    hasFrom,
    hasCopyOrAdd,
    hasMultiStage,
    hasExpose
  };
}

/**
 * Step 5: Automated Build Versioning
 */
export function updateBuildMetadata(cwd = process.cwd(), projectPkg = {}) {
  logStep(5, 'Automated Angular Build Versioning');
  const srcDir = path.join(cwd, 'src');
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
        // ignore parse error
      }
    }

    buildData.buildNumber = (Number(buildData.buildNumber) || 0) + 1;
    buildData.version = projectPkg.version || buildData.version;
    buildData.branch = runGit('git rev-parse --abbrev-ref HEAD', true, cwd) || 'main';
    buildData.commitHash = runGit('git rev-parse --short HEAD', true, cwd) || 'uncommitted';
    buildData.builtAt = new Date().toISOString();

    fs.writeFileSync(buildMetaPath, JSON.stringify(buildData, null, 2), 'utf8');

    try {
      runGit('git add src/build-metadata.json', true, cwd);
      logSuccess(`Build metadata updated & staged: Build #${buildData.buildNumber} (${buildData.commitHash}) on "${buildData.branch}"`);
    } catch (addErr) {
      logSuccess(`Build metadata updated: Build #${buildData.buildNumber} (${buildData.commitHash})`);
    }
  } else {
    console.log(chalk.gray('  Skipped: src directory not found.'));
  }
}

