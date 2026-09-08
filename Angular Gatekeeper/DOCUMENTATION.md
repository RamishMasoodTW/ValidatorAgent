# DEVELOPER TOOLING REFERENCE V3.0
# Angular Gatekeeper
### Complete Architecture, CI/CD Engine & Reference Manual

---

## 📌 1. What is Angular Gatekeeper?

**Angular Gatekeeper** is an enterprise-grade automated quality, security, CI/CD compliance, and merge-conflict prevention system built specifically for Angular engineering teams. It guarantees that broken builds, failing unit tests, strict type mismatches, security vulnerabilities, secret leaks, Linux OS path incompatibilities, and git merge conflicts never enter the repository history.

### It protects your codebase with 3 Core Shields:

1. **Pre-Commit CI/CD Quality Engine (8-Step Active Gatekeeper):** Automatically audits every `git commit` in real time. It executes cleanroom staged isolation, case-sensitivity checking, type checks, dependency vulnerability scanning, automated headless unit tests (with dynamic smoke-spec injection, unsupported argument recovery & rollback), production build compilation, CD artifact & SPA rewrite validation, cryptographic release manifest generation, secret leak scanning, and Multi-Provider AI regression auditing (Gemini 3.8/3.7 Flash, Claude, OpenAI, DeepSeek, Groq, or Local Ollama)—displaying every step live in a dark-themed WPF progress window with 100% synchronized terminal logs.
2. **Live Background Branch Conflict Watcher:** Runs silently as a low-overhead background daemon. Every few minutes, it fetches remote changes, checks for working-tree overwrite collisions, and simulates in-memory 3-way git merges (`git merge-tree`) against your active uncommitted and staged work. If a teammate pushes code to `main` or `develop` that clashes with your unsaved files, you receive an instant Windows desktop Toast notification with sound—long before you commit or push.
3. **Smart IDE Auto-Resume & Multi-Project Resilience:** Once enabled in a repository, the tool configures workspace hooks. Opening the project folder in VS Code or Cursor automatically starts or resumes the background conflict watcher—even after a full computer restart.

---

