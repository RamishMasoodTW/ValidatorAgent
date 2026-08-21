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
                  ANGULAR GATEKEEPER v2.0 - COMPLETE USER GUIDE
================================================================================
  Platform: Windows 10/11  |  AI: Gemini 3.6 Flash  |  No Node.js Required
================================================================================


--------------------------------------------------------------------------------
 1. WHAT IS ANGULAR GATEKEEPER?
--------------------------------------------------------------------------------
Angular Gatekeeper is an automated developer quality and productivity tool built
for modern frontend and Angular engineering teams.

It provides THREE layers of protection:

  SHIELD 1 - Pre-Commit Gatekeeper
  Intercepts every "git commit", runs TypeScript checks, Angular best-practice
  scans, and a Gemini AI regression audit. Shows live progress in a floating
  window during every commit (Angular projects only).

  SHIELD 2 - Live Background Branch Conflict Watcher
  Runs silently in the background, checking your UNCOMMITTED live edits against
  a remote branch every N minutes. Sends a Windows Toast alert the instant a
  teammate's push would conflict with your work - no commit needed!

  SHIELD 3 - Auto-Restart on IDE Open (NEW in v2.0)
  When you reopen VS Code, Cursor, or any compatible IDE for a project where
  the watcher was enabled, it automatically restarts the background daemon
  without any manual effort.


--------------------------------------------------------------------------------
 2. PACKAGE CONTENTS
--------------------------------------------------------------------------------
  1. AngularGatekeeperSetup.exe   - One-time graphical installer & uninstaller
  2. engine.exe                   - Core background daemon & validation engine
  3. Install.bat                  - 1-click installer launcher
  4. Uninstall.bat                - 1-click uninstaller launcher
  5. README.md                    - Full reference guide (Markdown)
  6. README.txt                   - This plaintext guide


--------------------------------------------------------------------------------
 3. HOW TO INSTALL (ONE-TIME SETUP)
--------------------------------------------------------------------------------
  1. Double-click "Install.bat" (or "AngularGatekeeperSetup.exe").

  2. When prompted for Google AI (Gemini) API Key:
       - (Optional) Enter your Gemini API Key for AI regression audits.
       - OR press [ENTER] to skip. All other features still work fully.

  3. When asked about live progress window:
       - Press [Y] to show a live validation window on every git commit.
       - Press [N] to run silently (terminal output only).

  4. The installer will automatically:
       - Register the global "a-gatekeeper" CLI in your system PATH.
       - Configure Windows Toast notification protocols.

  5. Restart your terminal (CMD, PowerShell, Git Bash, or VS Code terminal).


--------------------------------------------------------------------------------
 4. HOW TO USE IN ANY REPOSITORY
--------------------------------------------------------------------------------

  A) PRE-COMMIT CODE QUALITY VALIDATOR
  -------------------------------------
  Validates every commit in Angular projects against 7 checks:
    1. Angular project detection (auto-bypasses non-Angular repos silently)
    2. Critical file integrity check (tsconfig.json, angular.json, etc.)
    3. Staged-only TypeScript compilation (tsc --noEmit)
    4. Angular best practices scan (RxJS leaks, XSS risks)
    5. Security scan (API keys, passwords in staged files)
    6. Gemini 3.6 Flash AI audit against resolved_issues.md
    7. Final verdict with error details and fix instructions

  Commands:
    a-gatekeeper enable     Install pre-commit hook in current repo
    a-gatekeeper disable    Remove pre-commit hook
    a-gatekeeper status     Check if hook is active

  Works with: GitHub Desktop, Git CLI, Git Bash, VS Code, Cursor, WebStorm.

  LIVE PROGRESS WINDOW (if enabled during install):
    Each commit opens a floating dark-themed window showing steps in real time.
    Window stays open if an error is found. Shows AI Report Card on success.
    Only closes when YOU click [Close] - never auto-closes.
    Only appears for Angular projects (not Python/Node/etc.).


  B) LIVE BACKGROUND BRANCH CONFLICT WATCHER
  -------------------------------------------
  To start monitoring:
    $ a-gatekeeper branch check --enable
      -> Select target branch (e.g. main)
      -> Enter check interval in minutes (e.g. 15)

  How it works:
    - Uses "git stash create" for a non-destructive in-memory snapshot.
      Nothing is written to disk. Your stash list is never touched.
    - Uses "git merge-tree" to simulate a merge against origin/main.
    - If conflicts are found: Windows Toast notification + audio chime.
    - Click the notification to open a terminal showing conflicting files.
    - All background checks are completely silent (no flashing windows).
    - Daemon runs one check immediately on startup, then every N minutes.

  Other commands:
    a-gatekeeper branch check --status    View status, PID, conflicts
    a-gatekeeper branch check --disable   Stop watcher, remove auto-restart


  C) AUTO-RESTART ON IDE OPEN (NEW IN v2.0)
  ------------------------------------------
  When you run "branch check --enable", Gatekeeper automatically:
    - Creates .vscode/tasks.json with a "runOn: folderOpen" task
    - Sets "task.allowAutomaticTasks: on" in .vscode/settings.json

  Every time you open the project in VS Code or Cursor, the daemon restarts
  automatically if the watcher is enabled. Silent exit if disabled.

  MULTI-PROJECT SUPPORT:
    Each project has its own independent config, daemon, and VS Code task.
    Multiple projects can run simultaneously at different intervals and targets.
    Enabling in one project does not affect any other project.


