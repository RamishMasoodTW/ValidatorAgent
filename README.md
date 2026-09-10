# 🛡️ Angular Gatekeeper v3.0

> Enterprise-Grade All-in-One Pre-Commit Gatekeeper, 100-Point Pre-Flight Readiness Engine, and Live Background Branch Conflict Monitor — packaged as a standalone Windows executable with zero external runtime dependencies.

---

## 🚀 Overview

**Angular Gatekeeper** intercepts every local `git commit` and runs an exhaustive **8-step quality, security, architecture, production build, and AI regression audit** directly on your workstation before any code enters Git history.

By catching defects, dependency CVEs, secret leaks, breaking TypeScript errors, and production configuration flaws **at the pre-commit stage**, Gatekeeper ensures that code pushed to remote repositories is guaranteed to be clean, deployable, and compliant with CI/CD pipeline requirements.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 ALL-IN-ONE PRE-COMMIT VERIFICATION PIPELINE                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  git commit ➔ Intercepted by Global Hook ➔ Live WPF Progress Window         │
│  ├── 1. Angular Framework Detection & Safe Bypass                          │
│  ├── 2. Critical Architecture, Entry Points & Lockfile Synchronization      │
│  ├── 3. Dependency CVE Security Audit (npm audit --audit-level=high)        │
│  ├── 4. Strict TypeScript Compilation (tsc --noEmit) & ESLint Verification  │
│  ├── 5. Headless Automated Unit Tests Runner (Vitest / Jest / Karma)        │
│  ├── 6. Production Bundle Compilation (ng build) & CD Distribution Audit    │
│  ├── 7. Security & Secret Leak Scanner (30+ Token Patterns & Bloat Scan)    │
│  └── 8. AI Knowledge Base Regression Audit (Gemini 3.8 / 3.7 Flash)         │
│                                                                             │
│  🎯 100-Point Deterministic Quality Scorecard Calculated & Stamped          │
│  ✔ Pass: Commit created cleanly  |  ✖ Fail: Transaction safely aborted      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 100-Point Pre-Flight Quality Rubric

Gatekeeper evaluates every commit against a **deterministic, transparent 100-point rubric** across 5 core engineering pillars, replacing arbitrary marketing percentages with verifiable metrics:

| Pillar | Max Points | Key Criteria Evaluated |
| :--- | :---: | :--- |
| **🛡️ 1. Security & Hygiene Gate** | **25 pts** | • **Zero Leaked Credentials (10 pts)**: Scans diff against 30+ secret patterns.<br>• **Conflict Markers & Oversized Files (5 pts)**: Blocks `<<<<<<< HEAD`, `.env`, and files >10MB.<br>• **Lockfile Sync (5 pts)**: Blocks staging `package.json` without `package-lock.json` (`npm ci` safe).<br>• **Cleanroom Staging Drift (5 pts)**: Verifies staged files match active disk state. |
| **⚡ 2. Static Analysis & Type Safety** | **25 pts** | • **Strict TypeScript (15 pts)**: `tsc --noEmit --skipLibCheck` with zero compilation errors.<br>• **Angular Linter (10 pts)**: Full project linter verification with captured diagnostics. |
| **🏗️ 3. Architecture & Linux Parity** | **20 pts** | • **Linux CI Case-Sensitive Imports (10 pts)**: Scans relative imports against physical disk casing to prevent Windows-vs-Linux CI crashes.<br>• **Circular Dependency DFS (5 pts)**: Directed graph traversal to stop runtime DI deadlocks.<br>• **Template Security & Safe DOM (5 pts)**: Scans for unsanitized `[innerHTML]` and direct DOM mutations. |
| **🧪 4. Regression & Test Health** | **15 pts** | • **Unit Test Execution (10 pts)**: Headless runner execution (`npm run test:ci`).<br>• **Test Spec Availability (5 pts)**: Validates active `*.spec.ts` files (honest 0 pts if no specs exist). |
| **🚢 5. Production & CD Readiness** | **15 pts** | • **Zero Localhost/HTTP Leaks (5 pts)**: Scans `environment.prod.ts` for `localhost` or unencrypted `http://`.<br>• **SPA Deep-Route Server Rewrite (5 pts)**: Verifies `web.config`, `nginx.conf`, `_redirects`, or cloud rewrite rules.<br>• **Bundle Sizing & Gzip Budgets (5 pts)**: Native `zlib` transfer calculation (<5MB raw / <1.5MB gzip). |
| **🎯 TOTAL PRE-FLIGHT SCORE** | **100 pts** | **Grade Thresholds**: `A+` (95–100), `A` (90–94), `B` (80–89), `C` (70–79), `F` (<70) |

---

## ⚙️ The 8 Pre-Commit Pipeline Steps

Whenever you run `git commit`, Gatekeeper executes **8 sequential pipeline steps** defined in `src/engine.js`:

1. **Angular Project Detection** — Verifies `angular.json` and `@angular/core`. Bypasses non-Angular repos silently with zero popup interruption.
2. **Critical Architecture & Entry Points** — Verifies `tsconfig.json`, `src/main.ts`, entry selectors (`<app-root>`), lockfile synchronization, Linux case-sensitivity, circular dependencies, and cleanroom staging drift.
3. **Dependency Vulnerability Audit** — Executes `npm audit --audit-level=high` to block packages containing High or Critical CVEs.
4. **TypeScript & Lint Verification** — Strict type-check (`tsc --noEmit --skipLibCheck`) and project linter verification.
5. **Automated Unit Tests** — Dynamic headless test runner (`vitest` / `jest` / `karma`) with captured output diagnostics.
6. **Production Build & CD Verification** — Compiles production bundle via `ng build`, verifies `dist/index.html` entry point, `<base href>`, distribution asset links (404 checks), SPA rewrite rules, gzip budgets, Dockerfile syntax, and generates `dist/release-manifest.json` with SHA256 bundle checksums.
7. **Security & Secret Leak Scanning** — Scans staged diff against 30+ enterprise patterns (Google API keys, OpenAI tokens, AWS keys, Stripe, DB connection strings, conflict markers, `.env` files).
8. **AI Knowledge Base Audit (Gemini 3.8 / 3.7 Flash)** — Consults Gemini (with automatic fallback to multi-AI providers) against `resolved_issues.md` and repository tree to prevent historical bug regressions.

