================================================================================
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
  %APPDATA%\FrontendGatekeeper\.env              Gemini API Key & prefs
  {project}\.git\gatekeeper-branch-watcher.json  Watcher state per project
  {project}\.git\gatekeeper-daemon.log           Daemon activity log
  {project}\.git\gatekeeper-conflict-alert.log   Conflict history log
  {project}\.vscode\tasks.json                   VS Code auto-restart task
  {project}\.vscode\settings.json                allowAutomaticTasks setting


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
