# 🛡️ Frontend Git Quality & AI Gatekeeper

A DevSecOps background Git push validator and automated AI knowledge gatekeeper for frontend engineering workflows. Packaged into a standalone Windows installer (`FrontendGatekeeperSetup.exe`) and push validation binary (`engine.exe`).

---

## 🚀 Key Features

1. **Target Detection**: Detects Node.js frontend repositories via `package.json` and cleanly bypasses non-Node projects.
2. **Remote Sync Verification**: Checks whether your branch is behind `origin` before pushing, preventing merge conflicts.
3. **Critical Assets & Structure Validation**: Ensures essential frontend files (`index.html`, `package.json`, `src/`) are present.
4. **Code Quality & Type Checks**: Automatically executes `npm run type-check`, `npm run lint`, and `npm run test` (if defined in `package.json`).
5. **Automated Build Versioning**: Automatically maintains `src/build-metadata.json` with auto-incrementing build numbers, git commit hashes, branch info, and timestamps.
6. **AI Knowledge Base Audit (Gemini 2.5 Flash)**: Reads `resolved_issues.md` at repo root, extracts the git diff, and queries Google Gemini 2.5 Flash to ensure previous bugs, forbidden patterns, and anti-patterns are not reintroduced.
7. **Cross-Platform Git Hook Support**: Pre-configured global Git hook compatible with:
   - Git CLI & Git Bash
   - GitHub Desktop
   - VS Code, IntelliJ, Cursor, and WebStorm

---

## 📦 Project Structure

```
ValidatorAgent/
├── src/
│   ├── ascii-art.js      # Visual ASCII banners & badge styling
│   ├── engine.js         # Core pre-push validation engine
│   └── installer.js      # Interactive CLI setup wizard
├── build/                # Bundled CommonJS outputs
├── dist/                 # Standalone compiled Windows binaries
│   ├── engine.exe                    # Gatekeeper binary
│   └── FrontendGatekeeperSetup.exe   # Standalone Installer wizard
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

Run `dist/FrontendGatekeeperSetup.exe` or execute:
```bash
node src/installer.js
```
The installer prompts for your Google AI Studio Gemini API Key and configures:
- Target directory: `%APPDATA%/FrontendGatekeeper`
- Global Git hook: `git config --global core.hooksPath "%APPDATA%/FrontendGatekeeper/hooks"`