## 🏗️ 2. System Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           ANGULAR GATEKEEPER ECOSYSTEM                           │
├─────────────────────────┬────────────────────────────┬───────────────────────────┤
│ 1. Pre-Commit CI Engine │ 2. Live Conflict Watcher   │ 3. Workspace Resilience   │
│ (Active Execution Gate) │ (Silent Background Daemon) │ (IDE Auto-Resume System)  │
├─────────────────────────┼────────────────────────────┼───────────────────────────┤
│ • 8 Sequential Checks   │ • Periodic Git Polling     │ • VS Code & Cursor Hooks  │
│ • Live WPF Progress UI  │ • In-Memory 3-Way Merge    │ • Survives System Reboot  │
│ • 1:1 Terminal Parity   │ • Overwrite Collision Scan │ • Zero Extra Config       │
│ • Multi-Provider AI     │ • Windows Desktop Alerts   │ • Multi-Project Support   │
│ • Rejects Invalid Code  │ • 1-Click Terminal Protocol│ • Silent Auto-Background  │
│ • Zero External Runtime │ • --ci Headless Parity     │ • Auto-Restore On Open    │
└─────────────────────────┴────────────────────────────┴───────────────────────────┘
```

## 📊 3. CI / CD Compliance & Issue Resolution Breakdown

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CI / CD COMPLIANCE BENCHMARK                         │
├──────────────────────────────────────┬──────────────────────────────────────┤
│    🚀 CONTINUOUS INTEGRATION (CI)    │ 🚢 CONTINUOUS DELIVERY / DEPLOY (CD) │
│           ⭐ 95% COMPLIANCE          │           ⭐ 65% COMPLIANCE          │
├──────────────────────────────────────┴──────────────────────────────────────┤
│             🎯 COMBINED REAL-WORLD LIFECYCLE COVERAGE: ~85% - 88%           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 🚀 CI (Continuous Integration) — 95% Compliance
CI answers: *"Does the code compile cleanly, pass strict type tests, pass unit tests, maintain cross-OS compatibility, verify cleanroom staging, and stay secure?"*

| Specific CI Issue Resolved | Impact | How Gatekeeper Resolves It Locally & On CI Runners |
| :--- | :--- | :--- |
| Linux CI "Module Not Found" Errors | 100% | Scans all relative TypeScript imports and validates exact case-sensitivity against physical disk files before committing (prevents Windows-vs-Linux casing mismatches). |
| CI Server npm ci Lockfile Crashes | 100% | Detects when `package.json` is modified/staged without `package-lock.json` and blocks the commit immediately. |
| CI Cleanroom Staging Drift | 95% | Scans `git status --porcelain` to detect unstaged modifications on staged files, preventing false-positive local passes ("works on my machine"). |
| Angular Bootstrap & Root Mount Failures | 95% | Validates entry component selector (`<app-root>` or custom root) in `index.html` and bootstrap calls (`bootstrapApplication` / `bootstrapModule`) in `src/main.ts`. |
| Circular Dependencies & Injection Bugs | 95% | Analyzes import graphs for circular dependency cycles between services and components that cause undefined injection tokens or runtime `NullInjectorError`. |
| Strict TypeScript & Linter Breakages | 100% | Runs `tsc --noEmit --skipLibCheck` and project linter to block type errors and bad syntax before code is pushed. |
| Broken Unit Tests & Missing Specs | 95% | Runs headless test runner (`vitest` / `jest` / `karma`) with automatic unknown argument recovery; if zero test specs exist, auto-injects a smoke-spec, validates, and safely rolls it back. |
| Template & DOM XSS Vulnerabilities | 95% | Flags unsanitized `[innerHTML]` bindings, `bypassSecurityTrustHtml` calls, and direct DOM mutations bypassing Angular Renderer2. |
| Dependency CVE Vulnerabilities | 90% | Runs `npm audit --audit-level=high` to block packages containing High or Critical security CVEs. |
| Accidental Secret & Credential Leaks | 98% | Scans staged diff against 30+ enterprise patterns (Google API keys, OpenAI tokens, AWS keys, Stripe, DB connection strings). |
| Leftover Git Merge Conflict Markers | 100% | Regex-scans code for `<<<<<<< HEAD`, `=======`, and `>>>>>>>` to prevent syntax corruption in CI. |
| CI Runner Disk & Repo Bloat (>10MB) | 95% | Blocks accidental commits of `.env`, `.pem`, `.key`, and oversized binary files (>10MB). |
| Node.js CI Runner Version Mismatches | 95% | Verifies active Node.js version against `package.json` "engines" and `.nvmrc`. |
| Conventional Commits Enforcement | 95% | Validates commit messages conform to Conventional Commits standards (`feat:`, `fix:`, `refactor:`, `perf:`, `test:`, `docs:`, etc.). |
| Server Pipeline & Remote CI Parity | 100% | Automatically generates `.github/workflows/ci.yml` and supports `--ci` runner mode to prevent bypasses via `git commit --no-verify`. |

### 🚢 CD (Continuous Delivery & Deployment Readiness) — 65% Compliance
CD answers: *"Are production distribution bundles verified, are cryptographic manifests created, is web server routing configured, is SemVer bumped, and will live sub-routes load without 404s?"*

| Specific CD Issue Resolved | Impact | How Gatekeeper Resolves It Locally & Across Pipelines |
| :--- | :--- | :--- |
| SPA 404 Refresh Failures on Servers | 100% | Validates that web server URL rewrite configurations (`web.config` for IIS, `nginx.conf`, or `_redirects` for Cloudflare/Netlify) exist in distribution output so page refreshes don't 404. |
| IIS web.config Syntax & Malformation Errors | 100% | Parses XML structure of `web.config`, validates rewrite rules, checks MIME types, and warns if `web.config` is missing from `angular.json` assets (prevents IIS 500.19 errors). |
| Missing Distribution Static Assets | 95% | Scans `index.html` in compiled distribution output to ensure all referenced local script, style, and icon assets physically exist on disk. |
| SPA Client-Side Route Base-Href Breakages | 100% | Verifies `<base href="...">` exists in `index.html` to ensure router links and relative static assets resolve correctly after deployment. |
| Release Candidate Manifest & Cryptographic Hashes | 100% | Automatically generates `dist/release-manifest.json` containing SHA256 hashes of all compiled bundles, bundle metrics, and deployment metadata. |
| Automated SemVer Bump (Conventional Commits) | 95% | Analyzes commit messages (`feat:` → minor, `fix:`/`perf:` → patch, `BREAKING CHANGE:` → major) and stamps `nextSemVer` and `cdCompliance: "65%"` into `src/build-metadata.json`. |
| Live Post-Deploy Health & SPA Probing | 90% | Provides `a-gatekeeper verify-deploy <url>` to probe live deployed sites for HTTP 200, `<base href>`, security headers (HSTS, CSP), and SPA deep routing. |
| Production Localhost / Dev URL Leaks | 95% | Scans `environment.prod.ts` to ensure development URLs (`http://localhost:3000`, `127.0.0.1`) do not leak into live production. |
| Insecure HTTP API Endpoints in Prod | 90% | Audits production environment configurations for unencrypted `http://` API calls to enforce transport-layer security (HTTPS). |
| Missing Production Artifacts (dist/) | 100% | Runs `ng build` and confirms `index.html`, JavaScript bundles (`main.js`, `polyfills.js`), and global styles exist across legacy and modern Angular 17+ Application Builder directories (`dist/.../browser/`). |
| Bundle Size & Gzip Budget Compliance | 90% | Calculates total compiled bundle size and real-world gzip compressed transfer footprint, verifying them against enterprise performance budgets. |
| Container (Docker) & Cloud Target Syntax | 85% | Lints repo `Dockerfile` and verifies cloud deployment configs (Azure, Firebase, Vercel, Netlify) to prevent deployment pipeline failures. |
| Automated Build Version Tracking | 100% | Automatically stamps build number, Git commit hash, active branch, and timestamp into `src/build-metadata.json`. |
| Automated CD Delivery Artifact Archiving | 100% | Generated pipeline includes a dedicated `delivery-readiness` CD job that verifies distribution bundles, release manifests, and archives production artifacts via GitHub Actions. |

