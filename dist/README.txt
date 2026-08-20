================================================================================
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
A. PRE-COMMIT CODE QUALITY VALIDATOR:
   To protect your repository against broken TypeScript, Angular anti-patterns,
   and secret leaks on every 'git commit':

   $ a-gatekeeper enable    (Installs pre-commit gatekeeper in current repo)
   $ a-gatekeeper disable   (Removes pre-commit hook)
   $ a-gatekeeper status    (Checks hook status)
   Works with GitHub Desktop, Git CLI, Git Bash, VS Code, WebStorm, and Cursor.

B. LIVE BACKGROUND BRANCH CONFLICT WATCHER (Zero Commit Needed):
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