---

## 🖥️ Live Commit Progress Window (WPF GUI)

During installation, you can enable the floating dark-themed WPF progress window. During each `git commit`:
- All 8 steps animate with real-time status icons (⟳ In Progress, ✔ Passed, ⚠ Warning, ✖ Failed).
- Dynamic sub-labels show exact details (e.g. bundle size, test counts, gzipped transfer size).
- If validation succeeds, the window closes automatically (or on click).
- If any check fails, the window **stays open** with detailed diagnostics so you can inspect and fix errors immediately.

---

## 🌿 Live Background Branch Conflict Monitor

In addition to pre-commit gating, Gatekeeper includes a background daemon that monitors your **uncommitted working-tree edits** against a remote branch (e.g. `origin/main`):
- Uses `git stash create` and `git merge-tree` to simulate 3-way merges in-memory **without touching your working tree or modifying Git history**.
- Detects conflicts while you type before you ever commit or push.
- Dispatches native Windows Toast notifications and audio chimes the moment a teammate pushes conflicting code.
- Click the notification to open an interactive terminal conflict inspector.
- Automatically resumes on folder open in VS Code, Cursor, and compatible IDEs via `.vscode/tasks.json`.

---

## 💻 CLI Commands

```bash
# Pre-Commit Hook Management
a-gatekeeper enable                    # Enable pre-commit checks globally in current repo (+ generates .github/workflows/ci.yml)
a-gatekeeper disable                   # Temporarily disable pre-commit checks globally
a-gatekeeper status                    # Check whether Gatekeeper pre-commit hook is active
a-gatekeeper bypass                    # Show single-commit bypass syntax (git commit --no-verify)

# Production Verification & Probing
a-gatekeeper verify-deploy <url>       # Probe live deployed site (HTTP 200, SPA routing rewrite, security headers)

# Branch Conflict Watcher
a-gatekeeper branch check --enable     # Interactive setup (select target branch + check interval)
a-gatekeeper branch check --status     # View active monitor status, behind/ahead counts, and conflicting files
a-gatekeeper branch check --disable    # Stop background watcher daemon
```

---

## 🔒 Strict Mode Enforcement

By default, production configuration warnings (like `http://localhost` in `environment.prod.ts` or missing SPA rewrites) emit clear visual warnings. 

To enforce **zero-tolerance strict mode**, run your commit with:
```bash
GATEKEEPER_STRICT=1 git commit -m "feat: my change"
```
Or set `GATEKEEPER_STRICT=1` in your environment. In strict mode, localhost leaks or insecure HTTP endpoints will **hard-reject the commit**.

---

## 📦 Distribution Package & Workspace Structure

```
Angular Gatekeeper/                  ← Standalone Distribution Package
├── AngularGatekeeperSetup.exe       ← Standalone setup wizard
├── engine.exe                       ← Core engine & background daemon
├── Install.bat                      ← 1-click installer
├── Uninstall.bat                    ← 1-click uninstaller
├── README.md                        ← Full guide (Markdown)
└── README.txt                       ← Full guide (Plaintext)

scripts/                             ← Build & Release Automation
└── build.js                         ← Bundler (esbuild) & standalone packaging (pkg)

src/                                 ← Core Engine Architecture
├── engine.js                        ← Pre-commit pipeline runner & CLI router
├── installer.js                     ← Installer & uninstaller wizards
├── daemon/                          ← Background Services & Monitoring
│   └── branch-watcher.js            ← Conflict daemon, auto-restart, Toast alerts
├── ui/                              ← Presentation & Live GUI Layer
│   ├── progress-window.js           ← WPF live progress GUI launcher & IPC
│   └── ascii-art.js                 ← Terminal banners & branding art
├── rules/
│   ├── scoring-rubric.js            ← 100-Point Pre-Flight Quality Rubric engine
│   ├── ai-prompt.js                 ← Gemini 3.8 / 3.7 Flash AI audit + fallbacks
│   ├── angular-best-practices.js    ← Angular architecture & CD rules
│   ├── typescript-validator.js      ← TypeScript & unit test runner
│   └── security-rules.js           ← Secret & heavy file scanner
└── utils/
    ├── git.js                       ← Git command helpers
    ├── exec.js                      ← Streaming command execution
    └── logger.js                    ← Chalk-styled terminal output
```

---

## 🛠️ Build & Compilation

```bash
npm run build          # Bundle with esbuild + compile standalone Windows binaries into "Angular Gatekeeper/"
```

Output:
```
Angular Gatekeeper/
├── AngularGatekeeperSetup.exe   (Standalone installer wizard)
├── engine.exe                   (Standalone core engine & daemon)
├── Install.bat
├── Uninstall.bat
├── README.md
└── README.txt
```

---

## 📥 Installation

1. Run `AngularGatekeeperSetup.exe` (or double-click `Install.bat`)
2. Select your AI provider (Gemini 3.8/3.7, Claude, OpenAI, DeepSeek, Groq, Ollama, or Skip)
3. Enter API Key *(optional — press Enter to skip)*
4. Choose live progress window preference *(Y/N)*
5. Restart your terminal
6. Run `a-gatekeeper enable` in any Angular project