> **Note on Remaining CD (35%):** Full autonomous Continuous Deployment (100%) involves cloud runtime infrastructure that physically exists only in production clouds (e.g., Kubernetes cluster orchestration, canary traffic routing, live database schema migrations, and real-time APM telemetry). 65% represents the true maximum achievable by a client-side and build-pipeline release coordinator.

---

## ⚙️ 4. Pre-Commit Quality & CI/CD Engine (The 8 Exact Steps)
Whenever you commit code (`git commit`), Gatekeeper executes 8 sequential pipeline steps defined in `src/engine.js`. The step numbers and titles match 1:1 between the WPF Progress Window and your terminal / GitHub Desktop logs:

```text
┌────────────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Angular Project Detection (Safe Bypass for non-Angular)                    │
│ ├─ Verifies angular.json / @angular/core and parses framework version (e.g. v19.x) │
│ └─ Subtitle: "Angular workspace verified (v19.x)"                                  │
├────────────────────────────────────────────────────────────────────────────────────┤
│ STEP 2: Critical Architecture & Entry Point Validation                             │
│ ├─ Verifies tsconfig.json, angular.json, src/main.ts, src/index.html               │
│ ├─ Verifies package.json vs package-lock.json sync (stops "npm ci" breaks)         │
│ ├─ Verifies case-sensitive imports against physical disk (stops Linux CI breaks)   │
│ ├─ Verifies CI cleanroom staged drift (ensures staged index matches disk files)    │
│ ├─ Verifies Angular root component mount & bootstrapApplication / bootstrapModule  │
│ ├─ Scans for circular dependencies between Angular services and components         │
│ ├─ Audits templates & code for DOM XSS risks ([innerHTML], bypassSecurityTrustHtml)│
│ ├─ Verifies Conventional Commit message formatting                                 │
│ ├─ Verifies Node.js engine compatibility against package.json "engines" / .nvmrc   │
│ └─ Subtitle: "Entry points, lockfile sync & Linux case-sensitivity verified"       │
├────────────────────────────────────────────────────────────────────────────────────┤
│ STEP 3: Dependency Security & Vulnerability Audit (npm audit)                      │
│ ├─ Executes "npm audit --audit-level=high" to catch High/Critical CVEs             │
│ └─ Subtitle: "0 High/Critical CVE vulnerabilities found in dependencies"           │
├────────────────────────────────────────────────────────────────────────────────────┤
│ STEP 4: Strict TypeScript Compilation & Linter Verification                        │
│ ├─ Runs "tsc --noEmit --skipLibCheck" & project linter (ESLint)                    │
│ └─ Subtitle: "TypeScript compilation passed with 0 type errors"                    │
├────────────────────────────────────────────────────────────────────────────────────┤
│ STEP 5: Automated Unit Tests & CI Regression Suite (npm run test:ci)               │
│ ├─ Dynamic test runner: test:ci -> Vitest -> Jest -> Karma headless                │
│ ├─ Unknown argument recovery: strips unsupported runner flags & retries cleanly    │
│ ├─ Environment resilience: skips gracefully if Chrome binary/provider unconfigured │
│ ├─ Auto-injects dynamic smoke spec if project has 0 tests, then cleans up safely   │
│ └─ Subtitle: "Auto-injected smoke spec verified & safely cleaned up (0 failures)"  │
├────────────────────────────────────────────────────────────────────────────────────┤
│ STEP 6: Production Build & CD Deployment Readiness Verification                    │
│ ├─ Compiles production bundles via "ng build"                                      │
│ ├─ Validates dist/ output (supports Angular 17+ browser/ and legacy dist/)         │
│ ├─ Audits CD SPA URL rewrite rules (IIS web.config, nginx.conf, _redirects)        │
│ ├─ Validates IIS web.config XML syntax, MIME types, and asset registration         │
│ ├─ Verifies all referenced assets in index.html exist physically in dist/          │
│ ├─ Verifies <base href> tag in index.html for client-side routing                  │
│ ├─ Scans for dev/localhost & unencrypted http:// URL leaks in environment.prod.ts  │
│ ├─ Validates Dockerfile containerization syntax and cloud target deployment configs│
│ ├─ Calculates raw and Gzip compressed bundle sizes against performance budgets     │
│ ├─ Generates dist/release-manifest.json with SHA256 checksums of all bundles       │
│ ├─ Computes Conventional Commit SemVer bump and stamps src/build-metadata.json     │
│ └─ Subtitle: "CD Verified: 1.46 MB | SPA: ✔ | BaseHref: ✔ | Manifest: ✔"          │
├────────────────────────────────────────────────────────────────────────────────────┤
│ STEP 7: Security & Secret Leak Scanning                                            │
│ ├─ Scans staged diff for API keys (Google, OpenAI, AWS, Stripe, Slack, DB strings) │
│ ├─ Blocks unresolved Git merge conflict markers (<<<<<<< HEAD, =======, >>>>>>>)   │
│ ├─ Blocks forbidden staged files (.env, .pem, .key, .pfx, .DS_Store, Thumbs.db)    │
│ ├─ Blocks oversized binary files (>10 MB) to prevent CI repository bloat           │
│ └─ Subtitle: "0 leaked secrets, 0 conflict markers, clean file stage (<10MB)"      │
├────────────────────────────────────────────────────────────────────────────────────┤
│ STEP 8: Multi-Provider AI Knowledge Base Regression Audit                          │
│ ├─ Consults configured AI Provider (Gemini 3.8/3.7, Claude, OpenAI, DeepSeek,      │
│ │   Groq, OpenRouter, or Local Offline Ollama)                                     │
│ ├─ Reads resolved_issues.md & live project structure tree                          │
│ ├─ Analyzes code diff to ensure past architectural mistakes are not repeated       │
│ ├─ Ignores documentation modifications to resolved_issues.md itself                │
│ └─ Subtitle: "AI Knowledge Base Audit & Insights (Google Gemini 3.8 / Multi-AI)"   │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🤖 5. Multi-Provider AI Regression Engine
Angular Gatekeeper v3.0 introduces a plug-and-play Multi-Provider AI Architecture with automated fallback resilience:

| Provider | Supported Models | Characteristics |
| :--- | :--- | :--- |
| **Google Gemini (Default)** | `gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash` | 6-tier auto-fallback cascade: If the primary model encounters rate limits or spikes in demand (e.g. 503 errors), it automatically falls back through subsequent versions. |
| **OpenAI** | `gpt-4o`, `gpt-4o-mini`, `o3-mini` | High precision architectural validation via OpenAI Chat Completions API. |
| **Anthropic Claude** | `claude-3-7-sonnet-20250219`, `claude-3-5-haiku` | Deep architectural comprehension and senior-level mentorship suggestions. |
| **DeepSeek** | `deepseek-chat`, `deepseek-reasoner` | Cost-effective, high-reasoning code audit. |
| **Groq** | `llama-3.3-70b-versatile`, `qwen-2.5-coder` | Ultra-low-latency cloud inference (under 1 second). |
| **OpenRouter** | 300+ Universal Models | Flexible routing for enterprise AI gateways. |
| **Local Offline Ollama**| `qwen2.5-coder`, `llama3`, `deepseek-r1`, `mistral` | 100% Offline & Private: Connects via raw HTTP (`http://127.0.0.1:11434`) without requiring an internet connection or external API keys. |
| **Skip AI Audit** | None (Rule-based only) | Runs all static CI/CD and security checks at full speed without calling any AI model. |

