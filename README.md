# 🛡️ Angular Git Quality & AI Gatekeeper

A DevSecOps background Git push validator and automated AI knowledge gatekeeper built specifically for **Angular** engineering workflows. Packaged into a standalone Windows installer (`AngularGatekeeperSetup.exe` / `FrontendGatekeeperSetup.exe`) and push validation binary (`engine.exe`).

---

## 🚀 Key Features (Angular-Specific)

1. **Angular Target Detection**: Verifies `angular.json` and `@angular/core`. Non-Angular repositories (Node backend, React, Python, etc.) are safely and silently bypassed with code `0`.
2. **Remote Sync Verification**: Checks whether your local branch is behind `origin` before pushing, preventing merge conflicts.
3. **Angular Architecture & Critical Assets Check**: Ensures essential Angular directory structures and configs (`angular.json`, `package.json`, `src/`, `src/app/`) are intact.
4. **Code Quality & Type Checks**: Automatically runs Angular linters (`npm run lint`), TypeScript checks (`npm run type-check`), and non-interactive CI tests (`npm run test:ci`).
5. **Automated Angular Build Versioning**: Automatically maintains `src/build-metadata.json` with auto-incrementing build numbers, git commit hashes, active branches, and timestamps.
6. **Gemini 2.5 Flash AI Knowledge Base Audit**:
   - Reads `resolved_issues.md` at repo root.
   - Audits Angular diffs for RxJS subscription memory leaks, direct DOM manipulation, change detection issues, and violations of your project's documented anti-patterns.
7. **Universal Git Hook Compatibility**:
   - Works seamlessly with GitHub Desktop, Git CLI, Git Bash, VS Code, WebStorm, and Cursor.

---

## 📦 Project Structure

```
ValidatorAgent/
├── src/
│   ├── ascii-art.js      # Angular visual ASCII banners & badge styling
│   ├── engine.js         # Core Angular pre-push validation engine
│   └── installer.js      # Interactive CLI setup wizard
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
- Global Git hook: `git config --global core.hooksPath "%APPDATA%/FrontendGatekeeper/hooks"`
