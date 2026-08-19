import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec as pkgExec } from '@yao-pkg/pkg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildDir = path.join(__dirname, 'build');
const distDir = path.join(__dirname, 'dist');

async function build() {
  console.log('\n======================================================');
  console.log('  Frontend Gatekeeper: Bundling & Executable Compiler  ');
  console.log('======================================================\n');

  // 1. Ensure build and dist directories exist
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 2. Bundle with esbuild
  console.log('>>> [1/3] Bundling ES module scripts with esbuild...');

  try {
    await esbuild.build({
      entryPoints: [path.join(__dirname, 'src', 'engine.js')],
      outfile: path.join(buildDir, 'engine.cjs'),
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node18',
      minify: false
    });
    console.log('  ✔ Bundled: build/engine.cjs');

    await esbuild.build({
      entryPoints: [path.join(__dirname, 'src', 'installer.js')],
      outfile: path.join(buildDir, 'installer.cjs'),
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node18',
      minify: false
    });
    console.log('  ✔ Bundled: build/installer.cjs');
  } catch (err) {
    console.error('✖ Error during esbuild bundling:', err);
    process.exit(1);
  }

  // If only bundling is requested
  if (process.argv.includes('--bundle-only')) {
    console.log('\n✔ Bundling completed successfully (--bundle-only).');
    process.exit(0);
  }

  // 3. Compile standalone Windows binaries with @yao-pkg/pkg
  console.log('\n>>> [2/3] Compiling standalone Windows binaries (.exe) with pkg...');
  
  const targetPlatform = 'node22.23.2-win-x64';
  const engineCjsPath = path.join(buildDir, 'engine.cjs');
  const engineExePath = path.join(distDir, 'engine.exe');
  
  const installerCjsPath = path.join(buildDir, 'installer.cjs');
  const installerExePath = path.join(distDir, 'FrontendGatekeeperSetup.exe');

  try {
    console.log(`  • Compiling engine: ${engineExePath} [Target: ${targetPlatform}]...`);
    await pkgExec([
      engineCjsPath,
      '--target', targetPlatform,
      '--output', engineExePath,
      '--no-bytecode',
      '--public'
    ]);
    console.log('  ✔ engine.exe compiled successfully.');

    console.log(`\n  • Compiling installer: ${installerExePath} [Target: ${targetPlatform}]...`);
    await pkgExec([
      installerCjsPath,
      '--target', targetPlatform,
      '--output', installerExePath,
      '--no-bytecode',
      '--public'
    ]);
    console.log('  ✔ FrontendGatekeeperSetup.exe compiled successfully.');
  } catch (err) {
    console.error('✖ Error during pkg binary compilation:', err.message || err);
    process.exit(1);
  }

  // 4. Verify output binaries
  console.log('\n>>> [3/3] Verifying generated distribution binaries...');
  if (fs.existsSync(engineExePath) && fs.existsSync(installerExePath)) {
    const engineSizeMb = (fs.statSync(engineExePath).size / (1024 * 1024)).toFixed(2);
    const installerSizeMb = (fs.statSync(installerExePath).size / (1024 * 1024)).toFixed(2);
    
    console.log(`\n✔ Generated Binaries in dist/:`);
    console.log(`  ├── dist/engine.exe (${engineSizeMb} MB)`);
    console.log(`  └── dist/FrontendGatekeeperSetup.exe (${installerSizeMb} MB)`);
    console.log('\n✨ Build process completed successfully!\n');
  } else {
    console.error('✖ One or more expected binary files are missing in dist/.');
    process.exit(1);
  }
}

build().catch(err => {
  console.error('Unhandled build error:', err);
  process.exit(1);
});