--------------------------------------------------------------------------------
 5. CONFIGURATION FILES (managed automatically)
--------------------------------------------------------------------------------
  %APPDATA%\\FrontendGatekeeper\\.env              Gemini API Key & prefs
  {project}\\.git\\gatekeeper-branch-watcher.json  Watcher state per project
  {project}\\.git\\gatekeeper-daemon.log           Daemon activity log
  {project}\\.git\\gatekeeper-conflict-alert.log   Conflict history log
  {project}\\.vscode\\tasks.json                   VS Code auto-restart task
  {project}\\.vscode\\settings.json                allowAutomaticTasks setting


--------------------------------------------------------------------------------
 6. COMPLETE CLI REFERENCE
--------------------------------------------------------------------------------

  PRE-COMMIT HOOK:
    a-gatekeeper enable                     Install pre-commit hook
    a-gatekeeper disable                    Remove pre-commit hook
    a-gatekeeper status                     Check hook status

  BRANCH CONFLICT WATCHER:
    a-gatekeeper branch check --enable      Interactive enable (branch + interval)
    a-gatekeeper branch check --status      Show live daemon status + conflicts
    a-gatekeeper branch check --disable     Stop daemon + remove auto-restart


--------------------------------------------------------------------------------
 7. WHAT'S NEW IN VERSION 2.0
--------------------------------------------------------------------------------
  [NEW] Live Commit Progress Window  - Floating WPF GUI on every git commit
  [NEW] AI Report Card               - Gemini audit shown in scrollable panel
  [NEW] Manual Close Only            - Progress window never auto-closes
  [NEW] Non-Angular Bypass           - No popups on Python/Node/non-Angular repos
  [NEW] Auto-Restart on IDE Open     - .vscode/tasks.json auto-restarts daemon
  [NEW] Multi-Project Support        - Independent watcher per project, parallel
  [NEW] Gemini 3.6 Flash Upgrade     - With 3-model automatic fallback chain
  [NEW] Immediate First Check        - Daemon checks instantly on startup


--------------------------------------------------------------------------------
 8. HOW TO UNINSTALL
--------------------------------------------------------------------------------
  1. Double-click "Uninstall.bat" (or run AngularGatekeeperSetup.exe --uninstall)
  2. Confirm by pressing [Y] and [Enter].
  3. All background processes, hooks, PATH entries, and configurations removed.


================================================================================
   Angular Gatekeeper v2.0 | For updates, refer to the project repository.
================================================================================
`;
}

function generateReadmeMd() {
  const enginePath = process.env.APPDATA
    ? `${process.env.APPDATA}\\FrontendGatekeeper\\engine.exe`
    : '%APPDATA%\\FrontendGatekeeper\\engine.exe';

  return `# 🛡️ Angular Gatekeeper
## Complete Guide & Reference Manual

> **Version:** 2.0 &nbsp;|&nbsp; **Platform:** Windows 10/11 &nbsp;|&nbsp; **AI:** Gemini 3.6 Flash

---

## 📌 1. What is Angular Gatekeeper?

**Angular Gatekeeper** is an automated developer quality and productivity tool built specifically for modern frontend and Angular engineering teams.

It acts as a **triple-shield safety net** on your machine:

