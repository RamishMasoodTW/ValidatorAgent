#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import prompts from 'prompts';
import readline from 'readline';
import { BANNER } from './ascii-art.js';

const appDataRoot = process.env.APPDATA
  ? process.env.APPDATA
  : path.join(process.env.USERPROFILE || process.env.HOME || '.', 'AppData', 'Roaming');

const targetDir = path.join(appDataRoot, 'FrontendGatekeeper');
const hooksDir = path.join(targetDir, 'hooks');
const normalizedHooksPath = hooksDir.replace(/\\/g, '/');

// Check CLI arguments (--enable, --disable, --status, --uninstall)
const args = process.argv.slice(2);

if (args.includes('--uninstall') || args.includes('uninstall')) {
  runUninstaller().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
} else if (args.includes('--disable')) {
  try {
    execSync('git config --global --unset core.hooksPath', { stdio: 'pipe' });
    console.log(chalk.green('✔ Gatekeeper DISABLED globally! Git will now commit normally without validation.'));
  } catch (e) {
    console.log(chalk.yellow('Gatekeeper is already disabled (core.hooksPath is not set).'));
  }
  process.exit(0);
} else if (args.includes('--enable')) {
  try {
    execSync(`git config --global core.hooksPath "${normalizedHooksPath}"`, { stdio: 'pipe' });
    console.log(chalk.green(`✔ Gatekeeper ENABLED globally! (core.hooksPath = ${normalizedHooksPath})`));
  } catch (e) {
    console.log(chalk.red(`✖ Failed to enable Gatekeeper: ${e.message}`));
  }
  process.exit(0);
} else if (args.includes('--status')) {
  try {
    const current = execSync('git config --global core.hooksPath', { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (current && current.toLowerCase().includes('frontendgatekeeper')) {
      console.log(chalk.green(`✔ Gatekeeper is currently ENABLED. (Hooks path: ${current})`));
    } else {
      console.log(chalk.yellow(`⚠ Gatekeeper is currently DISABLED or using other path: "${current || 'None'}"`));
    }
  } catch (e) {
    console.log(chalk.yellow('⚠ Gatekeeper is currently DISABLED (core.hooksPath is not set).'));
  }
  process.exit(0);
} else {
  runInstaller().catch(err => {
    console.error('Fatal installer error:', err);
    process.exit(1);
  });
}

async function runUninstaller() {
  console.clear();
  console.log(BANNER);
  console.log(chalk.red.bold('  Angular Gatekeeper Uninstallation Wizard\n'));
  console.log(chalk.white('  This will remove Angular Gatekeeper, global CLI shortcuts, and Git hooks from your computer.\n'));

  const response = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: 'Are you sure you want to completely uninstall Angular Gatekeeper?',
    initial: true
  });

  if (!response.confirm) {
    console.log(chalk.yellow('\n⚠ Uninstallation cancelled.'));
    await waitPrompt();
    return;
  }

  console.log('\n' + chalk.blue('Starting uninstallation process...'));

  // 1. Terminate running background engine processes
  try {
    execSync('powershell -Command "Stop-Process -Name engine -Force -ErrorAction SilentlyContinue"', { stdio: 'ignore' });
    console.log(chalk.green('✔ Stopped active background monitoring processes.'));
  } catch (e) {}

  // 2. Unset global Git core.hooksPath if pointing to FrontendGatekeeper
  try {
    const currentHooks = execSync('git config --global core.hooksPath', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (currentHooks && currentHooks.toLowerCase().includes('frontendgatekeeper')) {
      execSync('git config --global --unset core.hooksPath', { stdio: 'pipe' });
      console.log(chalk.green('✔ Restored global Git hooks configuration.'));
    }
  } catch (e) {}

  // 3. Remove from User PATH
  try {
    const currentPath = execSync('powershell -Command "[Environment]::GetEnvironmentVariable(\'Path\', \'User\')"', {
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    const targetDirNormalized = targetDir.replace(/\//g, '\\');
    if (currentPath.toLowerCase().includes(targetDirNormalized.toLowerCase())) {
      const parts = currentPath.split(';').filter(p => p.trim() && p.toLowerCase() !== targetDirNormalized.toLowerCase());
      const newPath = parts.join(';');
      execSync(`powershell -Command "[Environment]::SetEnvironmentVariable('Path', '${newPath.replace(/'/g, "''")}', 'User')"`, { stdio: 'pipe' });
      console.log(chalk.green('✔ Removed FrontendGatekeeper from User PATH.'));
    }
  } catch (e) {}

  // 4. Remove Windows Registry Protocol (gatekeeper-details)
  try {
    execSync('powershell -Command "Remove-Item -Path \'HKCU:\\Software\\Classes\\gatekeeper-details\' -Recurse -Force -ErrorAction SilentlyContinue"', { stdio: 'ignore' });
    console.log(chalk.green('✔ Removed Windows Notification Protocol registration.'));
  } catch (e) {}

  // 5. Remove global npm shims if present
  const npmGlobalBin = path.join(appDataRoot, 'npm');
  try {
    const npmCmd = path.join(npmGlobalBin, 'a-gatekeeper.cmd');
    const npmBash = path.join(npmGlobalBin, 'a-gatekeeper');
    if (fs.existsSync(npmCmd)) fs.unlinkSync(npmCmd);
    if (fs.existsSync(npmBash)) fs.unlinkSync(npmBash);
  } catch (e) {}

  // 6. Remove target installation directory (%APPDATA%\FrontendGatekeeper)
  try {
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
      console.log(chalk.green(`✔ Removed installation directory: ${targetDir}`));
    }
  } catch (err) {
    console.log(chalk.yellow(`⚠ Note: Some files in ${targetDir} could not be deleted immediately (${err.message}).`));
  }

  console.log('\n' + chalk.green.bold('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.green.bold('       ANGULAR GATEKEEPER UNINSTALLED SUCCESSFULLY!            '));
  console.log(chalk.green.bold('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.white('\n  All hooks, CLI commands, and configurations have been removed from your PC.\n'));

  await waitPrompt('Press [Enter] to exit...');
}

async function waitPrompt(message = 'Press [Enter] to exit...') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(chalk.gray(`\n${message}`), () => {
      rl.close();
      resolve();
    });
  });
}

async function runInstaller() {
  console.clear();
  console.log(BANNER);
  console.log(chalk.red.bold('  Welcome to the Angular Git Quality & AI Gatekeeper Setup Wizard!\n'));
  console.log(chalk.white('  This installer configures a global Git pre-commit hook for all your Angular repositories,'));
  console.log(chalk.white('  enforcing strict quality, Angular build checks, and Gemini 3.6 Flash AI regression audits.\n'));

  // 1. Prompt for Gemini API Key (Optional)
  console.log(chalk.yellow('┌─────────────────────────────────────────────────────────────┐'));
  console.log(chalk.yellow('│ ') + chalk.bold.white('Gemini AI API Configuration (Optional)') + chalk.yellow('                    │'));
  console.log(chalk.yellow('└─────────────────────────────────────────────────────────────┘'));

  const response = await prompts({
    type: 'password',
    name: 'apiKey',
    message: 'Enter your Google AI (Gemini) API Key (Press Enter to skip):'
  });

  const apiKey = response.apiKey ? response.apiKey.trim() : '';
  if (!apiKey) {
    console.log(chalk.gray('\nℹ No API Key provided: AI Knowledge Base regression audits will be skipped.'));
    console.log(chalk.gray('  All other validations (TypeScript, Architecture, Security, Branch Watcher) will work normally.\n'));
  } else {
    console.log(chalk.green('\n✔ Gemini AI Key configured successfully.'));
  }

  // 2. Prompt for Live Progress Window preference (Optional)
  console.log(chalk.yellow('\n┌─────────────────────────────────────────────────────────────┐'));
  console.log(chalk.yellow('│ ') + chalk.bold.white('Live Commit Progress Window (Optional)') + chalk.yellow('                    │'));
  console.log(chalk.yellow('└─────────────────────────────────────────────────────────────┘'));
  console.log(chalk.gray('  Show a floating window with live step progress during every git commit.'));
  console.log(chalk.gray('  The window closes automatically when all checks pass.'));
  console.log(chalk.gray('  If an error is found, the window re-opens even if you closed it.\n'));

  const progressResponse = await prompts({
    type: 'confirm',
    name: 'showProgress',
    message: 'Enable Live Commit Progress Window?',
    initial: true
  });

  const showProgress = progressResponse.showProgress !== false; // default true
  if (showProgress) {
    console.log(chalk.green('\n✔ Live progress window will be shown during each commit.'));
  } else {
    console.log(chalk.gray('\nℹ Progress window disabled. Engine will run silently in the background.'));
  }

  console.log(chalk.blue('\nStarting installation process...'));

  // 2. Define Installation Directories
  console.log(chalk.gray(`\n• Target Directory: ${targetDir}`));
  console.log(chalk.gray(`• Hooks Directory:  ${hooksDir}`));

  try {
    fs.mkdirSync(hooksDir, { recursive: true });
    console.log(chalk.green('✔ Target directories created successfully.'));
  } catch (err) {
    console.log(chalk.red(`✖ Failed to create installation directories: ${err.message}`));
    await waitPrompt();
    process.exit(1);
  }

  // 3. Save Configuration (.env)
  const envFilePath = path.join(targetDir, '.env');
  try {
    let envContent = '# Angular Gatekeeper Environment Configuration\n';
    envContent += apiKey ? `GEMINI_API_KEY=${apiKey}\n` : `# GEMINI_API_KEY=\n`;
    envContent += `SHOW_PROGRESS=${showProgress ? 'true' : 'false'}\n`;
    fs.writeFileSync(envFilePath, envContent, 'utf8');
    if (apiKey) {
      console.log(chalk.green('✔ AI credentials saved to configuration file.'));
    } else {
      console.log(chalk.green('✔ Configuration file initialized.'));
    }
  } catch (err) {
    console.log(chalk.red(`✖ Failed to save configuration: ${err.message}`));
    await waitPrompt();
    process.exit(1);
  }

  // 4. Locate and Copy engine.exe
  const targetEnginePath = path.join(targetDir, 'engine.exe');

  const candidateEnginePaths = [
    path.join(path.dirname(process.execPath), 'engine.exe'),
    path.join(process.cwd(), 'dist', 'engine.exe'),
    path.join(process.cwd(), 'engine.exe'),
    typeof __dirname !== 'undefined' ? path.join(__dirname, 'engine.exe') : null,
    typeof __dirname !== 'undefined' ? path.join(__dirname, '..', 'dist', 'engine.exe') : null
  ].filter(Boolean);

  let sourceEnginePath = null;
  for (const p of candidateEnginePaths) {
    if (fs.existsSync(p)) {
      sourceEnginePath = p;
      break;
    }
  }

  if (sourceEnginePath) {
    try {
      fs.copyFileSync(sourceEnginePath, targetEnginePath);
      console.log(chalk.green(`✔ Copied engine binary to: ${targetEnginePath}`));
    } catch (err) {
      console.log(chalk.yellow(`⚠ Could not copy engine.exe: ${err.message}`));
    }
  } else {
    console.log(chalk.yellow(`⚠ Note: engine.exe not found in installer package directory.`));
    console.log(chalk.gray(`  Place engine.exe in ${targetDir} or build it using npm run build:exe.`));
  }

  // 5. Generate Global Pre-Commit Hook Script (%APPDATA%/FrontendGatekeeper/hooks/pre-commit)
  const preCommitScriptPath = path.join(hooksDir, 'pre-commit');
  const prePushScriptPath = path.join(hooksDir, 'pre-push');

  // Clean up any old pre-push hook so verifications happen ONLY on commit
  if (fs.existsSync(prePushScriptPath)) {
    try {
      fs.unlinkSync(prePushScriptPath);
      console.log(chalk.gray('✔ Cleaned up legacy pre-push hook (verifications now strictly on commit).'));
    } catch (e) {
      // ignore unlink error
    }
  }

  const preCommitScriptContent = `#!/usr/bin/env sh
# Frontend Git Quality & AI Gatekeeper Pre-Commit Hook
# Compatible with Git CLI, Git Bash, GitHub Desktop, and IDEs

if [ -n "$APPDATA" ]; then
  ENGINE_EXEC="$APPDATA/FrontendGatekeeper/engine.exe"
else
  ENGINE_EXEC="$USERPROFILE/AppData/Roaming/FrontendGatekeeper/engine.exe"
fi

if [ -f "$ENGINE_EXEC" ]; then
  "$ENGINE_EXEC"
  EXIT_CODE=$?
  exit $EXIT_CODE
else
  echo "[Frontend Gatekeeper] Warning: engine.exe not found at $ENGINE_EXEC"
  exit 0
fi
`;

  try {
    fs.writeFileSync(preCommitScriptPath, preCommitScriptContent, { encoding: 'utf8', mode: 0o777 });
    console.log(chalk.green('✔ Global pre-commit hook script generated.'));
  } catch (err) {
    console.log(chalk.red(`✖ Failed to write pre-commit hook script: ${err.message}`));
    await waitPrompt();
    process.exit(1);
  }

  // 6. Generate `a-gatekeeper.cmd` (CMD/PowerShell) and `a-gatekeeper` (Git Bash) CLI tools
  const cliCmdContent = `@echo off
setlocal

set HOOKS_PATH=${normalizedHooksPath}
if defined APPDATA (
  set "ENGINE_EXEC=%APPDATA%\\FrontendGatekeeper\\engine.exe"
) else (
  set "ENGINE_EXEC=%USERPROFILE%\\AppData\\Roaming\\FrontendGatekeeper\\engine.exe"
)

if "%~1"=="" goto help
if /I "%~1"=="enable" goto enable
if /I "%~1"=="disable" goto disable
if /I "%~1"=="status" goto status
if /I "%~1"=="bypass" goto bypass
if /I "%~1"=="branch" goto branch
if /I "%~1"=="branch-check" goto branch
if /I "%~1"=="help" goto help
goto help

:branch
if exist "%ENGINE_EXEC%" (
    "%ENGINE_EXEC%" %*
) else (
    echo [a-gatekeeper] Error: engine.exe not found at %ENGINE_EXEC%
)
goto end

:enable
git config --global core.hooksPath "%HOOKS_PATH%"
echo.
echo   [a-gatekeeper] ENABLED globally.
echo   All Angular git commits will now be validated.
echo.
goto end

:disable
git config --global --unset core.hooksPath 2>nul
echo.
echo   [a-gatekeeper] DISABLED globally.
echo   Git will now commit normally without validation.
echo.
goto end

:status
for /f "tokens=*" %%i in ('git config --global core.hooksPath 2^>nul') do set CURRENT_PATH=%%i
if defined CURRENT_PATH (
    echo.
    echo   [a-gatekeeper] Currently ENABLED
    echo   Hooks path: %CURRENT_PATH%
    echo.
) else (
    echo.
    echo   [a-gatekeeper] Currently DISABLED
    echo   No global hooks path is set.
    echo.
)
goto end

:bypass
echo.
echo   To bypass gatekeeper for a single commit, use:
echo   git commit --no-verify -m "your message"
echo.
goto end

:help
echo.
echo   ========================================
echo    a-gatekeeper - Angular Gatekeeper CLI
echo   ========================================
echo.
echo   Usage:  a-gatekeeper [command]
echo.
echo   Commit Quality Commands:
echo     enable                   Enable commit gatekeeper globally
echo     disable                  Disable commit gatekeeper globally
echo     status                   Check commit gatekeeper status
echo     bypass                   Show single-commit bypass command
echo.
echo   Branch Conflict Monitor Commands:
echo     branch check --enable    Select target branch ^& start 15-min background conflict watcher
echo     branch check --disable   Stop background branch conflict watcher
echo     branch check --status    View background conflict monitor status ^& alerts
echo.
goto end

:end
endlocal
`;

  const cliBashContent = `#!/usr/bin/env sh
HOOKS_PATH="${normalizedHooksPath}"

if [ -n "$APPDATA" ]; then
  ENGINE_EXEC="$APPDATA/FrontendGatekeeper/engine.exe"
else
  ENGINE_EXEC="$USERPROFILE/AppData/Roaming/FrontendGatekeeper/engine.exe"
fi

case "$1" in
  branch|branch-check)
    if [ -f "$ENGINE_EXEC" ]; then
      "$ENGINE_EXEC" "$@"
    else
      echo "[a-gatekeeper] Error: engine.exe not found at $ENGINE_EXEC"
    fi
    ;;
  enable)
    git config --global core.hooksPath "$HOOKS_PATH"
    echo ""
    echo "  [a-gatekeeper] ENABLED globally."
    echo "  All Angular git commits will now be validated."
    echo ""
    ;;
  disable)
    git config --global --unset core.hooksPath 2>/dev/null
    echo ""
    echo "  [a-gatekeeper] DISABLED globally."
    echo "  Git will now commit normally without validation."
    echo ""
    ;;
  status)
    CURRENT_PATH=$(git config --global core.hooksPath 2>/dev/null)
    if [ -n "$CURRENT_PATH" ]; then
      echo ""
      echo "  [a-gatekeeper] Currently ENABLED"
      echo "  Hooks path: $CURRENT_PATH"
      echo ""
    else
      echo ""
      echo "  [a-gatekeeper] Currently DISABLED"
      echo "  No global hooks path is set."
      echo ""
    fi
    ;;
  bypass)
    echo ""
    echo "  To bypass gatekeeper for a single commit, use:"
    echo "  git commit --no-verify -m \\"your message\\""
    echo ""
    ;;
  *)
    echo ""
    echo "  ========================================"
    echo "   a-gatekeeper - Angular Gatekeeper CLI"
    echo "  ========================================"
    echo ""
    echo "  Usage:  a-gatekeeper [command]"
    echo ""
    echo "  Commit Quality Commands:"
    echo "    enable                   Enable commit gatekeeper globally"
    echo "    disable                  Disable commit gatekeeper globally"
    echo "    status                   Check commit gatekeeper status"
    echo "    bypass                   Show single-commit bypass command"
    echo ""
    echo "  Branch Conflict Monitor Commands:"
    echo "    branch check --enable    Select target branch & start 15-min background conflict watcher"
    echo "    branch check --disable   Stop background branch conflict watcher"
    echo "    branch check --status    View background conflict monitor status & alerts"
    echo ""
    ;;
esac
`;

  // Write CLI tools into targetDir
  const cliCmdPath = path.join(targetDir, 'a-gatekeeper.cmd');
  const cliBashPath = path.join(targetDir, 'a-gatekeeper');
  const cliCmdNormalized = cliCmdContent.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
  const cliBashNormalized = cliBashContent.replace(/\r\n/g, '\n');

  try {
    fs.writeFileSync(cliCmdPath, cliCmdNormalized, 'utf8');
    fs.writeFileSync(cliBashPath, cliBashNormalized, { encoding: 'utf8', mode: 0o777 });
    console.log(chalk.green(`✔ CLI tools created in: ${targetDir}`));
  } catch (e) {
    console.log(chalk.yellow(`⚠ Could not create CLI scripts: ${e.message}`));
  }

  // Also write into %APPDATA%/npm if present (already in active system PATH)
  const appDataNpmDir = path.join(appDataRoot, 'npm');
  if (fs.existsSync(appDataNpmDir)) {
    try {
      fs.writeFileSync(path.join(appDataNpmDir, 'a-gatekeeper.cmd'), cliCmdNormalized, 'utf8');
      fs.writeFileSync(path.join(appDataNpmDir, 'a-gatekeeper'), cliBashNormalized, { encoding: 'utf8', mode: 0o777 });
      console.log(chalk.green(`✔ CLI tools installed into global npm PATH (${appDataNpmDir}) for instant access.`));
    } catch (npmErr) {
      // ignore
    }
  }

  // 7. Add FrontendGatekeeper directory to User PATH (so a-gatekeeper works globally everywhere)
  try {
    const currentPath = execSync('powershell -Command "[Environment]::GetEnvironmentVariable(\'Path\', \'User\')"', {
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    const targetDirNormalized = targetDir.replace(/\//g, '\\');
    if (!currentPath.toLowerCase().includes(targetDirNormalized.toLowerCase())) {
      const newPath = currentPath ? `${currentPath};${targetDirNormalized}` : targetDirNormalized;
      execSync(`powershell -Command "[Environment]::SetEnvironmentVariable('Path', '${newPath.replace(/'/g, "''")}', 'User')"`, {
        stdio: 'pipe'
      });
      // Also update current session PATH
      process.env.PATH = `${process.env.PATH};${targetDirNormalized}`;
      console.log(chalk.green(`✔ Added "${targetDirNormalized}" to User PATH.`));
    } else {
      console.log(chalk.green('✔ FrontendGatekeeper is verified in User PATH.'));
    }
  } catch (pathErr) {
    console.log(chalk.yellow(`⚠ Note on PATH: ${pathErr.message}`));
  }

  // 8. Configure Git Globally
  try {
    execSync(`git config --global core.hooksPath "${normalizedHooksPath}"`, { stdio: 'pipe' });
    console.log(chalk.green(`✔ Git global core.hooksPath configured to: ${normalizedHooksPath}`));
  } catch (err) {
    console.log(chalk.red(`✖ Failed to configure git global core.hooksPath: ${err.message}`));
    console.log(chalk.yellow(`  You can manually run: git config --global core.hooksPath "${normalizedHooksPath}"`));
  }

  // 9. Show Success Summary & Easy CLI Commands
  console.log('\n' + chalk.green.bold('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.green.bold('       INSTALLATION & CONFIGURATION COMPLETED SUCCESSFULLY!    '));
  console.log(chalk.green.bold('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.white('\n  Summary of installed components:'));
  console.log(chalk.cyan(`  • Engine Binary:     ${targetEnginePath}`));
  console.log(chalk.cyan(`  • Hook Trigger:      ${preCommitScriptPath} (COMMIT ONLY)`));
  console.log(chalk.cyan(`  • CLI Tool:          ${cliCmdPath}`));
  console.log(chalk.cyan(`  • Config & AI Key:   ${envFilePath}`));
  console.log(chalk.cyan(`  • Git Hook Path:     ${normalizedHooksPath}`));
  console.log(chalk.magenta('\n  Compatibility:'));
  console.log(chalk.white('  ✔ GitHub Desktop'));
  console.log(chalk.white('  ✔ Git Bash / Windows Terminal / CMD / PowerShell'));
  console.log(chalk.white('  ✔ VS Code / Cursor / IntelliJ / WebStorm Git integrations'));

  console.log('\n' + chalk.yellow.bold('┌─────────────────────────────────────────────────────────────┐'));
  console.log(chalk.yellow.bold('│ ') + chalk.bold.white('🎮 EASY TERMINAL COMMANDS                                  ') + chalk.yellow.bold('│'));
  console.log(chalk.yellow.bold('└─────────────────────────────────────────────────────────────┘'));

  console.log(chalk.white.bold('\n  Commit Quality Gatekeeper:'));
  console.log(chalk.green.bold('    a-gatekeeper enable          ') + chalk.white('→ Enable gatekeeper on all commits'));
  console.log(chalk.red.bold('    a-gatekeeper disable         ') + chalk.white('→ Disable gatekeeper (normal git)'));
  console.log(chalk.cyan.bold('    a-gatekeeper status          ') + chalk.white('→ Check commit gatekeeper status'));

  console.log(chalk.white.bold('\n  🌿 15-Minute Background Branch Conflict Monitor:'));
  console.log(chalk.green.bold('    a-gatekeeper branch check --enable   ') + chalk.white('→ Select target branch & start watcher'));
  console.log(chalk.red.bold('    a-gatekeeper branch check --disable  ') + chalk.white('→ Stop background watcher'));
  console.log(chalk.cyan.bold('    a-gatekeeper branch check --status   ') + chalk.white('→ View monitor status & conflicts'));

  console.log('\n' + chalk.gray('  (Open a NEW terminal after installation for the command to work.)'));
  console.log(chalk.gray('─'.repeat(63)));

  await waitPrompt('Press [Enter] to exit installer...');
  process.exit(0);
}

