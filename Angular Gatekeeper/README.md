# 🛡️ Angular Gatekeeper v3.0
## Complete Guide & Reference Manual

> **Version:** 3.0 &nbsp;|&nbsp; **Platform:** Windows 10/11 &nbsp;|&nbsp; **AI:** Gemini 3.8 / 3.7 Flash, Claude, OpenAI, DeepSeek, Groq, Ollama

---

## 📌 1. What is Angular Gatekeeper?

**Angular Gatekeeper** is an enterprise developer quality and productivity gatekeeper built specifically for modern frontend and Angular engineering teams.

It operates as an **All-in-One Pre-Commit Safety Net** directly on your workstation:

| Shield | What it does |
| :--- | :--- |
| **🛡️ All-in-One Pre-Commit Gatekeeper** | Intercepts every local `git commit`, executing an 8-step pipeline: Architecture, Lockfile Sync, Linux Casing, Dependency CVEs, Strict TypeScript, Headless Unit Tests, Production Compilation, CD Distribution Verification, and an AI Regression Audit. |
| **📊 100-Point Pre-Flight Rubric** | Computes a transparent, deterministic 100-point quality score across 5 engineering pillars (Security, Static Analysis, Architecture, Tests, and CD Readiness). |
| **🌿 Live Branch Conflict Watcher** | Runs silently in the background, checking your **uncommitted live edits** against a remote branch every N minutes. Dispatches native Windows Toast notifications the moment a teammate pushes conflicting code. |
| **🔁 Auto-Restart on IDE Open** | When you open VS Code, Cursor, or any compatible IDE for a project where the watcher was enabled, it **automatically restarts the background daemon** without any manual effort. |

---

## 📊 2. 100-Point Pre-Flight Quality Rubric

Every commit is evaluated against 5 core engineering pillars totaling 100 points:

1. **Security & Hygiene Gate (25 pts)**: Zero leaked credentials (10 pts), no merge conflict markers/oversized files (5 pts), lockfile synchronization (5 pts), staged cleanroom integrity (5 pts).
2. **Static Analysis & Type Safety (25 pts)**: Strict TypeScript compilation with zero errors (15 pts), ESLint pass (10 pts).
3. **Angular Architecture & Linux Parity (20 pts)**: Linux case-sensitive import validation (10 pts), circular dependency graph DFS (5 pts), template security & safe DOM audit (5 pts).
4. **Regression & Test Health (15 pts)**: Unit test suite execution (10 pts), active test spec availability (5 pts — honest 0 pts if no specs exist).
5. **Production & CD Readiness (15 pts)**: Zero localhost or unencrypted HTTP leaks in prod (5 pts), SPA deep-routing server rewrite rule (5 pts), bundle sizing & gzip budgets (5 pts).

**Letter Grades**: `A+` (95–100), `A` (90–94), `B` (80–89), `C` (70–79), `F` (<70).

---

## ⚙️ 3. The 8 Pre-Commit Validation Steps

Whenever you run `git commit`, Gatekeeper intercepts the process and runs **8 sequential validation steps**:

| Step | Pipeline Check | What it Validates |
| :---: | :--- | :--- |
| **1** | **Angular Project Detection** | Auto-detects Angular workspaces (`angular.json` / `@angular/core`). Safely bypasses non-Angular repos with zero popups. |
| **2** | **Critical Architecture & Entry Points** | Validates `tsconfig.json`, `src/main.ts`, `<app-root>`, lockfile sync, cleanroom drift, Linux case-sensitivity, and circular dependency graph. |
| **3** | **Dependency Vulnerability Audit** | Runs `npm audit --audit-level=high` to block known High/Critical CVEs. |
| **4** | **TypeScript & Lint Verification** | Strict `tsc --noEmit --skipLibCheck` and project linter to block type errors before committing. |
| **5** | **Automated Unit Tests** | Dynamic headless test runner (`npm run test:ci` / Vitest / Jest / Karma) with captured diagnostics. |
| **6** | **Production Build & CD Verification** | Compiles via `ng build`, verifies `dist/index.html`, `<base href>`, distribution asset links, SPA rewrite rules (`web.config`, `nginx.conf`, `_redirects`), gzip budgets, and generates `dist/release-manifest.json` with SHA256 checksums. |
| **7** | **Security & Secret Leak Scanning** | Scans staged diff against 30+ secret patterns (Google, OpenAI, AWS, Stripe, connection strings), conflict markers (`<<<<<<<`), and oversized files (>10MB). |
| **8** | **AI Knowledge Base Audit** | Consults Gemini 3.8 / 3.7 Flash against `resolved_issues.md` to prevent bug regressions. |

---

## 💻 4. CLI Commands

```bash
# Pre-Commit Hook Management
a-gatekeeper enable                    # Enable pre-commit checks globally
a-gatekeeper disable                   # Temporarily disable pre-commit checks globally
a-gatekeeper status                    # Check whether Gatekeeper hook is active
a-gatekeeper bypass                    # Show single-commit bypass syntax (git commit --no-verify)

# CD Deployment Live Probing
a-gatekeeper verify-deploy <url>       # Probe live deployed site (HTTP 200, SPA routing rewrite, security headers)

# Branch Conflict Watcher
a-gatekeeper branch check --enable     # Interactive setup (select target branch + check interval)
a-gatekeeper branch check --status     # View active monitor status, behind/ahead counts, and conflicting files
a-gatekeeper branch check --disable    # Stop background watcher daemon
```

---

## 🔒 5. Strict Mode

To enforce zero tolerance for production configuration issues (such as `http://localhost` in `environment.prod.ts`), run commits with:
```bash
GATEKEEPER_STRICT=1 git commit -m "feat: my change"
```
In strict mode, localhost leaks or insecure HTTP endpoints will **immediately abort the commit**.