| Shield | What it does |
| :--- | :--- |
| **🛡️ Pre-Commit Gatekeeper** | Intercepts every \`git commit\`, runs TypeScript checks, Angular best-practice scans, and a Gemini AI regression audit — all shown in a live animated progress window |
| **🌿 Branch Conflict Watcher** | Runs silently in the background, checking your **uncommitted live edits** against a remote branch every N minutes. Sends a Windows Toast alert the instant a teammate's push would conflict with your work |
| **🔁 Auto-Restart on IDE Open** | When you reopen VS Code, Cursor, or any compatible IDE for a project where the watcher was enabled, it **automatically restarts the background daemon** without any manual effort |

---

## 🚀 2. Core Features Breakdown

\`\`\`
Angular Gatekeeper Suite
│
├─ 1. Pre-Commit Quality & AI Validator
│    ├─ Angular Project Auto-Detection & Safe Bypass
│    ├─ Critical File & Config Integrity Check
│    ├─ Strict TypeScript Compilation (tsc --noEmit)
│    ├─ Angular Best Practices & Security Scanning
│    ├─ Live Commit Progress Window (WPF GUI)
│    └─ Gemini 3.6 Flash AI Regression Audit + Report Card
│
├─ 2. Live Background Branch Conflict Watcher
│    ├─ Uncommitted Live Edits In-Memory Snapshot
│    ├─ In-Memory 3-Way Merge Test (git merge-tree)
│    ├─ Customizable Timer Interval (e.g. 1m, 15m)
│    ├─ Windows Desktop Toast Notification + Audio Chime
│    └─ One-Click Terminal Conflict Inspector
│
└─ 3. Auto-Restart on IDE Open (New in v2.0)
     ├─ Per-Project Independent State
     ├─ .vscode/tasks.json Auto-Generated on Enable
     ├─ Multi-Project Simultaneous Support
     └─ Silent Exit When Watcher is Disabled
\`\`\`

---

## 🛡️ 3. Feature A — Pre-Commit Code Quality & AI Validator

Whenever you run \`git commit\`, Gatekeeper intercepts the process and runs **7 validation steps**:

| Step | Check | Details |
| :--- | :--- | :--- |
| 1 | **Angular Detection** | Auto-detects Angular. Safely bypasses non-Angular repos (Python, Node, etc.) with no popups |
| 2 | **File Integrity** | Ensures \`tsconfig.json\`, \`angular.json\`, \`src/main.ts\`, \`src/index.html\` are present |
| 3 | **Staged-Only Analysis** | Inspects only the files you are committing — fast, under 3 seconds |
| 4 | **TypeScript Compilation** | \`tsc --noEmit\` to catch type errors and broken imports before they enter Git history |
| 5 | **Architecture Scan** | RxJS memory leaks (\`takeUntilDestroyed\`), XSS risks (\`nativeElement.innerHTML\`) |
| 6 | **Security Scan** | Detects API keys, passwords, and secrets in staged files |
| 7 | **Gemini AI Audit** | Reads \`resolved_issues.md\` and flags if historical bugs are being reintroduced |

### 🖥️ Live Commit Progress Window (WPF GUI)

During install, the wizard asks: **"Show live progress window during validation? [Y/N]"**

If **Yes** is selected, every \`git commit\` in an Angular project launches a floating dark-themed progress window:

\`\`\`
╔═══════════════════════════════════════════════════╗
║   🛡️  Angular Gatekeeper — Live Validation         ║
╠═══════════════════════════════════════════════════╣
║  ✔  Angular project detected                      ║
║  ✔  File integrity verified                       ║
║  ✔  TypeScript compilation passed                 ║
║  ⟳  Architecture & security scan...               ║
║  ○  AI Knowledge Base Audit (pending)             ║
╠═══════════════════════════════════════════════════╣
║  📋 AI Report Card                                ║
║  No issues detected in staged changes.            ║
╠═══════════════════════════════════════════════════╣
║                  [ Close ]                        ║
╚═══════════════════════════════════════════════════╝
\`\`\`

- ✅ Steps light up green as they complete in real time
- ❌ If any step fails, the window **stays open** — it does **not** auto-close
- 📋 AI Report Card from Gemini displayed in a scrollable panel on success
- 🖱️ Window only closes when you click **[ Close ]** — never automatically
- Only appears for **Angular projects** — non-Angular repos have zero interruption

---

## 🌿 4. Feature B — Live Background Branch Conflict Watcher

Monitors your **uncommitted working edits** against a remote branch every N minutes.

### How It Works

\`\`\`
Your Working Tree (uncommitted edits)
         │
         ▼
  git stash create  ──►  In-memory snapshot (no disk changes, no stash entry)
         │
         ▼
  git merge-tree  ──►  Dry-run merge simulation against origin/main
         │
    ┌────┴────┐
    │         │
   CLEAN    CONFLICT
    │         │
  Log it   Windows Desktop Toast + Audio Chime + Terminal Inspector
\`\`\`

**Key capabilities:**
- **No Commit Required** — \`git stash create\` takes a non-destructive in-memory snapshot. Files and stash list are never touched.
- **Silent Background** — All checks run with \`windowsHide: true\`. Zero flashing console windows.
- **Immediate First Check** — Daemon checks instantly on startup, then switches to the configured interval.
- **One-Click Terminal Inspector** — Clicking the Toast notification opens a dedicated terminal showing conflicting files.

---

## 🔁 5. Feature C — Auto-Restart on IDE Open *(New in v2.0)*

When you enable the watcher (\`--enable\`), Gatekeeper automatically:

1. Writes \`.vscode/tasks.json\` with a \`runOn: "folderOpen"\` task (merged, existing tasks kept)
2. Sets \`"task.allowAutomaticTasks": "on"\` in \`.vscode/settings.json\` (no VS Code permission prompt)

**Every time you open the project in VS Code or Cursor, the daemon restarts silently if enabled.**

\`\`\`
VS Code opens project folder
         │
         ▼
.vscode/tasks.json fires  →  engine.exe branch watch --auto-restart
         │
    ┌────┴──────────────────┐
    │                       │
Watcher ENABLED?        Watcher DISABLED?
    │                       │
Daemon alive? ──NO──► Spawn fresh daemon    Silent exit (no output)
    │                 + Immediate check
   YES                + Start interval
    │
   Skip (already running)
\`\`\`

**On \`--disable\`:** Both \`tasks.json\` and \`settings.json\` are cleaned up. No leftover configuration.

### Multi-Project Support

| Project | Config | Task | Daemon |
| :--- | :--- | :--- | :--- |
| \`Agent-Web-App-TW\` | \`.git/gatekeeper-branch-watcher.json\` | \`.vscode/tasks.json\` | Independent PID |
| \`OtherAngularApp\` | \`.git/gatekeeper-branch-watcher.json\` | \`.vscode/tasks.json\` | Independent PID |
| \`ThirdProject\` | *(Not enabled)* | *(Not created)* | *(Not running)* |

Each project is **fully isolated** — enabling one has zero effect on others.

---

## 💎 6. Core Benefits

| Challenge | How Angular Gatekeeper Solves It |
| :--- | :--- |
| **Painful PR Conflicts** | Detects merge conflicts in real time while you code — rebase immediately |
| **Recurring Bugs** | AI audits code against \`resolved_issues.md\` every commit |
| **Senior Engineer Burnout** | Automates RxJS leaks, architecture validation, type checking |
| **Broken CI/CD Builds** | Stops type errors and bad imports before they enter Git |
| **Junior Dev Mentorship** | Explains *why* a pattern failed and *how* to fix it |
| **Setup Headaches** | Standalone Windows .exe — no Node.js runtime required |
| **Forgetting to Start Watcher** | Auto-restarts on every IDE open |

---

## 💻 7. Complete CLI Reference

### Pre-Commit Hook

| Command | Description |
| :--- | :--- |
| \`a-gatekeeper enable\` | Install pre-commit hook in current repository |
| \`a-gatekeeper disable\` | Remove pre-commit hook |
| \`a-gatekeeper status\` | Check if hook is active |

*Compatible with: GitHub Desktop, Git CLI, Git Bash, VS Code, WebStorm, Cursor, IntelliJ*

### Branch Conflict Watcher

| Command | Description |
| :--- | :--- |
| \`a-gatekeeper branch check --enable\` | Interactive setup: target branch + interval. Starts daemon + auto-restart |
| \`a-gatekeeper branch check --status\` | Daemon status, PID, branch, last check, conflicts |
| \`a-gatekeeper branch check --disable\` | Stop daemon + remove auto-restart config |

---

## 📥 8. Installation Guide

### Step 1 — Run the Installer

1. Double-click **\`Install.bat\`** (or **\`AngularGatekeeperSetup.exe\`**)
2. Enter **Gemini API Key** *(optional — press Enter to skip)*
3. Choose **live progress window** preference *(Y recommended)*
4. **Restart your terminal**

### Step 2 — Enable in a Project

\`\`\`bash
cd D:\\path\\to\\your-angular-project
a-gatekeeper enable                    # Pre-commit protection
a-gatekeeper branch check --enable    # Background conflict monitoring
\`\`\`

After enabling the watcher:

\`\`\`
═══════════════════════════════════════════════════════════════
   ✔ 15-MINUTE BACKGROUND BRANCH CONFLICT WATCHER ACTIVATED!
═══════════════════════════════════════════════════════════════
  • Monitored Branch:  origin/main
  • Active Branch:     feature/my-feature
  • Check Interval:    Every 15 Minute(s)
  • Background PID:    14872
  • Auto-Restart:      ON (restarts on VS Code / Cursor folder open)
\`\`\`

### Step 3 — Verify

\`\`\`bash
a-gatekeeper status                    # Pre-commit hook active?
a-gatekeeper branch check --status    # Watcher daemon running?
\`\`\`

### Step 4 — Uninstall

\`\`\`bash
# Double-click Uninstall.bat  OR:
AngularGatekeeperSetup.exe --uninstall
\`\`\`

---

## 🔧 9. Configuration Files

| File | Location | Purpose |
| :--- | :--- | :--- |
| \`.env\` | \`%APPDATA%\\\\FrontendGatekeeper\\\\.env\` | Gemini API Key and display preferences |
| \`gatekeeper-branch-watcher.json\` | \`{project}\\\\.git\\\\\` | Per-project watcher state |
| \`gatekeeper-daemon.log\` | \`{project}\\\\.git\\\\\` | Daemon activity log |
| \`gatekeeper-conflict-alert.log\` | \`{project}\\\\.git\\\\\` | Conflict history |
| \`tasks.json\` | \`{project}\\\\.vscode\\\\\` | VS Code auto-restart task |
| \`settings.json\` | \`{project}\\\\.vscode\\\\\` | \`task.allowAutomaticTasks: on\` |

---

## ❓ 10. Frequently Asked Questions

**Q: Does this work on non-Angular projects?**
Pre-commit checks and progress popup only trigger for Angular projects. Non-Angular repos bypass completely. The branch watcher works on any Git repository.

**Q: No Gemini API Key?**
All features except the AI audit work. The AI step is skipped gracefully.

**Q: Will it slow commits?**
Typically 3–8 seconds. The progress window shows exactly which step is running.

**Q: Can two projects run the watcher simultaneously?**
Yes. Each project has its own independent daemon and auto-restart config.

**Q: What if I restart my PC?**
Next time you open the project in VS Code or Cursor, the daemon restarts automatically.

**Q: What AI model does Gatekeeper use?**
Gemini 3.6 Flash (primary) → Gemini 3.5 Flash → Gemini 3.5 Flash Latest (fallback chain).

**Q: Does \`.vscode/tasks.json\` affect teammates without Gatekeeper?**
The task points to your local \`engine.exe\` in \`%APPDATA%\`. Team members without Gatekeeper see the task fail silently — no errors, no impact on their workflow.

---

## ✨ 11. What's New in Version 2.0

| Feature | Details |
| :--- | :--- |
| **Live Commit Progress Window** | Floating WPF GUI shows each validation step in real time |
| **AI Report Card** | Gemini's full audit shown in a scrollable panel |
| **Manual Close Only** | Progress window never auto-closes |
| **Non-Angular Bypass** | No popups or checks on non-Angular repos |
| **Auto-Restart on IDE Open** | Branch watcher auto-restarts via \`.vscode/tasks.json\` |
| **Multi-Project Support** | Independent watcher per project, run in parallel |
| **Gemini 3.6 Flash Upgrade** | With 3-model automatic fallback chain |
| **Immediate First Check** | Daemon checks instantly on startup |

---

*Angular Gatekeeper v2.0 — For support or updates, refer to the ValidatorAgent project repository.*
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

  // 4. Create package extras (README.txt, README.md, Install.bat, Uninstall.bat)
  console.log('\n>>> [3/3] Generating Release Package & Documentation...');

  // README.txt — plaintext for all audiences
  fs.writeFileSync(path.join(outputFolder, 'README.txt'), generateReadme(), 'utf8');
  console.log('  ✔ Generated: Angular Gatekeeper/README.txt');

  // README.md — full markdown reference (only if not already manually edited)
  const readmeMdPath = path.join(outputFolder, 'README.md');
  const existingMd = fs.existsSync(readmeMdPath) ? fs.readFileSync(readmeMdPath, 'utf8') : '';
  // Only regenerate if file is empty, missing, or still contains the old plaintext header
  if (!existingMd || existingMd.startsWith('================') || existingMd.length < 500) {
    fs.writeFileSync(readmeMdPath, generateReadmeMd(), 'utf8');
    console.log('  ✔ Generated: Angular Gatekeeper/README.md');
  } else {
    console.log('  ✔ Kept existing: Angular Gatekeeper/README.md (custom content preserved)');
  }

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
