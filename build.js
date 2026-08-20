import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec as pkgExec } from '@yao-pkg/pkg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildDir = path.join(__dirname, 'build');
const outputFolder = path.join(__dirname, 'Angular Gatekeeper');
const distDir = path.join(__dirname, 'dist');

function generateReadme() {
  return `================================================================================
                    🛡️ ANGULAR GATEKEEPER - RELEASE PACKAGE
================================================================================

Welcome to Angular Gatekeeper!
This package protects your Angular codebases from breaking changes, type errors,
and merge conflicts with automatic background monitoring and desktop alerts.

--------------------------------------------------------------------------------
📦 PACKAGE CONTENTS
--------------------------------------------------------------------------------
1. AngularGatekeeperSetup.exe   - One-time graphical / interactive installer.
2. engine.exe                   - Core background watcher & validation engine.
3. Install.bat                  - Quick 1-click launcher for setup.
4. Uninstall.bat                - Quick 1-click uninstaller.
5. README.txt                   - This user guide and instruction manual.

--------------------------------------------------------------------------------
🚀 STEP 1: HOW TO INSTALL (ONE-TIME SETUP)
--------------------------------------------------------------------------------
1. Double-click "AngularGatekeeperSetup.exe" (or "Install.bat").
2. When prompted for Google AI (Gemini) API Key:
   - (Optional) Enter your Gemini API Key for AI Knowledge Base audits.
   - OR just press [ENTER] to skip and install standard checks.
3. The installer will automatically:
   - Register the global 'a-gatekeeper' CLI in your system PATH.
   - Configure Git hooks and Windows Notification protocol.
4. Restart your terminal (CMD, PowerShell, Git Bash, or VS Code).

--------------------------------------------------------------------------------
🌿 STEP 2: HOW TO USE IN ANY REPOSITORY
--------------------------------------------------------------------------------

A. LIVE BACKGROUND BRANCH CONFLICT WATCHER (Zero Commit Needed):
   Open any repository folder in your terminal and run:
   
   $ a-gatekeeper branch check --enable
   
   • Select your comparison target branch (e.g. 'main').
   • Enter check interval in minutes (e.g. '1' for testing or '15' for regular work).
   • Gatekeeper will monitor live edits in the background and send Windows Desktop
     Toast alerts with sound the moment a remote conflict is detected!
   • Click the notification card to open an instant terminal conflict report.

   Other branch watcher commands:
   $ a-gatekeeper branch check --status   (View live status & conflicting files)
   $ a-gatekeeper branch check --disable  (Stop background watcher)

B. PRE-COMMIT CODE QUALITY VALIDATOR:
   To protect your repository against broken TypeScript, Angular anti-patterns,
   and secret leaks on every 'git commit':

   $ a-gatekeeper enable    (Installs pre-commit gatekeeper in current repo)
   $ a-gatekeeper disable   (Removes pre-commit hook)
   $ a-gatekeeper status    (Checks hook status)

--------------------------------------------------------------------------------
🗑️ STEP 3: HOW TO UNINSTALL
--------------------------------------------------------------------------------
To completely remove Angular Gatekeeper from your computer:
1. Double-click "Uninstall.bat" (or run "AngularGatekeeperSetup.exe --uninstall").
2. Confirm the prompt by pressing [Y] and [Enter].
3. All hooks, background processes, shortcuts, and configurations will be removed.

--------------------------------------------------------------------------------
✨ KEY FEATURES & BENEFITS
--------------------------------------------------------------------------------
✔ Real-time conflict detection on LIVE uncommitted working tree edits.
✔ Windows Desktop Toast & Audio alerts with 1-click terminal inspection.
✔ Completely silent background monitoring (Zero flashing console windows).
✔ Strict TypeScript compilation and Angular architecture checks on commits.
✔ Gemini 2.5 Flash AI regression audit against historical 'resolved_issues.md'.
✔ Global CLI accessible across CMD, PowerShell, Git Bash, and VS Code.
✔ Standalone Windows executable - No global Node.js runtime required.

================================================================================
           For support or updates, refer to the project repository.
================================================================================
`;
}

