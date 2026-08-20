# 🛡️ Angular Git Pre-Commit Quality & AI Gatekeeper

A DevSecOps background Git pre-commit validator and automated AI knowledge gatekeeper built specifically for **Angular** engineering workflows. Packaged into a standalone Windows installer (`AngularGatekeeperSetup.exe` / `FrontendGatekeeperSetup.exe`) and validation binary (`engine.exe`).

---

## 🚀 Key Features (Angular-Specific)

1. **Strictly Pre-Commit Triggered**: Runs automatically whenever you execute `git commit` in any repository. Push is left clean, fast, and direct.
2. **Angular Target Detection**: Verifies `angular.json` and `@angular/core`. Non-Angular repositories (Node backend, React, Python, etc.) are safely and silently bypassed with code `0`.
3. **Angular Architecture & Critical Assets Check**: Ensures essential Angular directory structures and configs (`angular.json`, `package.json`, `tsconfig.json`, `src/`, `src/app/`, `src/index.html`, `src/main.ts`) are intact.
4. **Mandatory Angular Build & TypeScript Compilation Checks**:
   - Automatically runs `npm run build` (or `npx ng build`).
   - Catches all TypeScript compilation errors (`TS2322`, `TS2345`, etc.), Angular template compiler errors, and missing modules before code can be committed.
   - Executes custom scripts (`npm run lint`, `npm run type-check`, `npm run test:ci`) if configured.
5. **Production Build Artifacts Validation (IIS & Web Entry Points)**:
   - Verifies that `dist/` contains valid `index.html` (essential entry point for IIS and web servers).
   - Validates compiled JavaScript bundles (`main.js`, `polyfills.js`, `runtime.js` / chunks).
   - Validates compiled global styles (`styles.css`).
   - Ensures static assets are preserved.
6. **Automated Angular Build Versioning (Staged in Current Commit)**:
   - Automatically increments `src/build-metadata.json` with build number, git commit hash, active branch, and timestamp.
   - Immediately stages `src/build-metadata.json` via `git add` so that the version update is committed **inside the same commit**.
7. **Gemini 2.5 Flash AI Knowledge Base Audit**:
   - Reads `resolved_issues.md` at repo root.
   - Audits staged diff (`git diff --cached`) for RxJS subscription memory leaks, direct DOM manipulation, change detection issues, and violations of your project's documented anti-patterns.
8. **Universal Git Hook Compatibility**:
   - Works seamlessly with GitHub Desktop, Git CLI, Git Bash, VS Code, WebStorm, and Cursor.

---

## 📦 Project Structure

```
ValidatorAgent/
├── src/
│   ├── ascii-art.js      # Angular visual ASCII banners & badge styling
│   ├── engine.js         # Core Angular pre-commit validation engine
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
- Hook script: `%APPDATA%/FrontendGatekeeper/hooks/pre-commit` (Triggered ONLY on commit)
