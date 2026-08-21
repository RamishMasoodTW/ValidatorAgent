import fs from 'fs';
import path from 'path';
import { execSync, spawn } from 'child_process';
import chalk from 'chalk';
import prompts from 'prompts';

function runGit(command, cwd = process.cwd(), allowFail = false) {
  try {
    return execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    }).trim();
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
 * Returns the path to this project's engine binary (installed or dev fallback)
 */
function getEngineBinaryPath() {
  const installed = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'FrontendGatekeeper', 'engine.exe')
    : null;
  if (installed && fs.existsSync(installed)) return installed;
  return process.execPath;
}

/**
 * Write / merge a VS Code tasks.json entry so the branch-watcher auto-restarts
 * whenever any VS Code / IDE compatible tool opens this folder.
 *
 * Uses "runOn": "folderOpen" which is supported by VS Code, Cursor, etc.
 */
function setupVSCodeAutoRestart(cwd) {
  const vscodDir = path.join(cwd, '.vscode');
  const tasksFile = path.join(vscodDir, 'tasks.json');
  const engineBin = getEngineBinaryPath();

  const newTask = {
    label: 'Angular Gatekeeper: Auto-Restart Branch Watcher',
    type: 'shell',
    command: `"${engineBin}"`,
    args: ['branch', 'watch', '--auto-restart'],
    options: { cwd: '${workspaceFolder}' },
    runOptions: { runOn: 'folderOpen' },
    presentation: {
      reveal: 'silent',
      panel: 'dedicated',
      showReuseMessage: false,
      close: true
    },
    problemMatcher: []
  };

  try {
    fs.mkdirSync(vscodDir, { recursive: true });

    // --- tasks.json ---
    let existingTasks = { version: '2.0.0', tasks: [] };
    if (fs.existsSync(tasksFile)) {
      try {
        existingTasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
        if (!Array.isArray(existingTasks.tasks)) existingTasks.tasks = [];
      } catch (_) {}
    }
    existingTasks.tasks = existingTasks.tasks.filter(t => t.label !== newTask.label);
    existingTasks.tasks.push(newTask);
    fs.writeFileSync(tasksFile, JSON.stringify(existingTasks, null, 2), 'utf8');

    // --- settings.json: allow automatic tasks so user isn't prompted ---
    const settingsFile = path.join(vscodDir, 'settings.json');
    let existingSettings = {};
    if (fs.existsSync(settingsFile)) {
      try { existingSettings = JSON.parse(fs.readFileSync(settingsFile, 'utf8')); } catch (_) {}
    }
    existingSettings['task.allowAutomaticTasks'] = 'on';
    fs.writeFileSync(settingsFile, JSON.stringify(existingSettings, null, 2), 'utf8');
  } catch (err) {
    // non-fatal — best effort
  }
}

/**
 * Remove the Gatekeeper auto-restart entry from .vscode/tasks.json and settings.json
 * (leaves all other tasks/settings untouched)
 */
function removeVSCodeAutoRestart(cwd) {
  const vscodDir = path.join(cwd, '.vscode');

  // Remove task entry from tasks.json
  const tasksFile = path.join(vscodDir, 'tasks.json');
  if (fs.existsSync(tasksFile)) {
    try {
      const existing = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
      if (Array.isArray(existing.tasks)) {
        existing.tasks = existing.tasks.filter(
          t => t.label !== 'Angular Gatekeeper: Auto-Restart Branch Watcher'
        );
        fs.writeFileSync(tasksFile, JSON.stringify(existing, null, 2), 'utf8');
      }
    } catch (_) {}
  }

  // Remove the allowAutomaticTasks setting from settings.json
  const settingsFile = path.join(vscodDir, 'settings.json');
  if (fs.existsSync(settingsFile)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
      delete settings['task.allowAutomaticTasks'];
      fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
    } catch (_) {}
  }
}