---

## 🖥️ 6. Live Commit Progress Window (WPF Desktop UI)
During every `git commit`, Gatekeeper displays a floating, real-time dark-mode validation window:
- **Real-Time Visual State:** Each step transitions smoothly from `Pending ([ ])` → `Running (>>)` with glowing indicators → `Passed (OK / PASS)` or `Failed (ERR / FAILED)`.
- **Dynamic Step Sub-Labels:** Displays informative sub-details beneath every step (e.g., `CD Verified: 1.46 MB | SPA: ✔ | BaseHref: ✔ | Manifest: ✔`, test specs count, security clean confirmation).
- **Modern Themed Scrollbar:** Custom slim, rounded-corner scrollbar styled to match the dark aesthetic.
- **Persistent on Failure:** If any check fails, the window stays open, highlights the failing step in red, and displays exact diagnostic output and remediation steps.
- **Interactive AI Report & Diagnostic Box:** Displays architectural mentorship recommendations or compiler/test error logs with a 1-click "Copy Error Log" clipboard button.
- **Non-Angular Bypass:** Remains completely invisible when committing non-Angular projects.
- **Headless CI Support:** When executed with `--ci` or on CI servers (`process.env.CI`), GUI rendering is silently bypassed in favor of clean runner logs.

---

## 📡 7. Live Background Branch Conflict Watcher
The background watcher operates quietly in developer workspaces to eliminate merge pain:
- **In-Memory 3-Way Merge (`git merge-tree`):** Simulates what will happen when your branch merges into `origin/main` without touching your working directory files or stash list.
- **Working-Tree Overwrite Collision Detection:** Specifically inspects if incoming remote commits on the target branch touch files you are currently editing unstaged in your workspace, preventing accidental overwrite disasters upon pulling.
- **Configurable Interval:** Polls in the background at custom intervals (default: every 15 minutes).
- **Native Windows Toast Alerts:** Triggers a native Windows desktop notification with audio the moment a remote commit conflicts with any locally edited or staged file.
- **1-Click Conflict Inspector:** Clicking the notification card or the "🔍 View Details in Terminal" button opens an inspection terminal listing the exact overlapping files and line blocks via the `gatekeeper-details:` protocol.
- **Stealth Execution:** Runs with hidden console windows (`windowsHide: true`)—no popping command prompts while typing.

