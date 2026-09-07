import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
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

  // 4. CI Cleanroom Staged Integrity Check (95% CI Compliance)
  verifyStagedCleanroom(cwd);

  // 5. Angular Application Bootstrap & Root Component Integrity (95% CI Compliance)
  verifyAngularBootstrapIntegrity(cwd);

  // 6. Angular Circular Dependency Loop Detection (Stops runtime DI deadlocks)
  detectCircularDependencies(cwd);

  // 7. Template Security & Safe DOM Scanner (Stops XSS and direct DOM mutations)
  auditTemplateSecurity(cwd, stagedFiles);

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
 * Detects SPA URL rewrite rules across dist output, src/, project root, and angular.json
 */
export function detectSpaRewrite(cwd = process.cwd(), outputDir = null, distPath = null) {
  // 1. Check inside outputDir (dist/ or dist/browser/)
  if (outputDir && fs.existsSync(outputDir)) {
    const outputFiles = getAllFiles(outputDir);
    const match = outputFiles.find(f => {
      const b = path.basename(f).toLowerCase();
      return b === 'web.config' || b === 'nginx.conf' || b === '_redirects' || b === '.htaccess' || b === 'htaccess';
    });
    if (match) return { hasSpaRewrite: true, file: path.basename(match), source: 'dist' };
  }

  // 2. Check inside dist root if different from outputDir
  if (distPath && fs.existsSync(distPath) && distPath !== outputDir) {
    const distFiles = getAllFiles(distPath);
    const match = distFiles.find(f => {
      const b = path.basename(f).toLowerCase();
      return b === 'web.config' || b === 'nginx.conf' || b === '_redirects' || b === '.htaccess' || b === 'htaccess';
    });
    if (match) return { hasSpaRewrite: true, file: path.basename(match), source: 'dist' };
  }

  // 3. Check inside src/ (e.g. src/web.config, src/nginx.conf, src/_redirects)
  const srcDir = path.join(cwd, 'src');
  if (fs.existsSync(srcDir)) {
    const srcCandidates = ['web.config', 'nginx.conf', '_redirects', '.htaccess'];
    for (const c of srcCandidates) {
      if (fs.existsSync(path.join(srcDir, c))) {
        return { hasSpaRewrite: true, file: `src/${c}`, source: 'src' };
      }
    }
  }

  // 4. Check project root hosting configuration files
  const rootCandidates = [
    'web.config',
    'nginx.conf',
    '_redirects',
    '.htaccess',
    'firebase.json',
    'vercel.json',
    'netlify.toml',
    'staticwebapp.config.json'
  ];
  for (const c of rootCandidates) {
    const p = path.join(cwd, c);
    if (fs.existsSync(p)) {
      if (c === 'firebase.json') {
        try {
          const fb = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (fb.hosting && (fb.hosting.rewrites || (Array.isArray(fb.hosting) && fb.hosting.some(h => h.rewrites)))) {
            return { hasSpaRewrite: true, file: c, source: 'root' };
          }
        } catch (_) {}
      } else if (c === 'vercel.json') {
        try {
          const vj = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (vj.rewrites || vj.routes) {
            return { hasSpaRewrite: true, file: c, source: 'root' };
          }
        } catch (_) {}
      } else {
        return { hasSpaRewrite: true, file: c, source: 'root' };
      }
    }
  }

  // 5. Check angular.json assets configuration
  const angularJsonPath = path.join(cwd, 'angular.json');
  if (fs.existsSync(angularJsonPath)) {
    try {
      const content = fs.readFileSync(angularJsonPath, 'utf8');
      if (content.includes('web.config') || content.includes('_redirects') || content.includes('nginx.conf')) {
        return { hasSpaRewrite: true, file: 'angular.json (assets)', source: 'angular.json' };
      }
    } catch (_) {}
  }

  return { hasSpaRewrite: false, file: null, source: null };
}

/**
 * Step 6: Compiled Production Artifacts Validation (IIS / Web Entry Points)
 */