/**
 * Called via `engine.exe branch watch --auto-restart`.
 * Reads per-project config; if enabled AND no daemon already running,
 * runs one immediate check then spawns the interval daemon.
 */
export async function autoRestartIfEnabled(cwd = process.cwd()) {
  const configPath = getWatcherConfigPath(cwd);
  if (!configPath || !fs.existsSync(configPath)) return; // not enabled for this project

  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (_) { return; }

  if (!config.enabled) return; // explicitly disabled

  const targetBranch = config.targetBranch || 'main';
  const intervalMinutes = parseInt(config.intervalMinutes, 10) || 15;

  // If previous daemon PID is still alive, nothing to do
  if (config.pid && isPidAlive(config.pid)) return;

  // Spawn fresh daemon process for this project
  const engineBin = getEngineBinaryPath();
  let execBinary = engineBin;
  let execArgs = [];
  if (path.basename(execBinary).toLowerCase().startsWith('node')) {
    execArgs = [process.argv[1]];
  }

  const gitDir = path.join(cwd, '.git');
  const daemonLogPath = path.join(gitDir, 'gatekeeper-daemon.log');
  const outLog = fs.openSync(daemonLogPath, 'a');
  const errLog = fs.openSync(daemonLogPath, 'a');

  const child = spawn(execBinary, execArgs, {
    detached: true,
    stdio: ['ignore', outLog, errLog],
    cwd,
    windowsHide: true,
    env: {
      ...process.env,
      GATEKEEPER_DAEMON_MODE: '1',
      GATEKEEPER_REPO_PATH: cwd,
      GATEKEEPER_TARGET_BRANCH: targetBranch,
      GATEKEEPER_INTERVAL_MINUTES: String(intervalMinutes)
    }
  });
  child.unref();

  // Update PID in config
  try {
    config.pid = child.pid;
    config.startedAt = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (_) {}
}

/**
 * Trigger Windows Toast Notification (click opens terminal with conflict status)
 * Uses registered HKCU protocol to launch Command Prompt upon click
 */
export function sendWindowsNotification(title, message, cwd = process.cwd()) {
  if (process.platform !== 'win32') return;

  const safeTitle = title.replace(/'/g, "''").replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeMessage = message.replace(/'/g, "''").replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeCwd = cwd.replace(/\\/g, '\\\\');

  // Write dedicated launcher script in .git
  const gitDir = path.join(cwd, '.git');
  const launcherPath = path.join(gitDir, 'gatekeeper-show-details.cmd');
  try {
    fs.writeFileSync(
      launcherPath,
      `@echo off\ntitle Angular Gatekeeper - Conflict Details\ncolor 0E\ncd /d "${cwd}"\na-gatekeeper branch check --status\necho.\necho Press any key to close this window...\npause >nul\n`,
      'utf8'
    );
  } catch (e) { }

  const safeLauncher = launcherPath.replace(/\\/g, '\\\\');

  const psScript = `
# Register HKCU protocol for direct activation
try {
    $regPath = "HKCU:\\Software\\Classes\\gatekeeper-details"
    New-Item -Path "$regPath\\shell\\open\\command" -Force | Out-Null
    Set-ItemProperty -Path $regPath -Name "(Default)" -Value "URL:Gatekeeper Protocol"
    Set-ItemProperty -Path $regPath -Name "URL Protocol" -Value ""
    Set-ItemProperty -Path "$regPath\\shell\\open\\command" -Name "(Default)" -Value '\"C:\\Windows\\System32\\cmd.exe\" /c start \"\" \"${safeLauncher}\"'
} catch {}

$appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'
try {
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

    $template = @"
<toast duration="long" launch="gatekeeper-details:">
    <visual>
        <binding template="ToastGeneric">
            <text hint-maxLines="1">${safeTitle}</text>
            <text>${safeMessage}</text>
            <text>👉 Click notification or button to open terminal</text>
        </binding>
    </visual>
    <actions>
        <action content="🔍 View Details in Terminal" arguments="gatekeeper-details:" activationType="protocol"/>
    </actions>
    <audio src="ms-winsoundevent:Notification.Looping.Alarm2" loop="false"/>
</toast>
"@
    $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
    $xml.LoadXml($template)
    $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show($toast)
} catch {
    # Fallback: System Balloon Tip
    try {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        $notify = New-Object System.Windows.Forms.NotifyIcon
        $notify.Icon = [System.Drawing.SystemIcons]::Warning
        $notify.BalloonTipTitle = '${safeTitle}'
        $notify.BalloonTipText = '${safeMessage}'
        $notify.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Warning
        $notify.Visible = $True
        $notify.ShowBalloonTip(8000)
        Start-Sleep -Milliseconds 500
        $notify.Dispose()
    } catch {}
}
`;

  const b64 = Buffer.from(psScript, 'utf16le').toString('base64');

  try {
    execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${b64}`, {
      stdio: 'ignore',
      timeout: 8000,
      windowsHide: true
    });
  } catch (err) {
    try {
      execSync(`powershell.exe -Command "[console]::beep(800, 300)"`, { stdio: 'ignore', windowsHide: true });
    } catch (e) { }
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
 * (Supports LIVE UNCOMMITTED WORKING-TREE EDITS without requiring a commit!)
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

  // 3. CAPTURE ACTIVE LIVE UNCOMMITTED CHANGES IN-MEMORY
  // 'git stash create' returns a commit hash representing current working directory + staged changes
  // without modifying any local files or stash list!
  const uncommittedStateRef = runGit('git stash create', cwd, true) || 'HEAD';
  const hasUncommittedChanges = uncommittedStateRef !== 'HEAD';

  // List locally modified files (working tree + staged)
  const statusOutput = runGit('git status --porcelain', cwd, true);
  const localEditedFiles = statusOutput
    ? statusOutput.split('\n').map(l => l.substring(3).trim()).filter(Boolean)
    : [];

  // 4. Dry-run Merge Conflict Detection using git merge-tree against live uncommitted state
  let hasConflict = false;
  let conflictingFiles = [];
  let mergeTreeOutput = '';

  // Try modern Git merge-tree (--write-tree)
  try {
    const res = execSync(`git merge-tree --write-tree ${uncommittedStateRef} origin/${targetBranch}`, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
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
    const mergeBase = runGit(`git merge-base ${uncommittedStateRef} origin/${targetBranch}`, cwd, true);
    if (mergeBase) {
      const classicOutput = runGit(`git merge-tree ${mergeBase} ${uncommittedStateRef} origin/${targetBranch}`, cwd, true);
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
    hasUncommittedChanges,
    localEditedFiles,
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

  // Prompt for custom interval in minutes
  let intervalMinutes = 15;
  const intervalResponse = await prompts({
    type: 'number',
    name: 'interval',
    message: 'Enter background check interval in minutes (Default: 15):',
    initial: 15,
    min: 1,
    max: 1440,
    validate: value => value >= 1 ? true : 'Interval must be at least 1 minute.'
  });

  if (intervalResponse.interval && intervalResponse.interval >= 1) {
    intervalMinutes = intervalResponse.interval;
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
  console.log(chalk.blue(`\n>>> Launching background ${intervalMinutes}-minute sync monitor daemon...`));

  let execBinary = getEngineBinaryPath();
  let execArgs = [];

  if (path.basename(execBinary).toLowerCase().startsWith('node')) {
    const scriptPath = process.argv[1];
    execArgs = [scriptPath];
  }

  const daemonLogPath = path.join(gitDir, 'gatekeeper-daemon.log');
  const outLog = fs.openSync(daemonLogPath, 'a');
  const errLog = fs.openSync(daemonLogPath, 'a');

  // Spawn detached process with output redirected to daemon log
  const child = spawn(execBinary, execArgs, {
    detached: true,
    stdio: ['ignore', outLog, errLog],
    cwd,
    windowsHide: true,
    env: {
      ...process.env,
      GATEKEEPER_DAEMON_MODE: '1',
      GATEKEEPER_REPO_PATH: cwd,
      GATEKEEPER_TARGET_BRANCH: targetBranch,
      GATEKEEPER_INTERVAL_MINUTES: String(intervalMinutes)
    }
  });

  child.unref();

  const configPath = getWatcherConfigPath(cwd);
  const configData = {
    enabled: true,
    pid: child.pid,
    repoPath: cwd,
    currentBranch,
    targetBranch,
    intervalMinutes,
    startedAt: new Date().toISOString(),
    lastCheckedAt: checkResult.checkedAt,
    hasConflict: checkResult.hasConflict,
    conflictingFiles: checkResult.conflictingFiles,
    behindCount: checkResult.behindCount
  };

  if (configPath) {
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
  }

  // 4. Write .vscode/tasks.json entry for IDE auto-restart on folder open
  setupVSCodeAutoRestart(cwd);
  console.log(chalk.gray('  [Auto-Restart] .vscode/tasks.json configured — watcher will auto-restart when this project is opened in VS Code / Cursor.'));

  console.log(chalk.green.bold('\n═══════════════════════════════════════════════════════════════'));
  console.log(chalk.green.bold(`   ✔ ${intervalMinutes}-MINUTE BACKGROUND BRANCH CONFLICT WATCHER ACTIVATED!   `));
  console.log(chalk.green.bold('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.white(`  • Monitored Branch:  ${chalk.cyan.bold('origin/' + targetBranch)}`));
  console.log(chalk.white(`  • Active Branch:     ${chalk.cyan.bold(currentBranch)}`));
  console.log(chalk.white(`  • Check Interval:    ${chalk.cyan(`Every ${intervalMinutes} Minute(s)`)}`));
  console.log(chalk.white(`  • Background PID:    ${chalk.cyan(child.pid)}`));
  console.log(chalk.white(`  • Auto-Restart:      ${chalk.cyan.bold('ON')} ${chalk.gray('(restarts on VS Code / Cursor folder open)')}`));
  console.log(chalk.magenta('\n  You will receive automatic Windows Desktop Toast alerts'));
  console.log(chalk.magenta(`  whenever new commits on "${targetBranch}" cause conflicts with your work.`));
  console.log(chalk.gray('\n  To stop watcher:     a-gatekeeper branch check --disable'));
  console.log(chalk.gray('  To check status:     a-gatekeeper branch check --status\n'));
}

function isPidAlive(pid) {
  if (!pid) return false;
  try {
    const out = execSync(`powershell -NoProfile -Command "Get-Process -Id ${pid} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    }).trim();
    return out === String(pid);
  } catch (e) {
    return false;
  }
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
    // Mark as explicitly disabled so auto-restart skips this project
    config.enabled = false;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    if (config.pid) {
      try { process.kill(config.pid); } catch (e) {}
    }
    fs.unlinkSync(configPath);
    const alertLog = getAlertLogPath(cwd);
    if (alertLog && fs.existsSync(alertLog)) {
      fs.unlinkSync(alertLog);
    }
    // Remove VS Code auto-restart task
    removeVSCodeAutoRestart(cwd);
    if (!silent) {
      console.log(chalk.green('✔ Branch conflict watcher DISABLED for this repository.'));
      console.log(chalk.gray('  Auto-restart on IDE open has also been removed.'));
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

  let isRunning = isPidAlive(config.pid);

  console.log('\n' + chalk.cyan.bold('┌─────────────────────────────────────────────────────────────┐'));
  console.log(chalk.cyan.bold('│ ') + chalk.bold.white('🌿 BRANCH CONFLICT WATCHER STATUS                          ') + chalk.cyan.bold('│'));
  console.log(chalk.cyan.bold('└─────────────────────────────────────────────────────────────┘\n'));

  console.log(chalk.white(`  • Status:           ${isRunning ? chalk.green.bold('RUNNING (Active in background)') : chalk.red.bold('STOPPED')}`));
  console.log(chalk.white(`  • Background PID:   ${config.pid || 'N/A'}`));
  console.log(chalk.white(`  • Monitored Target: ${chalk.cyan.bold('origin/' + config.targetBranch)}`));
  console.log(chalk.white(`  • Check Interval:   Every ${config.intervalMinutes || 15} minute(s)`));
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
 * Background daemon loop: runs every custom interval (in minutes)
 */
export async function runDaemonLoop(cwd, targetBranch, intervalMinutes = 15) {
  const safeMinutes = parseInt(intervalMinutes, 10) || 15;
  const INTERVAL_MS = safeMinutes * 60 * 1000;
  const daemonLogPath = path.join(cwd, '.git', 'gatekeeper-daemon.log');

  function appendDaemonLog(msg) {
    try {
      fs.appendFileSync(daemonLogPath, `[${new Date().toLocaleString()}] ${msg}\n`, 'utf8');
    } catch (e) { }
  }

  appendDaemonLog(`Background daemon started for origin/${targetBranch} (Interval: ${safeMinutes} min, PID: ${process.pid}).`);

  async function checkCycle() {
    try {
      appendDaemonLog(`Executing conflict check cycle against origin/${targetBranch}...`);
      const result = checkBranchConflicts(cwd, targetBranch);
      const configPath = getWatcherConfigPath(cwd);

      if (configPath && fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          config.lastCheckedAt = result.checkedAt;
          config.hasConflict = result.hasConflict;
          config.conflictingFiles = result.conflictingFiles;
          config.behindCount = result.behindCount;
          config.intervalMinutes = safeMinutes;
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        } catch (e) { }
      }

      // If conflicts detected, trigger Windows Toast Notification
      if (result.hasConflict && result.conflictingFiles.length > 0) {
        const fileList = result.conflictingFiles.slice(0, 3).join(', ') + (result.conflictingFiles.length > 3 ? '...' : '');
        const toastTitle = result.hasUncommittedChanges
          ? '⚠️ Live Conflict in Active Work!'
          : '⚠️ Angular Gatekeeper: Merge Conflict Detected!';
        const toastMessage = `Branch "${result.currentBranch}" conflicts with origin/${targetBranch} in: ${fileList}`;

        appendDaemonLog(`CONFLICT DETECTED in: ${result.conflictingFiles.join(', ')}. Sending Windows toast alert.`);
        sendWindowsNotification(toastTitle, toastMessage, cwd);

        const alertLogPath = getAlertLogPath(cwd);
        if (alertLogPath) {
          const logContent = `[${new Date().toLocaleString()}] LIVE CONFLICT ALERT\n` +
            `Current Branch: ${result.currentBranch}\n` +
            `Target Branch: origin/${targetBranch}\n` +
            `Uncommitted Changes: ${result.hasUncommittedChanges ? 'YES (Live edits detected)' : 'NO'}\n` +
            `Conflicting Files:\n` +
            result.conflictingFiles.map(f => `  - ${f}`).join('\n') +
            `\n\nPlease pull or rebase origin/${targetBranch} to resolve.\n\n`;
          fs.appendFileSync(alertLogPath, logContent, 'utf8');
        }
      } else {
        appendDaemonLog(`Check cycle clean: No conflicts with origin/${targetBranch}.`);
      }
    } catch (cycleErr) {
      appendDaemonLog(`Error in check cycle: ${cycleErr.message || cycleErr}`);
    }
  }

  // Schedule recurring interval and keep process alive
  // Run one immediate check right away, then start the recurring timer
  await checkCycle();
  setInterval(checkCycle, INTERVAL_MS);
}
