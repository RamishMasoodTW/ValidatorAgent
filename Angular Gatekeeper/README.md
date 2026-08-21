# 🛡️ Angular Gatekeeper
## Complete Guide & Reference Manual

> **Version:** 2.0 &nbsp;|&nbsp; **Platform:** Windows 10/11 &nbsp;|&nbsp; **AI:** Gemini 3.6 Flash

---

## 📌 1. What is Angular Gatekeeper?

**Angular Gatekeeper** is an automated developer quality and productivity tool built specifically for modern frontend and Angular engineering teams.

It acts as a **triple-shield safety net** on your machine:

| Shield | What it does |
| :--- | :--- |
| **🛡️ Pre-Commit Gatekeeper** | Intercepts every `git commit`, runs TypeScript checks, Angular best-practice scans, and a Gemini AI regression audit — all shown in a live animated progress window |
| **🌿 Branch Conflict Watcher** | Runs silently in the background, checking your **uncommitted live edits** against a remote branch every N minutes. Sends a Windows Toast alert the instant a teammate's push would conflict with your work |
| **🔁 Auto-Restart on IDE Open** | When you reopen VS Code, Cursor, or any compatible IDE for a project where the watcher was enabled, it **automatically restarts the background daemon** without any manual effort |

---

## 🚀 2. Core Features Breakdown

```
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
```

---

## 🛡️ 3. Feature A — Pre-Commit Code Quality & AI Validator

Whenever you run `git commit`, Gatekeeper intercepts the process and runs **7 validation steps**:

| Step | Check | Details |
| :--- | :--- | :--- |
| 1 | **Angular Detection** | Auto-detects Angular. Safely bypasses non-Angular repos (Python, Node, etc.) with no popups |
| 2 | **File Integrity** | Ensures `tsconfig.json`, `angular.json`, `src/main.ts`, `src/index.html` are present |
| 3 | **Staged-Only Analysis** | Inspects only the files you are committing — fast, under 3 seconds |
| 4 | **TypeScript Compilation** | `tsc --noEmit` to catch type errors and broken imports before they enter Git history |
| 5 | **Architecture Scan** | RxJS memory leaks (`takeUntilDestroyed`), XSS risks (`nativeElement.innerHTML`) |
| 6 | **Security Scan** | Detects API keys, passwords, and secrets in staged files |
| 7 | **Gemini AI Audit** | Reads `resolved_issues.md` and flags if historical bugs are being reintroduced |

### 🖥️ Live Commit Progress Window (WPF GUI)

During install, the wizard asks: **"Show live progress window during validation? [Y/N]"**

If **Yes** is selected, every `git commit` in an Angular project launches a floating dark-themed progress window:

```
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
```

- ✅ Steps light up green as they complete in real time
- ❌ If any step fails, the window **stays open** — it does **not** auto-close
- 📋 AI Report Card from Gemini displayed in a scrollable panel on success
- 🖱️ Window only closes when you click **[ Close ]** — never automatically
- Only appears for **Angular projects** — non-Angular repos have zero interruption

---

## 🌿 4. Feature B — Live Background Branch Conflict Watcher

Monitors your **uncommitted working edits** against a remote branch every N minutes.

### How It Works

```
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
```

**Key capabilities:**
- **No Commit Required** — `git stash create` takes a non-destructive in-memory snapshot. Files and stash list are never touched.
- **Silent Background** — All checks run with `windowsHide: true`. Zero flashing console windows.
- **Immediate First Check** — Daemon checks instantly on startup, then switches to the configured interval.
- **One-Click Terminal Inspector** — Clicking the Toast notification opens a dedicated terminal showing conflicting files.

---

## 🔁 5. Feature C — Auto-Restart on IDE Open *(New in v2.0)*

When you enable the watcher (`--enable`), Gatekeeper automatically:

1. Writes `.vscode/tasks.json` with a `runOn: "folderOpen"` task (merged, existing tasks kept)
2. Sets `"task.allowAutomaticTasks": "on"` in `.vscode/settings.json` (no VS Code permission prompt)

**Every time you open the project in VS Code or Cursor, the daemon restarts silently if enabled.**

```
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
```

**On `--disable`:** Both `tasks.json` and `settings.json` are cleaned up. No leftover configuration.

### Multi-Project Support