async function build() {
  console.log('\n======================================================');
  console.log('  Angular Gatekeeper: Bundling & Packaging Engine     ');
  console.log('======================================================\n');

  // 1. Ensure build, dist, and 'Angular Gatekeeper' package directories exist
  [buildDir, distDir, outputFolder].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Clean up any legacy FrontendGatekeeperSetup.exe
  ['dist', 'Angular Gatekeeper'].forEach(folder => {
    const legacyPath = path.join(__dirname, folder, 'FrontendGatekeeperSetup.exe');
    if (fs.existsSync(legacyPath)) {
      try { fs.unlinkSync(legacyPath); } catch (e) {}
    }
  });

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
  const engineExePath = path.join(outputFolder, 'engine.exe');
  
  const installerCjsPath = path.join(buildDir, 'installer.cjs');
  const installerExePath = path.join(outputFolder, 'AngularGatekeeperSetup.exe');

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
    console.log('  ✔ AngularGatekeeperSetup.exe compiled successfully.');
  } catch (err) {
    console.error('✖ Error during pkg binary compilation:', err.message || err);
    process.exit(1);
  }

  // 4. Create package extras (README, Install.bat, Uninstall.bat)
  console.log('\n>>> [3/3] Generating Release Package & Documentation...');

  // Write README.txt & README.md in the package folder
  const readmeText = generateReadme();
  fs.writeFileSync(path.join(outputFolder, 'README.txt'), readmeText, 'utf8');
  fs.writeFileSync(path.join(outputFolder, 'README.md'), readmeText, 'utf8');
  console.log('  ✔ Generated: Angular Gatekeeper/README.txt');

  // Write Install.bat helper
  const installBatContent = `@echo off\ntitle Angular Gatekeeper Setup\necho =====================================================\necho          Angular Gatekeeper Setup Launcher           \necho =====================================================\necho.\n"%~dp0AngularGatekeeperSetup.exe"\npause\n`;
  fs.writeFileSync(path.join(outputFolder, 'Install.bat'), installBatContent, 'utf8');
  console.log('  ✔ Generated: Angular Gatekeeper/Install.bat');

  // Write Uninstall.bat helper
  const uninstallBatContent = `@echo off\ntitle Angular Gatekeeper Uninstaller\necho =====================================================\necho          Angular Gatekeeper Uninstaller              \necho =====================================================\necho.\n"%~dp0AngularGatekeeperSetup.exe" --uninstall\n`;
  fs.writeFileSync(path.join(outputFolder, 'Uninstall.bat'), uninstallBatContent, 'utf8');
  console.log('  ✔ Generated: Angular Gatekeeper/Uninstall.bat');

  // Sync with dist/ directory
  try {
    fs.copyFileSync(engineExePath, path.join(distDir, 'engine.exe'));
    fs.copyFileSync(installerExePath, path.join(distDir, 'AngularGatekeeperSetup.exe'));
    fs.copyFileSync(path.join(outputFolder, 'Install.bat'), path.join(distDir, 'Install.bat'));
    fs.copyFileSync(path.join(outputFolder, 'Uninstall.bat'), path.join(distDir, 'Uninstall.bat'));
    fs.copyFileSync(path.join(outputFolder, 'README.txt'), path.join(distDir, 'README.txt'));
  } catch (e) {}

  if (fs.existsSync(engineExePath) && fs.existsSync(installerExePath)) {
    const engineSizeMb = (fs.statSync(engineExePath).size / (1024 * 1024)).toFixed(2);
    const installerSizeMb = (fs.statSync(installerExePath).size / (1024 * 1024)).toFixed(2);
    
    console.log(`\n✔ Release Package ready in "Angular Gatekeeper/":`);
    console.log(`  ├── Angular Gatekeeper/AngularGatekeeperSetup.exe (${installerSizeMb} MB)`);
    console.log(`  ├── Angular Gatekeeper/engine.exe (${engineSizeMb} MB)`);
    console.log(`  ├── Angular Gatekeeper/Install.bat (Quick 1-click launcher)`);
    console.log(`  ├── Angular Gatekeeper/Uninstall.bat (Quick 1-click uninstaller)`);
    console.log(`  └── Angular Gatekeeper/README.txt (Complete instructions & user guide)`);
    console.log('\n✨ Standalone Software Distribution Package Built Successfully!\n');
  } else {
    console.error('✖ One or more expected binary files are missing in release package.');
    process.exit(1);
  }
}

build().catch(err => {
  console.error('Unhandled build error:', err);
  process.exit(1);
});
