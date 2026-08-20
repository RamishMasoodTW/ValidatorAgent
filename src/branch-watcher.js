import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import chalk from 'chalk';
import prompts from 'prompts';

function runGit(command, cwd = process.cwd(), allowFail = false) {
  try {
    return execSync(command, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    if (!allowFail) {
      throw err;
    }
    return '';
  }
}

function getWatcherConfigPath(cwd = process.cwd()) {
  const gitDir = path.join(cwd, '.git');
  if (!fs.existsSync(gitDir)) return null;
  return path.join(gitDir, 'gatekeeper-branch-watcher.json');
}

function getAlertLogPath(cwd = process.cwd()) {
  const gitDir = path.join(cwd, '.git');
  if (!fs.existsSync(gitDir)) return null;
  return path.join(gitDir, 'gatekeeper-conflict-alert.log');
}

/**
 * Trigger Windows Toast Notification via PowerShell
 */
export function sendWindowsNotification(title, message) {
  if (process.platform !== 'win32') return;

  const safeTitle = title.replace(/'/g, "''").replace(/"/g, '`"');
  const safeMessage = message.replace(/'/g, "''").replace(/"/g, '`"');

  const psScript = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$textNodes = $template.GetElementsByTagName("text")
$textNodes.Item(0).AppendChild($template.CreateTextNode("${safeTitle}")) > $null
$textNodes.Item(1).AppendChild($template.CreateTextNode("${safeMessage}")) > $null
$toast = [Windows.UI.Notifications.ToastNotification]::new($template)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Angular Gatekeeper").Show($toast)
`;

  try {
    execSync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, {
      stdio: 'pipe',
      timeout: 5000
    });
  } catch (err) {
    // Fallback: PowerShell sound / console alert
    try {
      execSync(`powershell -Command "[console]::beep(800, 300)"`, { stdio: 'ignore' });
    } catch (e) {}
  }
}

/**
 * Fetch remote branches and return clean array
 */
export function getRemoteBranches(cwd = process.cwd()) {
  try {
    console.log(chalk.gray('  Fetching latest branch list from origin...'));
    runGit('git fetch --prune origin', cwd, true);
  } catch (e) {
    // ignore offline fetch
  }

  const rawBranches = runGit('git branch -r', cwd, true);
  if (!rawBranches) return [];

  const branches = rawBranches
    .split('\n')
    .map(b => b.trim())
    .filter(b => b.startsWith('origin/') && !b.includes('origin/HEAD'))
    .map(b => b.replace(/^origin\//, ''))
    .filter(Boolean);

  // Remove duplicates and sort
  return [...new Set(branches)].sort();
}

/**
 * Perform in-memory merge conflict detection against targetBranch
 */
export function checkBranchConflicts(cwd = process.cwd(), targetBranch = 'main') {
  const currentBranch = runGit('git rev-parse --abbrev-ref HEAD', cwd, true) || 'HEAD';

  // 1. Fetch latest changes for target branch
  try {
    runGit(`git fetch origin ${targetBranch}`, cwd, true);
  } catch (e) {
    // ignore offline
  }

  // 2. Check behind / ahead counts
  const behindCountStr = runGit(`git rev-list --count HEAD..origin/${targetBranch}`, cwd, true);
  const aheadCountStr = runGit(`git rev-list --count origin/${targetBranch}..HEAD`, cwd, true);
  const behindCount = parseInt(behindCountStr, 10) || 0;
  const aheadCount = parseInt(aheadCountStr, 10) || 0;

  // 3. Dry-run Merge Conflict Detection using git merge-tree
  let hasConflict = false;
  let conflictingFiles = [];
  let mergeTreeOutput = '';

  // Try modern Git merge-tree (--write-tree)
  try {
    const res = execSync(`git merge-tree --write-tree HEAD origin/${targetBranch}`, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    mergeTreeOutput = res;
    hasConflict = false;
  } catch (err) {
    // Exit code 1 indicates merge conflicts in modern Git
    mergeTreeOutput = (err.stdout || '') + '\n' + (err.stderr || '');
    hasConflict = true;

    // Extract conflicting filenames
    const lines = mergeTreeOutput.split('\n');
    for (const line of lines) {
      if (line.includes('CONFLICT') || line.includes('Auto-merging')) {
        const match = line.match(/CONFLICT \([^)]+\): (?:Merge conflict in )?(.*)/i);
        if (match && match[1]) {
          conflictingFiles.push(match[1].trim());
        }
      }
    }
  }

  // Fallback for classic git merge-tree if no files parsed
  if (hasConflict && conflictingFiles.length === 0) {
    const mergeBase = runGit(`git merge-base HEAD origin/${targetBranch}`, cwd, true);
    if (mergeBase) {
      const classicOutput = runGit(`git merge-tree ${mergeBase} HEAD origin/${targetBranch}`, cwd, true);
      const blocks = classicOutput.split('changed in both');
      if (blocks.length > 1) {
        for (let i = 1; i < blocks.length; i++) {
          const match = blocks[i].match(/^\s*\n\s*base\s+[0-9a-f]+\s+([^\n]+)/m);
          if (match && match[1]) {
            conflictingFiles.push(match[1].trim());
          }
        }
      }
    }
  }

  conflictingFiles = [...new Set(conflictingFiles)].filter(Boolean);
  if (conflictingFiles.length > 0) {
    hasConflict = true;
  }

  return {
    hasConflict,
    conflictingFiles,
    behindCount,
    aheadCount,
    currentBranch,
    targetBranch,
    checkedAt: new Date().toISOString()
  };
}

/**
 * Interactive setup: a-gatekeeper branch check --enable
 */
export async function enableBranchWatcher(cwd = process.cwd()) {
  console.log('\n' + chalk.cyan.bold('╔═════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║       🌿 AUTOMATIC BRANCH CONFLICT WATCHER SETUP           ║'));
  console.log(chalk.cyan.bold('╚═════════════════════════════════════════════════════════════╝\n'));

  const gitDir = path.join(cwd, '.git');
  if (!fs.existsSync(gitDir)) {
    console.log(chalk.red('✖ Error: Current directory is not a Git repository.'));
    process.exit(1);
  }

  const branches = getRemoteBranches(cwd);
  if (branches.length === 0) {
    console.log(chalk.red('✖ No remote branches found on origin. Ensure origin remote is configured.'));
    process.exit(1);
  }

  const currentBranch = runGit('git rev-parse --abbrev-ref HEAD', cwd, true) || 'main';
  console.log(chalk.white(`  Active Local Branch: ${chalk.bold.green(currentBranch)}`));
  console.log(chalk.white('  Select target branch to monitor conflicts against:\n'));

  const choices = branches.map((b, i) => ({
    title: `${i + 1}) ${b} ${b === 'main' || b === 'master' || b === 'dev' || b === 'develop' ? chalk.gray('(Default Target)') : ''}`,
    value: b
  }));

  const response = await prompts({
    type: 'select',
    name: 'targetBranch',
    message: 'Select target comparison branch:',
    choices,
    initial: choices.findIndex(c => c.value === 'main' || c.value === 'master' || c.value === 'develop') >= 0
      ? choices.findIndex(c => c.value === 'main' || c.value === 'master' || c.value === 'develop')
      : 0
  });

  const targetBranch = response.targetBranch;
  if (!targetBranch) {
    console.log(chalk.yellow('\n⚠ Setup cancelled. No branch selected.'));
    process.exit(0);
  }

  console.log('\n' + chalk.blue(`>>> [Initial Immediate Check] Checking sync with origin/${targetBranch}...`));

  // 1. Immediate Initial Check
  const checkResult = checkBranchConflicts(cwd, targetBranch);

  console.log(chalk.gray('─'.repeat(60)));
  if (checkResult.behindCount > 0) {
    console.log(chalk.yellow.bold(`\n⚠ NOTICE: Target branch "origin/${targetBranch}" has ${checkResult.behindCount} new commit(s) on GitHub!`));
    console.log(chalk.white('  Please pull or rebase the remote changes into your branch to stay updated:'));
    console.log(chalk.cyan.bold(`  $ git pull origin ${targetBranch}\n`));
  } else {
    console.log(chalk.green(`✔ No pending incoming commits from origin/${targetBranch}.`));
  }

  if (checkResult.hasConflict) {
    console.log(chalk.red.bold(`\n✖ WARNING: Immediate Merge Conflicts Detected with "origin/${targetBranch}"!`));
    console.log(chalk.red(`  Conflicting file(s):`));
    checkResult.conflictingFiles.forEach(f => console.log(chalk.red(`    • ${f}`)));
    console.log(chalk.yellow(`  Resolve these conflicts to ensure smooth collaboration.\n`));
  } else {
    console.log(chalk.green(`✔ ZERO merge conflicts detected between "${currentBranch}" and "origin/${targetBranch}".\n`));
  }
  console.log(chalk.gray('─'.repeat(60)));

  // 2. Stop any existing watcher for this repo
  await disableBranchWatcher(cwd, true);

  // 3. Launch Detached Background Daemon
  console.log(chalk.blue('\n>>> Launching background 15-minute sync monitor daemon...'));

  const engineExec = process.execPath;
  const daemonArgs = ['branch-watch-daemon', cwd, targetBranch];

  // Spawn detached process
  const child = spawn(engineExec, daemonArgs, {
    detached: true,
    stdio: 'ignore',
    cwd
  });

  child.unref();

  const configPath = getWatcherConfigPath(cwd);
  const configData = {
    enabled: true,
    pid: child.pid,
    repoPath: cwd,
    currentBranch,
    targetBranch,
    intervalMinutes: 15,
    startedAt: new Date().toISOString(),
    lastCheckedAt: checkResult.checkedAt,
    hasConflict: checkResult.hasConflict,
    conflictingFiles: checkResult.conflictingFiles,
    behindCount: checkResult.behindCount
  };

  if (configPath) {
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
  }

  console.log(chalk.green.bold('\n═══════════════════════════════════════════════════════════════'));
  console.log(chalk.green.bold('   ✔ 15-MINUTE BACKGROUND BRANCH CONFLICT WATCHER ACTIVATED!   '));
  console.log(chalk.green.bold('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.white(`  • Monitored Branch:  ${chalk.cyan.bold('origin/' + targetBranch)}`));
  console.log(chalk.white(`  • Active Branch:     ${chalk.cyan.bold(currentBranch)}`));
  console.log(chalk.white(`  • Check Interval:    ${chalk.cyan('Every 15 Minutes')}`));
  console.log(chalk.white(`  • Background PID:    ${chalk.cyan(child.pid)}`));
  console.log(chalk.magenta('\n  You will receive automatic Windows Desktop Toast alerts'));
  console.log(chalk.magenta(`  whenever new commits on "${targetBranch}" cause conflicts with your work.`));
  console.log(chalk.gray('\n  To stop watcher:     a-gatekeeper branch check --disable'));
  console.log(chalk.gray('  To check status:     a-gatekeeper branch check --status\n'));
}

/**
 * Disable watcher: a-gatekeeper branch check --disable
 */
export async function disableBranchWatcher(cwd = process.cwd(), silent = false) {
  const configPath = getWatcherConfigPath(cwd);
  if (!configPath || !fs.existsSync(configPath)) {
    if (!silent) {
      console.log(chalk.yellow('⚠ No active branch conflict watcher found for this repository.'));
    }
    return;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.pid) {
      try {
        process.kill(config.pid);
      } catch (e) {
        // process might have already exited
      }
    }
    fs.unlinkSync(configPath);
    const alertLog = getAlertLogPath(cwd);
    if (alertLog && fs.existsSync(alertLog)) {
      fs.unlinkSync(alertLog);
    }
    if (!silent) {
      console.log(chalk.green('✔ Branch conflict watcher DISABLED successfully for this repository.'));
    }
  } catch (err) {
    if (!silent) {
      console.log(chalk.red(`✖ Error disabling watcher: ${err.message}`));
    }
  }
}

/**
 * Status check: a-gatekeeper branch check --status
 */
export async function statusBranchWatcher(cwd = process.cwd()) {
  const configPath = getWatcherConfigPath(cwd);
  if (!configPath || !fs.existsSync(configPath)) {
    console.log(chalk.yellow('\n⚠ Branch conflict watcher is currently DISABLED for this repository.'));
    console.log(chalk.gray('  To enable, run: a-gatekeeper branch check --enable\n'));
    return;
  }

  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    console.log(chalk.yellow('⚠ Invalid watcher configuration.'));
    return;
  }

  let isRunning = false;
  if (config.pid) {
    try {
      process.kill(config.pid, 0); // test if process is alive
      isRunning = true;
    } catch (e) {
      isRunning = false;
    }
  }

  console.log('\n' + chalk.cyan.bold('┌─────────────────────────────────────────────────────────────┐'));
  console.log(chalk.cyan.bold('│ ') + chalk.bold.white('🌿 BRANCH CONFLICT WATCHER STATUS                          ') + chalk.cyan.bold('│'));
  console.log(chalk.cyan.bold('└─────────────────────────────────────────────────────────────┘\n'));

  console.log(chalk.white(`  • Status:           ${isRunning ? chalk.green.bold('RUNNING (Active)') : chalk.red.bold('STOPPED')}`));
  console.log(chalk.white(`  • Background PID:   ${config.pid || 'N/A'}`));
  console.log(chalk.white(`  • Monitored Target: ${chalk.cyan.bold('origin/' + config.targetBranch)}`));
  console.log(chalk.white(`  • Check Interval:   Every ${config.intervalMinutes || 15} minutes`));
  console.log(chalk.white(`  • Started At:       ${config.startedAt ? new Date(config.startedAt).toLocaleString() : 'N/A'}`));
  console.log(chalk.white(`  • Last Checked:     ${config.lastCheckedAt ? new Date(config.lastCheckedAt).toLocaleString() : 'N/A'}`));

  if (config.behindCount > 0) {
    console.log(chalk.yellow(`\n  ⚠ Pending Remote Commits: origin/${config.targetBranch} has ${config.behindCount} new commit(s).`));
    console.log(chalk.gray(`    Run: git pull origin ${config.targetBranch}`));
  }

  if (config.hasConflict && config.conflictingFiles && config.conflictingFiles.length > 0) {
    console.log(chalk.red.bold('\n  ✖ CONFLICT ALERT! Detected merge conflicts with target branch:'));
    config.conflictingFiles.forEach(f => console.log(chalk.red(`    • ${f}`)));
  } else {
    console.log(chalk.green('\n  ✔ ZERO conflicts detected with target branch.'));
  }
  console.log('');
}

/**
 * Background daemon loop: runs every 15 minutes
 */
export async function runDaemonLoop(cwd, targetBranch) {
  const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

  async function checkCycle() {
    try {
      const result = checkBranchConflicts(cwd, targetBranch);
      const configPath = getWatcherConfigPath(cwd);

      if (configPath && fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          config.lastCheckedAt = result.checkedAt;
          config.hasConflict = result.hasConflict;
          config.conflictingFiles = result.conflictingFiles;
          config.behindCount = result.behindCount;
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        } catch (e) {}
      }

      // If conflicts detected, trigger Windows Toast Notification
      if (result.hasConflict && result.conflictingFiles.length > 0) {
        const fileList = result.conflictingFiles.slice(0, 3).join(', ') + (result.conflictingFiles.length > 3 ? '...' : '');
        sendWindowsNotification(
          '⚠️ Angular Gatekeeper: Merge Conflict Detected!',
          `Branch "${result.currentBranch}" conflicts with origin/${targetBranch} in: ${fileList}`
        );

        const alertLogPath = getAlertLogPath(cwd);
        if (alertLogPath) {
          const logContent = `[${new Date().toLocaleString()}] CONFLICT ALERT\n` +
            `Current Branch: ${result.currentBranch}\n` +
            `Target Branch: origin/${targetBranch}\n` +
            `Conflicting Files:\n` +
            result.conflictingFiles.map(f => `  - ${f}`).join('\n') +
            `\n\nPlease pull or rebase origin/${targetBranch} to resolve.\n\n`;
          fs.appendFileSync(alertLogPath, logContent, 'utf8');
        }
      }
    } catch (cycleErr) {
      // ignore cycle error in background
    }
  }

  // Run immediately, then every 15 minutes
  await checkCycle();
  setInterval(checkCycle, INTERVAL_MS);
}
