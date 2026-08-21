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
 * Step 3: Critical Architecture & Entry Point Validation
 */
export function checkCriticalArchitecture(cwd = process.cwd()) {
  logStep(3, 'Critical Angular Architecture & Source Validation');
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
  logSuccess('All critical Angular architecture files, tsconfig, and entry points verified.');
}

/**
 * Step 5: Compiled Production Artifacts Validation (IIS / Web Entry Points)
 */
export function validateCompiledArtifacts(cwd = process.cwd()) {
  logStep(5, 'Production Build Artifacts Validation');
  const distPath = path.join(cwd, 'dist');
  const outputDir = findBuildOutputDir(distPath);

  if (!outputDir || !fs.existsSync(outputDir)) {
    logError('Build output directory (dist/) was not generated or is missing!');
    console.log(chalk.red('  Commit rejected: Ensure ng build produces valid output.\n'));
    throw new Error('Build output directory (dist/) was not generated or is missing!');
  }

  console.log(chalk.gray(`  Inspecting build distribution output at: ${outputDir}`));
  const outputFiles = getAllFiles(outputDir).map(f => path.relative(outputDir, f).replace(/\\/g, '/'));

  // 1. Check index.html
  const hasIndexHtml = outputFiles.some(f => path.basename(f).toLowerCase() === 'index.html');
  if (!hasIndexHtml) {
    logError('Critical build artifact missing: index.html was not generated in distribution output!');
    console.log(chalk.red('  Commit rejected: index.html is required for IIS/web servers to load the application.\n'));
    throw new Error('Critical build artifact missing: index.html');
  }

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

  // 4. Check assets directory
  const srcAssetsPath = path.join(cwd, 'src', 'assets');
  const publicPath = path.join(cwd, 'public');
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
}

/**
 * Step 6: Automated Build Versioning
 */
export function updateBuildMetadata(cwd = process.cwd(), projectPkg = {}) {
  logStep(6, 'Automated Angular Build Versioning');
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
