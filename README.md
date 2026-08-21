# 🛡️ Angular Gatekeeper v2.0

> A DevSecOps pre-commit quality validator, Gemini AI regression auditor, and live background branch conflict monitor — packaged as a standalone Windows executable. No Node.js runtime required.

---

## 🚀 What's New in v2.0

| Feature | Details |
| :--- | :--- |
| **Live Commit Progress Window** | Floating WPF GUI shows each validation step in real time during `git commit` |
| **AI Report Card** | Gemini's full audit response displayed in a scrollable panel |
| **Manual Close Only** | Progress window never auto-closes — you decide when to dismiss |
| **Non-Angular Bypass** | Progress popup and all checks only appear for Angular projects |
| **Auto-Restart on IDE Open** | Branch watcher restarts automatically via `.vscode/tasks.json` when project folder is opened in VS Code / Cursor |
| **Multi-Project Support** | Independent watcher daemon and state per project, run in parallel |
| **Gemini 3.6 Flash Upgrade** | With 3-model automatic fallback chain (`3.6` → `3.5` → `3.5-latest`) |
| **Immediate First Check** | Daemon runs one conflict check instantly on startup, then switches to interval |

---

## 🛡️ Core Features

### 1. Pre-Commit Code Quality & AI Validator
Intercepts every `git commit` in Angular projects and runs **7 validation steps**:

1. **Angular Detection** — Auto-detects Angular projects. Safely bypasses non-Angular repos (Python, Node, etc.) with no popups.
2. **File Integrity Check** — Ensures `tsconfig.json`, `angular.json`, `src/main.ts`, `src/index.html` are present.
3. **Staged-Only Analysis** — Inspects only the files you are committing (fast, under 3 seconds).
4. **TypeScript Compilation** — `tsc --noEmit` to catch type errors and broken imports before they enter Git history.
5. **Angular Architecture Scan** — RxJS memory leaks (`takeUntilDestroyed`), XSS risks (`nativeElement.innerHTML`).
6. **Security Scan** — Detects API keys, passwords, and secrets in staged files.
7. **Gemini 3.6 Flash AI Audit** — Reads `resolved_issues.md` and checks if historical bugs are being reintroduced.

**Live Progress Window** (optional, enabled during install):
- Floating dark-themed WPF window showing each step in real time
- Stays open on error (never auto-closes), shows AI Report Card on success
- Only appears for Angular projects

---

### 2. Live Background Branch Conflict Watcher
Monitors your **uncommitted working edits** against a remote branch every N minutes:

- Uses `git stash create` for a non-destructive in-memory snapshot (your files are never touched)
- Uses `git merge-tree` to simulate a 3-way merge in real time
- Sends a **Windows Desktop Toast Notification + audio chime** when conflicts are detected
- One-click opens a terminal showing the exact conflicting files
- All background processes are completely silent (`windowsHide: true`)
- Runs one immediate check on startup, then switches to the configured interval

---

### 3. Auto-Restart on IDE Open *(New)*
When you enable the watcher, Gatekeeper automatically:
- Creates `.vscode/tasks.json` with a `runOn: "folderOpen"` task
- Sets `"task.allowAutomaticTasks": "on"` in `.vscode/settings.json`

Every time you open the project in VS Code, Cursor, or any compatible IDE, the daemon restarts automatically — no manual action needed. Each project is fully independent and can run alongside other projects simultaneously.

---

## 💻 CLI Commands

```bash
# Pre-Commit Hook
a-gatekeeper enable                    # Enable pre-commit checks in current repo
a-gatekeeper disable                   # Remove pre-commit hook
a-gatekeeper status                    # Check hook status

# Branch Conflict Watcher
a-gatekeeper branch check --enable     # Interactive setup (target branch + interval)
a-gatekeeper branch check --status     # Show daemon status, conflicts, last check
a-gatekeeper branch check --disable    # Stop daemon + remove auto-restart config
```

---

## 📦 Project Structure

```
ValidatorAgent/
│
├── Angular Gatekeeper/                  ← Distribution Package
│   ├── AngularGatekeeperSetup.exe       ← Standalone setup wizard
│   ├── engine.exe                       ← Core engine & background daemon
│   ├── Install.bat                      ← 1-click installer
│   ├── Uninstall.bat                    ← 1-click uninstaller
│   ├── README.md                        ← Full guide (Markdown)
│   └── README.txt                       ← Full guide (Plaintext)
│
├── src/
│   ├── engine.js                        ← Pre-commit engine & CLI router
│   ├── branch-watcher.js                ← Conflict daemon, auto-restart, Toast alerts
│   ├── progress-window.js               ← WPF live progress GUI launcher
│   ├── installer.js                     ← Installer & uninstaller wizards
│   ├── rules/
│   │   ├── ai-prompt.js                 ← Gemini 3.6 Flash AI audit + fallbacks
│   │   ├── angular-best-practices.js    ← Angular architecture rules
│   │   ├── typescript-validator.js      ← TypeScript type-checker
│   │   └── security-rules.js           ← Secret & XSS detection
│   └── utils/
│       ├── git.js                       ← Git command helpers
│       └── logger.js                    ← Chalk-styled terminal output
│
├── build.js                             ← Automated build & pkg packaging
└── package.json
```

---

## 🛠️ Build

```bash
npm run build          # Bundle + compile Windows binaries into "Angular Gatekeeper/"
```

Output:
```
Angular Gatekeeper/
├── AngularGatekeeperSetup.exe   (55 MB standalone installer)
├── engine.exe                   (57 MB standalone engine)
├── Install.bat
├── Uninstall.bat
├── README.md
└── README.txt
```

---

## 📥 Installation

1. Run `AngularGatekeeperSetup.exe` (or double-click `Install.bat`)
2. Enter Gemini API Key *(optional — press Enter to skip)*
3. Choose live progress window preference *(Y/N)*
4. Restart your terminal
5. Run `a-gatekeeper enable` in any Angular project

Full installation and usage guide: [`Angular Gatekeeper/README.md`](Angular%20Gatekeeper/README.md)
