#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import prompts from 'prompts';
import readline from 'readline';
import { BANNER } from './ascii-art.js';

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
  console.log(chalk.white('  This installer configures a global Git pre-push hook for all your Angular repositories,'));
  console.log(chalk.white('  enforcing strict quality, architecture standards, and Gemini 2.5 Flash AI regression audits.\n'));

  // 1. Prompt for Gemini API Key
  console.log(chalk.yellow('┌─────────────────────────────────────────────────────────────┐'));
  console.log(chalk.yellow('│ ') + chalk.bold.white('Gemini AI Studio Configuration') + chalk.yellow('                              │'));
  console.log(chalk.yellow('└─────────────────────────────────────────────────────────────┘'));
  
  const response = await prompts({
    type: 'password',
    name: 'apiKey',
    message: 'Enter your Google AI Studio (Gemini) API Key:',
    validate: value => value && value.trim().length > 0 ? true : 'API Key is required to enable AI Knowledge Base audits.'
  });

  const apiKey = response.apiKey ? response.apiKey.trim() : '';
  if (!apiKey) {
    console.log(chalk.red('\n✖ Setup cancelled: Valid Gemini API Key was not provided.'));
    await waitPrompt();
    process.exit(1);
  }

  console.log('\n' + chalk.blue('Starting installation process...'));

  // 2. Define Installation Directories
  const appDataRoot = process.env.APPDATA 
    ? process.env.APPDATA 
    : path.join(process.env.USERPROFILE || process.env.HOME || '.', 'AppData', 'Roaming');
  
  const targetDir = path.join(appDataRoot, 'FrontendGatekeeper');
  const hooksDir = path.join(targetDir, 'hooks');

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
    const envContent = `# Frontend Gatekeeper Environment Configuration\nGEMINI_API_KEY=${apiKey}\n`;
    fs.writeFileSync(envFilePath, envContent, 'utf8');
    console.log(chalk.green('✔ AI credentials saved to configuration file.'));
  } catch (err) {
    console.log(chalk.red(`✖ Failed to save configuration: ${err.message}`));
    await waitPrompt();
    process.exit(1);
  }

  // 4. Locate and Copy engine.exe
  const targetEnginePath = path.join(targetDir, 'engine.exe');
  
  // Possible source paths for engine.exe
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

  // 5. Generate Global Hook Script (%APPDATA%/FrontendGatekeeper/hooks/pre-push)
  const prePushScriptPath = path.join(hooksDir, 'pre-push');
  const prePushScriptContent = `#!/usr/bin/env sh
# Frontend Git Quality & AI Gatekeeper Pre-Push Hook
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
    fs.writeFileSync(prePushScriptPath, prePushScriptContent, { encoding: 'utf8', mode: 0o777 });
    console.log(chalk.green('✔ Global pre-push hook script generated.'));
  } catch (err) {
    console.log(chalk.red(`✖ Failed to write pre-push hook script: ${err.message}`));
    await waitPrompt();
    process.exit(1);
  }

  // 6. Configure Git Globally
  try {
    // Standardize hooks path with forward slashes for Git config
    const normalizedHooksPath = hooksDir.replace(/\\/g, '/');
    execSync(`git config --global core.hooksPath "${normalizedHooksPath}"`, { stdio: 'pipe' });
    console.log(chalk.green(`✔ Git global core.hooksPath configured to: ${normalizedHooksPath}`));
  } catch (err) {
    console.log(chalk.red(`✖ Failed to configure git global core.hooksPath: ${err.message}`));
    console.log(chalk.yellow(`  You can manually run: git config --global core.hooksPath "${hooksDir.replace(/\\/g, '/')}"`));
  }

  // 7. Show Success Summary
  console.log('\n' + chalk.green.bold('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.green.bold('       INSTALLATION & CONFIGURATION COMPLETED SUCCESSFULLY!    '));
  console.log(chalk.green.bold('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.white('\n  Summary of installed components:'));
  console.log(chalk.cyan(`  • Engine Binary:     ${targetEnginePath}`));
  console.log(chalk.cyan(`  • Global Git Hook:   ${prePushScriptPath}`));
  console.log(chalk.cyan(`  • Config & AI Key:   ${envFilePath}`));
  console.log(chalk.cyan(`  • Git Hook Path:     ${hooksDir.replace(/\\/g, '/')}`));
  console.log(chalk.magenta('\n  Compatibility:'));
  console.log(chalk.white('  ✔ GitHub Desktop'));
  console.log(chalk.white('  ✔ Git Bash / Windows Terminal / CMD / PowerShell'));
  console.log(chalk.white('  ✔ VS Code / Cursor / IntelliJ / WebStorm Git integrations'));
  console.log(chalk.white('\n  Every `git push` in your repositories will now be validated'));
  console.log(chalk.white('  by the DevSecOps Quality & Gemini 2.5 Flash AI Gatekeeper!'));

  await waitPrompt('Press [Enter] to exit installer...');
  process.exit(0);
}

runInstaller().catch(async (err) => {
  console.error(chalk.red.bold(`\nSetup Wizard Error: ${err.message}`));
  console.error(err);
  await waitPrompt();
  process.exit(1);
});
