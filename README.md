# 🛡️ Angular Git Pre-Commit Quality & AI Gatekeeper

A DevSecOps background Git pre-commit validator, automated AI knowledge gatekeeper, and **15-Minute Background Branch Conflict Monitor** built specifically for **Angular** engineering workflows. Packaged into a standalone Windows installer (`AngularGatekeeperSetup.exe` / `FrontendGatekeeperSetup.exe`) and validation binary (`engine.exe`).

---

## 🚀 Key Features

1. **Strictly Pre-Commit Triggered**: Runs automatically whenever you execute `git commit` in any repository. Push is left clean, fast, and direct.
2. **🌿 15-Minute Background Branch Conflict Watcher**:
   - Compares your current working branch against a selected remote branch (e.g. `origin/main`, `origin/dev`, `origin/staging`).
   - Runs in-memory dry-run conflict checks (`git merge-tree`) every 15 minutes in the background without modifying any files.
   - Automatically displays **Windows Desktop Toast Notifications** with sound when conflicts or incoming changes are detected.
3. **Angular Target Detection**: Verifies `angular.json` and `@angular/core`. Non-Angular repositories (Node backend, React, Python, etc.) are safely and silently bypassed with code `0`.
4. **Angular Architecture & Critical Assets Check**: Ensures essential Angular directory structures and configs (`angular.json`, `package.json`, `tsconfig.json`, `src/`, `src/app/`, `src/index.html`, `src/main.ts`) are intact.
5. **Mandatory Angular Build & TypeScript Compilation Checks**:
   - Automatically runs `npm run build` (or `npx ng build`).
   - Catches all TypeScript compilation errors (`TS2322`, `TS2345`, etc.), Angular template compiler errors, and missing modules before code can be committed.
   - Executes custom scripts (`npm run lint`, `npm run type-check`, `npm run test:ci`) if configured.
6. **Production Build Artifacts Validation (IIS & Web Entry Points)**:
   - Verifies that `dist/` contains valid `index.html` (essential entry point for IIS and web servers).
   - Validates compiled JavaScript bundles (`main.js`, `polyfills.js`, `runtime.js` / chunks).
   - Validates compiled global styles (`styles.css`).
   - Ensures static assets are preserved.
7. **Automated Angular Build Versioning (Staged in Current Commit)**:
   - Automatically increments `src/build-metadata.json` with build number, git commit hash, active branch, and timestamp.
   - Immediately stages `src/build-metadata.json` via `git add` so that the version update is committed **inside the same commit**.
8. **Gemini 2.5 Flash AI Knowledge Base Audit**:
   - Reads `resolved_issues.md` at repo root.
   - Audits staged diff (`git diff --cached`) for RxJS subscription memory leaks, direct DOM manipulation, change detection issues, and violations of your project's documented anti-patterns.
9. **Universal Git Hook Compatibility**:
   - Works seamlessly with GitHub Desktop, Git CLI, Git Bash, VS Code, WebStorm, and Cursor.

---

## 🎮 Easy Terminal Commands

You can run these commands from any terminal (CMD, PowerShell, Git Bash, VS Code):

### 1. Commit Quality Gatekeeper:
```bash
a-gatekeeper enable          # Enable gatekeeper globally (validates on every commit)
a-gatekeeper disable         # Disable gatekeeper globally (normal git behavior)
a-gatekeeper status          # Check if gatekeeper is on or off
a-gatekeeper bypass          # Show single-commit bypass instruction
```

### 2. 🌿 15-Minute Background Branch Conflict Monitor:
```bash
# 1. Start Conflict Watcher (Fetches branches, prompts for target, checks sync & starts daemon):
a-gatekeeper branch check --enable

# 2. View Watcher Status & Conflict Alerts:
a-gatekeeper branch check --status

# 3. Stop Background Conflict Watcher:
a-gatekeeper branch check --disable
```

---

## 📦 Project Structure

```
ValidatorAgent/
├── src/
│   ├── ascii-art.js      # Angular visual ASCII banners & badge styling
│   ├── branch-watcher.js # 15-minute background branch conflict monitor
│   ├── engine.js         # Core Angular pre-commit validation engine & CLI router
│   └── installer.js      # Interactive CLI setup wizard & PATH config
├── build/                # Bundled CommonJS outputs
├── dist/                 # Standalone compiled Windows binaries
│   ├── engine.exe                    # Gatekeeper binary
│   ├── AngularGatekeeperSetup.exe    # Installer wizard
│   └── FrontendGatekeeperSetup.exe   # Setup alias
├── build.js              # Bundler & pkg binary compilation pipeline
├── package.json
└── README.md
```

---

## 🛠️ Build & Compilation

To build standalone Windows binaries:

```bash
# Bundle ES modules into CJS
npm run build:bundle

# Bundle and compile binaries into dist/
npm run build:exe
```

---

## 💻 Installation

Run `dist/AngularGatekeeperSetup.exe` (or `dist/FrontendGatekeeperSetup.exe`).
The installer prompts for your Google AI Studio Gemini API Key and configures:
- Target directory: `%APPDATA%/FrontendGatekeeper`
- Global Git hook: `%APPDATA%/FrontendGatekeeper/hooks/pre-commit` (COMMIT ONLY)
- CLI Tool: `a-gatekeeper` installed in `%APPDATA%/npm` & User PATH for instant access