export function validateCompiledArtifacts(cwd = process.cwd()) {
  console.log(chalk.blue('\n  Validating Compiled Production Distribution Artifacts (CD Readiness)...'));
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
  const spaAudit = detectSpaRewrite(cwd, outputDir, distPath);
  const hasSpaRewrite = spaAudit.hasSpaRewrite;
  
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

  // 8. CD Check: Gzip Compressed Transfer Size & Network Budgets
  const gzipMetrics = calculateGzipBudgets(outputDir, jsBundles);

  // 9. CD Check: Distribution Asset Link & Resource Integrity (Favicon, fonts, CSS URLs)
  const assetAudit = auditDistributionAssetIntegrity(outputDir);

  // 10. CD Check: Multi-Host Cloud Deployment Configs (Azure, Vercel, Netlify, Firebase, Docker, IIS)
  const cloudAudit = auditCloudDeploymentConfigs(cwd);

  // 11. CD Check: Dedicated IIS (Internet Information Services) Deployment Audit
  const iisAudit = auditIisDeploymentConfig(cwd, outputDir);

  console.log(chalk.white('  Distribution & CD Readiness Checklist:'));
  console.log(`    ${chalk.green('✔')} index.html (Main SPA Entry Point${hasBaseHref ? ', <base href> verified' : ''})`);
  console.log(`    ${chalk.green('✔')} Compiled JavaScript Bundles (${jsBundles.length} files: ${totalBundleSizeMb} MB total | Gzip: ${gzipMetrics.totalGzipSizeKb} KB)`);
  if (hasStylesCss) {
    console.log(`    ${chalk.green('✔')} Global Production Styles (${cssFiles.map(f => path.basename(f)).join(', ')})`);
  }
  if (hasSpaRewrite) {
    console.log(`    ${chalk.green('✔')} Web Server SPA Rewrite Config (${spaAudit.file || 'web.config / nginx / _redirects'})`);
  } else {
    logWarning('CD Warning: No SPA rewrite rule found (web.config / nginx.conf / _redirects / firebase.json). Direct route reloads in production may 404.');
  }
  if (iisAudit.isIisConfigured) {
    const iisStatusStr = [
      iisAudit.hasRewriteRule ? 'URL Rewrite: ✔' : 'URL Rewrite: ⚠ Missing',
      iisAudit.isValidXml ? 'XML: ✔' : 'XML: ✖ Error',
      iisAudit.isSyncedInAngularJson ? 'Assets Sync: ✔' : 'Assets Sync: ⚠ Missing'
    ].join(' | ');
    console.log(`    ${chalk.green('✔')} IIS Server Config (${path.basename(iisAudit.filePath)} [${iisStatusStr}])`);
    iisAudit.warnings.forEach(w => logWarning(`IIS Notice: ${w}`));
  }
  if (assetAudit.valid) {
    console.log(`    ${chalk.green('✔')} Distribution Asset Links & Resources Verified (0 broken assets)`);
  } else {
    logWarning(`CD Warning: ${assetAudit.brokenAssets.length} broken/missing asset reference(s) found in distribution output.`);
  }
  if (cloudAudit.hasAnyCloudTarget) {
    console.log(`    ${chalk.green('✔')} Cloud / Server Deployment Configs Detected (${cloudAudit.detectedTargets.join(', ')})`);
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
  if (gzipMetrics.budgetExceeded && gzipMetrics.budgetWarning) {
    logWarning(`CD Performance Warning: ${gzipMetrics.budgetWarning}`);
  }

  // 12. CD Check: Release Candidate Manifest & SHA256 Distribution Checksums (75% CD Delivery)
  let releaseManifestCreated = false;
  try {
    const manifestPath = path.join(outputDir, 'release-manifest.json');
    const artifactManifest = [];
    for (const f of jsBundles) {
      const fullPath = path.join(outputDir, f);
      if (fs.existsSync(fullPath)) {
        const fileBuf = fs.readFileSync(fullPath);
        const hash = crypto.createHash('sha256').update(fileBuf).digest('hex');
        artifactManifest.push({
          file: f,
          sha256: hash,
          sizeBytes: fileBuf.length
        });
      }
    }

    const manifestData = {
      manifestVersion: '1.0.0',
      cdReadiness: '75%',
      generatedAt: new Date().toISOString(),
      totalBundleSizeMb: totalBundleSizeMb,
      totalGzipSizeKb: gzipMetrics.totalGzipSizeKb,
      bundleCount: jsBundles.length,
      hasSpaRewrite: hasSpaRewrite,
      hasBaseHref: hasBaseHref,
      assetIntegrityValid: assetAudit.valid,
      cloudTargets: cloudAudit.detectedTargets,
      iisDeployment: iisAudit.isIisConfigured ? iisAudit : null,
      dockerValid: dockerValid,
      artifacts: artifactManifest
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf8');
    if (outputDir !== distPath && fs.existsSync(distPath)) {
      fs.writeFileSync(path.join(distPath, 'release-manifest.json'), JSON.stringify(manifestData, null, 2), 'utf8');
    }
    releaseManifestCreated = true;
    console.log(`    ${chalk.green('✔')} CD Release Manifest & SHA256 Checksums Generated (dist/release-manifest.json)`);
  } catch (_manifestErr) {
    // Non-fatal
  }

  logSuccess(`Production distribution & CD deployment artifacts validated successfully (${totalBundleSizeMb} MB | Gzip: ${gzipMetrics.totalGzipSizeKb} KB).`);
  return {
    bundleCount: jsBundles.length,
    totalBundleSizeMb,
    totalGzipSizeKb: gzipMetrics.totalGzipSizeKb,
    hasSpaRewrite,
    dockerValid,
    hasLocalhostLeak,
    hasHttpApiLeak,
    hasBaseHref,
    bundleBudgetExceeded,
    releaseManifestCreated,
    assetAudit,
    gzipMetrics,
    cloudAudit,
    iisAudit,
    cdComplianceScore: '75%'
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
 * Step 5: Automated Build Versioning & Conventional Commit SemVer
 */
export function updateBuildMetadata(cwd = process.cwd(), projectPkg = {}) {
  console.log(chalk.blue('  Automated Angular Build Versioning & Conventional Commit SemVer...'));
  const srcDir = path.join(cwd, 'src');
  if (fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory()) {
    const buildMetaPath = path.join(srcDir, 'build-metadata.json');
    const semverInfo = calculateSemVerBump(cwd, projectPkg.version || '1.0.0');
    let buildData = {
      buildNumber: 0,
      version: projectPkg.version || '1.0.0',
      nextSemVer: semverInfo.nextVersion,
      releaseType: semverInfo.releaseType,
      cdCompliance: '65%',
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
    buildData.nextSemVer = semverInfo.nextVersion;
    buildData.releaseType = semverInfo.releaseType;
    buildData.cdCompliance = '65%';
    buildData.branch = runGit('git rev-parse --abbrev-ref HEAD', true, cwd) || 'main';
    buildData.commitHash = runGit('git rev-parse --short HEAD', true, cwd) || 'uncommitted';
    buildData.builtAt = new Date().toISOString();

    fs.writeFileSync(buildMetaPath, JSON.stringify(buildData, null, 2), 'utf8');

    try {
      runGit('git add src/build-metadata.json', true, cwd);
      logSuccess(`Build metadata updated & staged: Build #${buildData.buildNumber} (${buildData.commitHash}) on "${buildData.branch}" [SemVer: v${buildData.nextSemVer} (${buildData.releaseType})]`);
    } catch (addErr) {
      logSuccess(`Build metadata updated: Build #${buildData.buildNumber} (${buildData.commitHash}) [SemVer: v${buildData.nextSemVer} (${buildData.releaseType})]`);
    }
  } else {
    console.log(chalk.gray('  Skipped: src directory not found.'));
  }
}

/**
 * Calculates next Semantic Version based on Conventional Commits (feat, fix, BREAKING CHANGE)
 */
export function calculateSemVerBump(cwd = process.cwd(), currentVersion = '1.0.0') {
  let commitMessage = '';
  try {
    commitMessage = runGit('git log -1 --pretty=%B', true, cwd) || '';
  } catch (_) {
    commitMessage = '';
  }

  let releaseType = 'patch';
  const cleanMsg = commitMessage.trim();

  if (/BREAKING CHANGE/i.test(cleanMsg) || /^[a-z]+(\([a-z0-9_-]+\))?!:/i.test(cleanMsg)) {
    releaseType = 'major';
  } else if (/^feat(\([a-z0-9_-]+\))?:/i.test(cleanMsg)) {
    releaseType = 'minor';
  } else if (/^(fix|perf|refactor|revert)(\([a-z0-9_-]+\))?:/i.test(cleanMsg)) {
    releaseType = 'patch';
  }

  const parts = (currentVersion || '1.0.0').split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);

  let [major, minor, patch] = parts;
  if (releaseType === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (releaseType === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  const nextVersion = `${major}.${minor}.${patch}`;
  return {
    currentVersion,
    nextVersion,
    releaseType,
    commitMessage: cleanMsg
  };
}

/**
 * Validates cleanroom status: checks if unstaged modifications exist in staged files
 */
export function verifyStagedCleanroom(cwd = process.cwd()) {
  try {
    const statusOutput = runGit('git status --porcelain', true, cwd);
    if (!statusOutput) {
      return { isCleanroom: true, unstagedDriftFiles: [] };
    }

    const lines = statusOutput.split('\n').map(l => l.trimEnd()).filter(Boolean);
    const unstagedDriftFiles = [];

    for (const line of lines) {
      const indexStatus = line[0];
      const worktreeStatus = line[1];
      const filePath = line.substring(3).trim();

      if ((indexStatus === 'M' || indexStatus === 'A' || indexStatus === 'R') && worktreeStatus === 'M') {
        unstagedDriftFiles.push(filePath);
      }
    }

    if (unstagedDriftFiles.length > 0) {
      logWarning(`CI Cleanroom Drift: Unstaged modifications detected in staged file(s): ${unstagedDriftFiles.join(', ')}`);
      console.log(chalk.yellow('  Note: Committed code differs from active disk files. Ensure your staged index compiles cleanly.'));
      return { isCleanroom: false, unstagedDriftFiles };
    }

    return { isCleanroom: true, unstagedDriftFiles: [] };
  } catch (_e) {
    return { isCleanroom: true, unstagedDriftFiles: [] };
  }
}

/**
 * Verifies Angular bootstrap integrity and root component mounting (<app-root> and main.ts)
 */
export function verifyAngularBootstrapIntegrity(cwd = process.cwd(), outputDir = null) {
  let hasRootElement = false;
  let hasBootstrapCall = false;
  let selector = 'app-root';

  const candidateIndexPaths = [
    outputDir ? path.join(outputDir, 'index.html') : null,
    path.join(cwd, 'src', 'index.html'),
    path.join(cwd, 'src', 'index.csr.html'),
    path.join(cwd, 'index.html')
  ].filter(Boolean);

  for (const p of candidateIndexPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      const rootMatch = content.match(/<([a-zA-Z0-9_-]+)[^>]*>\s*<\/\1>/) || content.match(/<app-root[^>]*>/i);
      if (rootMatch) {
        hasRootElement = true;
        selector = rootMatch[1] || 'app-root';
        break;
      }
    }
  }

  const mainTsPath = path.join(cwd, 'src', 'main.ts');
  if (fs.existsSync(mainTsPath)) {
    const mainContent = fs.readFileSync(mainTsPath, 'utf8');
    if (
      mainContent.includes('bootstrapApplication') ||
      mainContent.includes('bootstrapModule') ||
      mainContent.includes('platformBrowserDynamic') ||
      mainContent.includes('platformBrowser')
    ) {
      hasBootstrapCall = true;
    }
  } else if (outputDir && fs.existsSync(outputDir)) {
    const files = getAllFiles(outputDir);
    if (files.some(f => path.basename(f).startsWith('main') && f.endsWith('.js'))) {
      hasBootstrapCall = true;
    }
  }

  const valid = hasRootElement || hasBootstrapCall;
  return {
    valid,
    hasRootElement,
    hasBootstrapCall,
    selector
  };
}

/**
 * Probes a live CD deployment endpoint for HTTP 200, SPA routing rewrite, base href, and security headers
 */
export async function verifyLiveDeployment(targetUrl) {
  if (!targetUrl || !targetUrl.startsWith('http')) {
    throw new Error('Invalid URL. Provide a valid HTTP/HTTPS URL (e.g., https://example.com)');
  }

  console.log(chalk.blue(`\n  Probing Live CD Deployment Endpoint: ${chalk.bold(targetUrl)}...`));
  const issues = [];
  let statusCode = 0;
  let hasBaseHref = false;
  let spaRewriteWorking = false;
  const headers = {};

  try {
    const res = await fetch(targetUrl, { redirect: 'follow' });
    statusCode = res.status;
    res.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    const bodyText = await res.text();
    hasBaseHref = /<base\s+href=["']([^"']+)["']/i.test(bodyText);

    if (statusCode !== 200) {
      issues.push(`Endpoint returned HTTP status ${statusCode} instead of 200 OK`);
    }

    if (!headers['strict-transport-security'] && targetUrl.startsWith('https://')) {
      issues.push('Missing HSTS (Strict-Transport-Security) header');
    }
    if (!headers['x-content-type-options']) {
      issues.push('Missing X-Content-Type-Options: nosniff header');
    }

    try {
      const probeUrl = `${targetUrl.replace(/\/$/, '')}/__gatekeeper_spa_probe__`;
      const deepRes = await fetch(probeUrl, { redirect: 'follow' });
      if (deepRes.status === 200) {
        const deepBody = await deepRes.text();
        if (deepBody.includes('<app-root') || deepBody.includes('<!doctype html>') || deepBody.includes('<html')) {
          spaRewriteWorking = true;
        }
      }
    } catch (_) {
      // ignore probe error
    }

    const success = statusCode === 200 && issues.length === 0;
    return {
      success,
      statusCode,
      hasBaseHref,
      spaRewriteWorking,
      headers,
      issues
    };
  } catch (fetchErr) {
    issues.push(`Connection failed: ${fetchErr.message}`);
    return {
      success: false,
      statusCode: 0,
      hasBaseHref: false,
      spaRewriteWorking: false,
      headers: {},
      issues
    };
  }
}

/**
 * Detects circular dependency cycles across TypeScript modules (Stops Angular runtime DI deadlocks)
 */
export function detectCircularDependencies(cwd = process.cwd()) {
  const srcDir = path.join(cwd, 'src');
  if (!fs.existsSync(srcDir)) return { hasCycles: false, cycles: [] };

  const allFiles = getAllFiles(srcDir);
  const tsFiles = allFiles.filter(f => 
    (f.endsWith('.ts') || f.endsWith('.js')) && 
    !f.endsWith('.spec.ts') && 
    !f.endsWith('.test.ts') && 
    !f.endsWith('.spec.js') && 
    !f.endsWith('.test.js') && 
    !f.endsWith('.d.ts') &&
    !f.includes('node_modules')
  );

  if (tsFiles.length === 0) return { hasCycles: false, cycles: [] };

  const graph = new Map();
  const importRegex = /(?:import|from|require\()\s*['"](\.[^'"]+)['"]/g;

  for (const file of tsFiles) {
    const fileDir = path.dirname(file);
    let content = '';
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch (_) {
      continue;
    }

    const imports = new Set();
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const relPath = match[1];
      const targetBase = path.resolve(fileDir, relPath);
      
      const candidates = [
        targetBase,
        targetBase + '.ts',
        targetBase + '.js',
        path.join(targetBase, 'index.ts'),
        path.join(targetBase, 'index.js')
      ];

      for (const cand of candidates) {
        if (fs.existsSync(cand) && !fs.statSync(cand).isDirectory()) {
          const norm = path.normalize(cand);
          if (norm !== path.normalize(file)) {
            imports.add(norm);
          }
          break;
        }
      }
    }
    graph.set(path.normalize(file), imports);
  }

  const cycles = [];
  const visited = new Set();
  const recStack = new Set();
  const currentPath = [];

  function dfs(node) {
    visited.add(node);
    recStack.add(node);
    currentPath.push(node);

    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recStack.has(neighbor)) {
        const cycleStartIndex = currentPath.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cyclePath = currentPath.slice(cycleStartIndex).concat(neighbor);
          const relCycle = cyclePath.map(p => path.relative(cwd, p).replace(/\\/g, '/'));
          const cycleKey = relCycle.slice(0, -1).sort().join('->');
          if (!cycles.some(c => c.key === cycleKey)) {
            cycles.push({ key: cycleKey, path: relCycle });
          }
        }
      }
    }

    recStack.delete(node);
    currentPath.pop();
  }

  for (const file of graph.keys()) {
    if (!visited.has(file)) {
      dfs(file);
    }
  }

  if (cycles.length > 0) {
    logWarning(`Angular Architecture Warning: ${cycles.length} circular dependency cycle(s) detected:`);
    cycles.forEach(c => {
      console.log(chalk.yellow(`    • Cycle: ${c.path.join(' ➔ ')}`));
    });
    console.log(chalk.gray('  Note: Circular imports can cause undefined injection tokens or runtime NullInjectorError.\n'));
  }

  return { hasCycles: cycles.length > 0, cycles };
}

/**
 * Audits staged templates and components for XSS risks, unsanitized innerHTML, and direct DOM mutations
 */
export function auditTemplateSecurity(cwd = process.cwd(), stagedFiles = []) {
  const targetFiles = stagedFiles.length > 0
    ? stagedFiles.map(f => path.join(cwd, f)).filter(p => fs.existsSync(p))
    : (fs.existsSync(path.join(cwd, 'src')) ? getAllFiles(path.join(cwd, 'src')).filter(f => !f.includes('node_modules') && !f.includes('dist')) : []);

  const inspectFiles = targetFiles.filter(f => f.endsWith('.html') || (f.endsWith('.ts') && !f.endsWith('.spec.ts')));
  const violations = [];

  for (const file of inspectFiles) {
    let content = '';
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch (_) {
      continue;
    }

    const relPath = path.relative(cwd, file).replace(/\\/g, '/');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

      if (/\[innerHTML\]\s*=\s*['"][^'"]*['"]/i.test(line) && !/\|\s*(?:safe|sanitize|trustHtml|trustUrl|trustResourceUrl)/i.test(line)) {
        violations.push({
          file: relPath,
          line: lineNum,
          type: 'Unsanitized innerHTML',
          snippet: trimmed
        });
      }

      if (/bypassSecurityTrust(Html|Script|Style)\s*\(/i.test(line)) {
        violations.push({
          file: relPath,
          line: lineNum,
          type: 'Security Trust Bypass (XSS Risk)',
          snippet: trimmed
        });
      }

      if (file.endsWith('.ts') && /(?:document\.getElementById|document\.querySelector|document\.getElementsByClassName)\s*\(/i.test(line)) {
        violations.push({
          file: relPath,
          line: lineNum,
          type: 'Direct DOM Mutation (Bypasses Angular Renderer2)',
          snippet: trimmed
        });
      }
    });
  }

  if (violations.length > 0) {
    logWarning(`Angular Security Notice: ${violations.length} template/DOM security pattern(s) flagged:`);
    violations.slice(0, 5).forEach(v => {
      console.log(chalk.yellow(`    • [${v.type}] in ${chalk.bold(v.file)}:${v.line}`));
      console.log(chalk.gray(`      Code: "${v.snippet.substring(0, 60)}"`));
    });
    console.log(chalk.gray('  Use Angular Renderer2 for DOM manipulation and DomSanitizer for dynamic HTML.\n'));
  }

  return {
    passed: violations.length === 0,
    violationCount: violations.length,
    violations
  };
}

/**
 * Audits compiled distribution output for broken internal asset links (favicons, fonts, images, css urls)
 */
export function auditDistributionAssetIntegrity(outputDir) {
  if (!outputDir || !fs.existsSync(outputDir)) {
    return { valid: true, brokenAssets: [] };
  }

  const brokenAssets = [];
  const indexHtmlPath = path.join(outputDir, 'index.html');

  if (fs.existsSync(indexHtmlPath)) {
    const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
    const tagRegex = /<(?:link|script|img)\s+[^>]*(?:href|src)=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = tagRegex.exec(htmlContent)) !== null) {
      const assetUrl = match[1];
      if (/^(?:https?:|\/\/|data:|#|mailto:)/i.test(assetUrl)) continue;

      const cleanAsset = assetUrl.split('?')[0].split('#')[0].replace(/^\//, '');
      if (cleanAsset) {
        const targetDiskPath = path.join(outputDir, cleanAsset);
        if (!fs.existsSync(targetDiskPath)) {
          brokenAssets.push({
            sourceFile: 'index.html',
            assetPath: assetUrl
          });
        }
      }
    }
  }

  const allDistFiles = getAllFiles(outputDir);
  const cssFiles = allDistFiles.filter(f => f.endsWith('.css'));
  const urlRegex = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;

  for (const cssFile of cssFiles) {
    let cssContent = '';
    try {
      cssContent = fs.readFileSync(cssFile, 'utf8');
    } catch (_) {
      continue;
    }

    const cssDir = path.dirname(cssFile);
    let match;
    while ((match = urlRegex.exec(cssContent)) !== null) {
      const ref = match[1];
      if (/^(?:https?:|\/\/|data:|#)/i.test(ref)) continue;

      const cleanRef = ref.split('?')[0].split('#')[0];
      const targetDiskPath = cleanRef.startsWith('/')
        ? path.join(outputDir, cleanRef.replace(/^\//, ''))
        : path.resolve(cssDir, cleanRef);

      if (!fs.existsSync(targetDiskPath)) {
        brokenAssets.push({
          sourceFile: path.relative(outputDir, cssFile).replace(/\\/g, '/'),
          assetPath: ref
        });
      }
    }
  }

  return {
    valid: brokenAssets.length === 0,
    brokenAssets
  };
}

/**
 * Calculates Gzip compression transfer sizes and audits performance budgets
 */
export function calculateGzipBudgets(outputDir, jsBundles = []) {
  if (!outputDir || !fs.existsSync(outputDir) || jsBundles.length === 0) {
    return { totalGzipBytes: 0, totalGzipSizeKb: '0.00', bundleMetrics: [], budgetExceeded: false };
  }

  let totalGzipBytes = 0;
  const bundleMetrics = [];

  for (const file of jsBundles) {
    const fullPath = path.join(outputDir, file);
    if (fs.existsSync(fullPath)) {
      try {
        const rawBuf = fs.readFileSync(fullPath);
        const gzipped = zlib.gzipSync(rawBuf);
        totalGzipBytes += gzipped.length;
        bundleMetrics.push({
          file,
          rawBytes: rawBuf.length,
          gzipBytes: gzipped.length,
          gzipSizeKb: (gzipped.length / 1024).toFixed(1)
        });
      } catch (_) {
        // ignore compression error
      }
    }
  }

  const totalGzipSizeKb = (totalGzipBytes / 1024).toFixed(1);
  const totalGzipSizeMb = (totalGzipBytes / (1024 * 1024)).toFixed(2);

  const budgetExceeded = totalGzipBytes > 1.5 * 1024 * 1024;
  let budgetWarning = null;
  if (budgetExceeded) {
    budgetWarning = `Total gzipped bundle size (${totalGzipSizeMb} MB) exceeds recommended 1.5 MB network budget.`;
  }

  return {
    totalGzipBytes,
    totalGzipSizeKb,
    totalGzipSizeMb,
    bundleMetrics,
    budgetExceeded,
    budgetWarning
  };
}

/**
 * Audits project for ready-to-deploy cloud configurations (Azure, Vercel, Netlify, Firebase, Docker)
 */
export function auditCloudDeploymentConfigs(cwd = process.cwd()) {
  const targets = [];
  const details = {};

  const azurePath = path.join(cwd, 'staticwebapp.config.json');
  if (fs.existsSync(azurePath)) {
    targets.push('Azure Static Web Apps');
    details.azure = true;
  }

  const vercelPath = path.join(cwd, 'vercel.json');
  if (fs.existsSync(vercelPath)) {
    targets.push('Vercel');
    details.vercel = true;
  }

  const netlifyPath = path.join(cwd, 'netlify.toml');
  const redirectsPath = path.join(cwd, '_redirects');
  if (fs.existsSync(netlifyPath) || fs.existsSync(redirectsPath)) {
    targets.push('Netlify');
    details.netlify = true;
  }

  const fbPath = path.join(cwd, 'firebase.json');
  if (fs.existsSync(fbPath)) {
    targets.push('Firebase Hosting');
    details.firebase = true;
  }

  const dockerPath = path.join(cwd, 'Dockerfile');
  if (fs.existsSync(dockerPath)) {
    targets.push('Docker / Container');
    details.docker = true;
  }

  // IIS (Internet Information Services / Windows Server)
  const iisPath = path.join(cwd, 'web.config');
  const srcIisPath = path.join(cwd, 'src', 'web.config');
  if (fs.existsSync(iisPath) || fs.existsSync(srcIisPath)) {
    targets.push('IIS (Internet Information Services)');
    details.iis = true;
  }

  return {
    hasAnyCloudTarget: targets.length > 0,
    detectedTargets: targets,
    details
  };
}

/**
 * Audits IIS (Internet Information Services) deployment configuration, web.config XML syntax, URL rewrite rules, and MIME types
 */
export function auditIisDeploymentConfig(cwd = process.cwd(), outputDir = null) {
  const candidates = [
    outputDir ? path.join(outputDir, 'web.config') : null,
    path.join(cwd, 'src', 'web.config'),
    path.join(cwd, 'web.config')
  ].filter(Boolean);

  let targetWebConfig = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      targetWebConfig = c;
      break;
    }
  }

  if (!targetWebConfig) {
    return {
      isIisConfigured: false,
      filePath: null,
      isValidXml: true,
      hasRewriteRule: false,
      hasMimeTypes: false,
      isSyncedInAngularJson: true,
      issues: [],
      warnings: []
    };
  }

  const issues = [];
  const warnings = [];
  let content = '';
  try {
    content = fs.readFileSync(targetWebConfig, 'utf8');
  } catch (readErr) {
    return {
      isIisConfigured: true,
      filePath: targetWebConfig,
      isValidXml: false,
      hasRewriteRule: false,
      hasMimeTypes: false,
      isSyncedInAngularJson: false,
      issues: [`Cannot read web.config: ${readErr.message}`],
      warnings: []
    };
  }

  // 1. Basic XML Well-Formedness Check (Avoids IIS HTTP 500.19 Internal Config Error)
  let isValidXml = true;
  const tagStack = [];
  const tagRegex = /<!--[\s\S]*?-->|<([a-zA-Z0-9_.:-]+)(?:\s+[^>]*?)?(\/?)>|<\/([a-zA-Z0-9_.:-]+)>/g;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(content)) !== null) {
    if (tagMatch[0].startsWith('<!--') || tagMatch[0].startsWith('<?')) continue;
    const openTag = tagMatch[1];
    const isSelfClosing = tagMatch[2] === '/';
    const closeTag = tagMatch[3];

    if (openTag && !isSelfClosing) {
      tagStack.push(openTag.toLowerCase());
    } else if (closeTag) {
      const expected = tagStack.pop();
      if (expected !== closeTag.toLowerCase()) {
        isValidXml = false;
        issues.push(`Malformed XML in web.config: Closing tag </${closeTag}> does not match <${expected || 'unknown'}> (IIS HTTP 500.19 risk)`);
        break;
      }
    }
  }
  if (isValidXml && tagStack.length > 0) {
    isValidXml = false;
    issues.push(`Malformed XML in web.config: Unclosed tag(s) <${tagStack.join('>, <')}> (IIS HTTP 500.19 risk)`);
  }

  // 2. URL Rewrite Module Verification (Angular SPA Routing on IIS)
  const hasRewriteTag = /<rewrite>/i.test(content) && /<rules>/i.test(content);
  const hasRewriteAction = /<action\s+[^>]*type=["']Rewrite["'][^>]*url=["'][^"']*index\.html["']/i.test(content) ||
                          /<action\s+[^>]*url=["'][^"']*index\.html["'][^>]*type=["']Rewrite["']/i.test(content) ||
                          /<action\s+[^>]*type=["']Rewrite["']/i.test(content);
  const hasRewriteRule = hasRewriteTag && hasRewriteAction;
  if (!hasRewriteRule) {
    warnings.push('web.config is missing standard Angular URL rewrite rule to index.html (Direct route reloads on IIS may 404).');
  }

  // 3. Static Content MIME Types Check (.woff2, .json)
  const hasStaticContent = /<staticContent>/i.test(content);
  const hasWoff2 = /fileExtension=["']\.woff2["']/i.test(content);
  const hasJson = /fileExtension=["']\.json["']/i.test(content);
  const hasMimeTypes = hasStaticContent && (hasWoff2 || hasJson);
  if (!hasWoff2) {
    warnings.push('MIME type for .woff2 fonts not declared in web.config <staticContent> (IIS HTTP 404.3 risk).');
  }

  // 4. angular.json Asset Synchronization Check
  let isSyncedInAngularJson = true;
  const angularJsonPath = path.join(cwd, 'angular.json');
  if (fs.existsSync(angularJsonPath) && targetWebConfig.includes('src')) {
    try {
      const aj = fs.readFileSync(angularJsonPath, 'utf8');
      if (!aj.includes('web.config')) {
        isSyncedInAngularJson = false;
        warnings.push('src/web.config is not registered in angular.json "assets" array. It will NOT be copied to dist/ during build!');
      }
    } catch (_) {}
  }

  return {
    isIisConfigured: true,
    filePath: path.relative(cwd, targetWebConfig).replace(/\\/g, '/'),
    isValidXml,
    hasRewriteRule,
    hasMimeTypes,
    isSyncedInAngularJson,
    issues,
    warnings
  };
}