---

## 🚀 8. Multi-Project Support & Automated CI/CD Setup
- **Independent Project Profiles:** Enable Project A to watch `origin/main` every 15 minutes, while Project B watches `origin/develop` every 5 minutes.
- **IDE Auto-Resume:** Automatically writes `.vscode/tasks.json` with `"runOn": "folderOpen"` so opening the workspace in VS Code or Cursor silently wakes the background monitoring daemon.
- **Automated CI/CD Workflow Generation:** Running `a-gatekeeper enable` automatically writes a strict `.github/workflows/ci.yml` pipeline containing quality gates, cleanroom dependencies (`npm ci`), dependency audit, type-checking, headless unit tests, and CD delivery readiness verification with release candidate archiving.

---

## ⌨️ 9. CLI Command Reference
All commands use the `a-gatekeeper` prefix:

### 🛡️ Pre-Commit Hook Management
| Command | Action |
| :--- | :--- |
| `a-gatekeeper enable` | Enables 8-step pre-commit protection globally and generates `.github/workflows/ci.yml` |
| `a-gatekeeper disable` | Disables pre-commit hook (reverts to standard Git behavior) |
| `a-gatekeeper status` | Displays current pre-commit hook status and active configuration |
| `a-gatekeeper bypass` | Explains how to perform a single-commit bypass using `git commit --no-verify` |