| Project | Config | Task | Daemon |
| :--- | :--- | :--- | :--- |
| `Agent-Web-App-TW` | `.git/gatekeeper-branch-watcher.json` | `.vscode/tasks.json` | Independent PID |
| `OtherAngularApp` | `.git/gatekeeper-branch-watcher.json` | `.vscode/tasks.json` | Independent PID |
| `ThirdProject` | *(Not enabled)* | *(Not created)* | *(Not running)* |

Each project is **fully isolated** — enabling one has zero effect on others.

---

## 💎 6. Core Benefits

| Challenge | How Angular Gatekeeper Solves It |
| :--- | :--- |
| **Painful PR Conflicts** | Detects merge conflicts in real time while you code — rebase immediately |
| **Recurring Bugs** | AI audits code against `resolved_issues.md` every commit |
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
| `a-gatekeeper enable` | Install pre-commit hook in current repository |
| `a-gatekeeper disable` | Remove pre-commit hook |
| `a-gatekeeper status` | Check if hook is active |

*Compatible with: GitHub Desktop, Git CLI, Git Bash, VS Code, WebStorm, Cursor, IntelliJ*

### Branch Conflict Watcher

| Command | Description |
| :--- | :--- |
| `a-gatekeeper branch check --enable` | Interactive setup: target branch + interval. Starts daemon + auto-restart |
| `a-gatekeeper branch check --status` | Daemon status, PID, branch, last check, conflicts |
| `a-gatekeeper branch check --disable` | Stop daemon + remove auto-restart config |

---

## 📥 8. Installation Guide

### Step 1 — Run the Installer

1. Double-click **`Install.bat`** (or **`AngularGatekeeperSetup.exe`**)
2. Enter **Gemini API Key** *(optional — press Enter to skip)*
3. Choose **live progress window** preference *(Y recommended)*
4. **Restart your terminal**

### Step 2 — Enable in a Project

```bash
cd D:\path\to\your-angular-project
a-gatekeeper enable                    # Pre-commit protection
a-gatekeeper branch check --enable    # Background conflict monitoring
```

After enabling the watcher:

```
═══════════════════════════════════════════════════════════════
   ✔ 15-MINUTE BACKGROUND BRANCH CONFLICT WATCHER ACTIVATED!
═══════════════════════════════════════════════════════════════
  • Monitored Branch:  origin/main
  • Active Branch:     feature/my-feature
  • Check Interval:    Every 15 Minute(s)
  • Background PID:    14872
  • Auto-Restart:      ON (restarts on VS Code / Cursor folder open)
```

### Step 3 — Verify

```bash
a-gatekeeper status                    # Pre-commit hook active?
a-gatekeeper branch check --status    # Watcher daemon running?
```

### Step 4 — Uninstall

```bash
# Double-click Uninstall.bat  OR:
AngularGatekeeperSetup.exe --uninstall
```

---

## 🔧 9. Configuration Files

| File | Location | Purpose |
| :--- | :--- | :--- |
| `.env` | `%APPDATA%\\FrontendGatekeeper\\.env` | Gemini API Key and display preferences |
| `gatekeeper-branch-watcher.json` | `{project}\\.git\\` | Per-project watcher state |
| `gatekeeper-daemon.log` | `{project}\\.git\\` | Daemon activity log |
| `gatekeeper-conflict-alert.log` | `{project}\\.git\\` | Conflict history |
| `tasks.json` | `{project}\\.vscode\\` | VS Code auto-restart task |
| `settings.json` | `{project}\\.vscode\\` | `task.allowAutomaticTasks: on` |

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

**Q: Does `.vscode/tasks.json` affect teammates without Gatekeeper?**
The task points to your local `engine.exe` in `%APPDATA%`. Team members without Gatekeeper see the task fail silently — no errors, no impact on their workflow.

---

## ✨ 11. What's New in Version 2.0

| Feature | Details |
| :--- | :--- |
| **Live Commit Progress Window** | Floating WPF GUI shows each validation step in real time |
| **AI Report Card** | Gemini's full audit shown in a scrollable panel |
| **Manual Close Only** | Progress window never auto-closes |
| **Non-Angular Bypass** | No popups or checks on non-Angular repos |
| **Auto-Restart on IDE Open** | Branch watcher auto-restarts via `.vscode/tasks.json` |
| **Multi-Project Support** | Independent watcher per project, run in parallel |
| **Gemini 3.6 Flash Upgrade** | With 3-model automatic fallback chain |
| **Immediate First Check** | Daemon checks instantly on startup |

---

*Angular Gatekeeper v2.0 — For support or updates, refer to the ValidatorAgent project repository.*