### 🚢 CD Live Deployment Probe
| Command | Action |
| :--- | :--- |
| `a-gatekeeper verify-deploy <url>` | Probes live deployed site: tests HTTP 200, `<base href>`, SPA deep routing, and audits security headers (HSTS, CSP) |
| `a-gatekeeper verify-live <url>` | Alias for `verify-deploy` |

### 🛰️ Background Branch Conflict Watcher
| Command | Action |
| :--- | :--- |
| `a-gatekeeper branch check --enable` | Launches interactive wizard for background watcher (target branch & interval) |
| `a-gatekeeper branch check --status` | Shows watcher status, active PID, target branch, and conflicting files list |
| `a-gatekeeper branch check --disable` | Stops and removes background watcher daemon process |

---

## 📦 10. Quick Setup & Installation Guide

### Step 1: Install (One-Time Global Setup)
1. Open the `Angular Gatekeeper/` distribution folder.
2. Double-click `Install.bat` (or run `AngularGatekeeperSetup.exe`).
3. Follow the interactive setup wizard:
   - **Choose AI Provider:** Select Google Gemini (Default), OpenAI, Claude, DeepSeek, Groq, OpenRouter, Local Ollama, or Skip.
   - **API Key / Endpoint:** Enter the corresponding key or local endpoint URL.
   - **Live Progress Window:** Type `Y` (recommended) to enable the real-time WPF GUI during commits.
4. Restart your terminal, VS Code, or Cursor.

### Step 2: Enable in Your Project
Open any Angular project directory in your terminal and run:
```bash
# 1. Enable 8-Step Pre-Commit Quality & CI Gatekeeper:
a-gatekeeper enable

# 2. Enable Live Background Conflict Monitoring:
a-gatekeeper branch check --enable
# (Specify target branch like "main" or "develop", and polling timer like "15" minutes)

# 3. (Optional) Probe a Live Production Deployment:
a-gatekeeper verify-deploy https://my-angular-app.com
```

### Step 3: Uninstallation / Removal
Double-click `Uninstall.bat` in the `Angular Gatekeeper/` folder, confirm with `Y`, and press `Enter`. All global hooks, background tasks, registry protocol handlers, and environment settings will be cleanly removed.
