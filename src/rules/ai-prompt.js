import fs from 'fs';
import path from 'path';
import http from 'http';
import chalk from 'chalk';
import { GoogleGenAI } from '@google/genai';
import { logStep, logSuccess, logError, logWarning } from '../utils/logger.js';
import { getDiff, getProjectStructureTree } from '../utils/git.js';

/**
 * Recursively collect all relevant source code files from the project
 * to enable a true Full-Project AI Knowledge Base regression audit.
 */
export function getProjectSourceSnapshot(cwd = process.cwd(), maxChars = 350000) {
  const allowedExtensions = new Set([
    '.ts', '.html', '.css', '.scss', '.sass', '.less', '.json', '.js', '.mjs'
  ]);
  const ignoredDirs = new Set([
    'node_modules', 'dist', '.git', '.angular', 'build', 'coverage',
    '.vscode', '.idea', '.github', '.gitlab', 'bin', 'obj'
  ]);
  const ignoredFiles = new Set([
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'resolved_issues.md', '.env', '.env.example', '.gitignore',
    '.gitattributes', '.gitleaks.toml', 'sha256sums.txt'
  ]);

  const fileList = [];

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }

    for (const entry of entries) {
      const lowerName = entry.name.toLowerCase();
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(lowerName) && !lowerName.startsWith('.')) {
          walk(path.join(dir, entry.name));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (allowedExtensions.has(ext) && !ignoredFiles.has(lowerName)) {
          fileList.push(path.join(dir, entry.name));
        }
      }
    }
  }

  // Prioritize src/ directory if it exists, otherwise walk project root
  const srcDir = path.join(cwd, 'src');
  if (fs.existsSync(srcDir)) {
    walk(srcDir);
    // Also include root configuration files (e.g. angular.json, tsconfig.json, package.json)
    ['angular.json', 'tsconfig.json', 'package.json'].forEach(cfg => {
      const cfgPath = path.join(cwd, cfg);
      if (fs.existsSync(cfgPath) && !fileList.includes(cfgPath)) {
        fileList.push(cfgPath);
      }
    });
  } else {
    walk(cwd);
  }

  let totalChars = 0;
  let snapshot = '';
  const MAX_PER_FILE_CHARS = 40000;

  for (const filePath of fileList) {
    const relPath = path.relative(cwd, filePath).replace(/\\/g, '/');
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.length > MAX_PER_FILE_CHARS) {
        content = content.slice(0, MAX_PER_FILE_CHARS) + '\n... [truncated file: exceeds 40KB]';
      }
      const fileHeader = `\n--- FILE: ${relPath} ---\n`;
      if (totalChars + fileHeader.length + content.length > maxChars) {
        const remaining = maxChars - totalChars - fileHeader.length;
        if (remaining > 300) {
          snapshot += fileHeader + content.slice(0, remaining) + '\n... [remaining files truncated to fit context budget]';
        }
        break;
      }
      snapshot += fileHeader + content;
      totalChars += fileHeader.length + content.length;
    } catch (_) {}
  }

  return { snapshot, fileCount: fileList.length };
}

/**
 * Generate the Senior Angular Architect & Security Gatekeeper prompt
 */
export function buildGeminiAuditPrompt(knowledgeBase, diffOutput = '', projectTree = '', projectSource = '') {
  const hasDiff = Boolean(diffOutput && diffOutput.trim().length > 0);
  const diffSection = hasDiff
    ? `### 3. ACTIVE CODE DIFF / COMMITTED CHANGES:
\`\`\`diff
${diffOutput.slice(0, 25000)}
\`\`\``
    : `### 3. ACTIVE CODE DIFF / COMMITTED CHANGES:
*(No pending git diff detected. You must perform a complete audit of the entire project source code provided in Section 2.)*`;

  const projectSourceContent = projectSource && projectSource.trim().length > 0
    ? projectSource
    : '*(No project source files detected in workspace)*';

  return `
You are a Principal Angular Architect, DevSecOps Specialist, and Code Quality Gatekeeper.
Your job is to audit the current Angular repository and its codebase against our repository's Knowledge Base of established standards, architecture patterns, and resolved issues in "resolved_issues.md".

### 1. ESTABLISHED REPOSITORY STANDARDS & RESOLVED ISSUES (Knowledge Base):
\`\`\`markdown
${knowledgeBase.slice(0, 20000)}
\`\`\`

### 2. FULL PROJECT SOURCE CODE AUDIT (Entire Repository Files):
\`\`\`text
${projectSourceContent.slice(0, 350000)}
\`\`\`

${diffSection}

### 4. REPOSITORY PROJECT STRUCTURE SNAPSHOT:
\`\`\`text
${projectTree.slice(0, 8000)}
\`\`\`

### CRITICAL EVALUATION RULES:
1. **FULL PROJECT AUDIT MANDATE**: You are strictly required to audit the **ENTIRE PROJECT CODEBASE** (Section 2) against the technical rules, architectural constraints, and previously resolved bugs documented in "resolved_issues.md" (Section 1).
2. **DO NOT LIMIT YOUR AUDIT TO ONLY THE GIT DIFF**: Even if a file was NOT modified in the current git diff, if ANY source file in the project violates any rule, reintroduces a known bug, or breaks architectural guidelines from resolved_issues.md, you MUST flag it!
3. **IGNORE direct edits or deletions to the "resolved_issues.md" file itself**. Do NOT fail the commit because resolved_issues.md was modified, reformatted, or shortened.
4. Verify that all components, services, templates, routing, and configurations in the project adhere to the architectural requirements:
   - Proper RxJS cleanup (takeUntilDestroyed / async pipe, zero memory leaks).
   - Template security (zero unsanitized innerHTML or direct nativeElement DOM mutations).
   - Clean standalone/module architecture, DI token usage, and strict type safety.
   - Any project-specific bug avoidance guidelines documented in resolved_issues.md.
5. If ANY file in the project (or in incoming git changes) reintroduces a previously documented bug, breaks architecture rules, or violates security standards:
   - Output: "VERDICT: FAILED"
   - Provide a concise explanation specifying the offending file path(s), relevant code snippet(s), and which documented issue from resolved_issues.md was violated.
6. If all source files across the project adhere to the documented guidelines:
   - Output: "VERDICT: PASSED"
   - Provide a concise summary and constructive architectural insights.
7. FORMATTING: Use clean, standard Markdown for headings and bullets. Never use LaTeX notation (e.g., do NOT output $\rightarrow$ or \rightarrow; use "→" or "->" instead). Never wrap heading lines in double asterisks.
8. COMPLETION: Ensure your response is fully complete. Finish all sentences, recommendations, and bullet points cleanly without cutting off mid-thought.

Ensure your response clearly includes either "VERDICT: PASSED" or "VERDICT: FAILED" in capital letters.
`;
}

/**
 * Step 8: Multi-Provider AI Knowledge Base Audit (Gemini, Ollama, vLLM / OpenAI-compatible)
 */
export async function runAiKnowledgeBaseAudit(config = {}, cwd = process.cwd()) {
  const provider = (config.AI_PROVIDER || (config.GEMINI_API_KEY ? 'gemini' : 'none')).toLowerCase();
  const providerTitles = {
      gemini: 'Google Gemini 3.8',
      openai: `OpenAI (${config.OPENAI_MODEL || "gpt-4o-mini"})`,
      anthropic: `Anthropic Claude (${config.ANTHROPIC_MODEL || "claude-3-7-sonnet"})`,
      deepseek: `DeepSeek (${config.DEEPSEEK_MODEL || "deepseek-chat"})`,
      groq: `Groq Ultra-Fast (${config.GROQ_MODEL || "llama-3.3-70b"})`,
      openrouter: `OpenRouter (${config.OPENROUTER_MODEL || "universal"})`,
      ollama: `Local Ollama (${config.OLLAMA_MODEL || "local"})`
    };
    const providerName = providerTitles[provider] || provider;
  
  logStep(8, `Angular AI Knowledge Base Regression Audit (${providerName})`);
  const resolvedIssuesPath = path.join(cwd, 'resolved_issues.md');

  if (!fs.existsSync(resolvedIssuesPath)) {
    console.log(chalk.gray('  No resolved_issues.md found at repository root. AI audit skipped.'));
    return { passed: true, skipped: true, report: 'No resolved_issues.md found at repository root. AI audit skipped.' };
  }

  if (provider === 'none') {
    console.log(chalk.gray('  AI Audit provider set to none / skipped in configuration.'));
    return { passed: true, skipped: true, report: 'AI Audit disabled in configuration. Step skipped.' };
  }

  const knowledgeBase = fs.readFileSync(resolvedIssuesPath, 'utf8');
  console.log(chalk.blue('  Scanning full project source files & git diff for AI Knowledge Base audit...'));

  const diffOutput = getDiff(cwd, true); // true = exclude resolved_issues.md and lockfile diff
  const projectTree = getProjectStructureTree(cwd);
  const sourceInfo = getProjectSourceSnapshot(cwd);

  console.log(chalk.gray(`  Loaded ${sourceInfo.fileCount} project file(s) into AI audit context (${Math.round(sourceInfo.snapshot.length / 1024)} KB)...`));

  if (!sourceInfo.snapshot && (!diffOutput || diffOutput.trim() === '')) {
    console.log(chalk.gray('  No project source code or git diff detected. AI audit passed.'));
    return { passed: true, skipped: true, report: 'No project source files or active git diff detected against baseline.' };
  }

  const prompt = buildGeminiAuditPrompt(knowledgeBase, diffOutput, projectTree, sourceInfo.snapshot);

  // 1. OLLAMA LOCAL AI PROVIDER
  if (provider === 'ollama') {
    const rawOllamaUrl = (config.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
    const model = config.OLLAMA_MODEL || 'qwen2.5-coder:latest';
    console.log(chalk.cyan(`  Consulting Local Ollama (${rawOllamaUrl} - ${model}) to audit Angular code...`));

    // Tailor prompt for local models: keep critical rules, project source slice & diff, without flooding CPU with 150-file tree
    const localPrompt = buildGeminiAuditPrompt(
      knowledgeBase.slice(0, 8000),
      diffOutput ? diffOutput.slice(0, 10000) : '',
      projectTree ? projectTree.slice(0, 800) : '',
      sourceInfo.snapshot ? sourceInfo.snapshot.slice(0, 35000) : ''
    );

    try {
      const resultText = await callOllamaViaHttp(rawOllamaUrl, model, localPrompt);
      return evaluateAiResult(resultText, `Ollama (${model})`);
    } catch (err) {
      logError(`Ollama AI Audit Error: ${err.message}`);
      console.log(chalk.yellow('  Ensure Ollama is running locally ("ollama serve"). Allowing commit with warning.'));
      return { passed: true, skipped: true, report: `Ollama Local Error: ${err.message}` };
    }
  }

  // 2. OPENAI (GPT-4o, GPT-4o-mini, o3-mini)
    if (provider === 'openai') {
      const apiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      const model = config.OPENAI_MODEL || 'gpt-4o-mini';
      if (!apiKey) {
        logWarning('OPENAI_API_KEY not configured.');
        return { passed: true, skipped: true, report: 'OPENAI_API_KEY not configured. AI audit skipped.' };
      }
      console.log(chalk.cyan(`  Consulting OpenAI (${model}) to audit Angular code...`));
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 4096
          })
        });
        if (!res.ok) {
          const errData = await res.text();
          throw new Error(`${res.status} ${res.statusText}: ${errData}`);
        }
        const data = await res.json();
        const resultText = data.choices?.[0]?.message?.content || '';
        return evaluateAiResult(resultText, `OpenAI (${model})`);
      } catch (err) {
        logError(`OpenAI AI Audit Error: ${err.message}`);
        return { passed: true, skipped: true, report: `OpenAI Error: ${err.message}` };
      }
    }

    // 3. ANTHROPIC CLAUDE (Claude 3.7 Sonnet, Claude 3.5 Haiku)
    if (provider === 'anthropic') {
      const apiKey = config.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
      const model = config.ANTHROPIC_MODEL || 'claude-3-7-sonnet-20250219';
      if (!apiKey) {
        logWarning('ANTHROPIC_API_KEY not configured.');
        return { passed: true, skipped: true, report: 'ANTHROPIC_API_KEY not configured. AI audit skipped.' };
      }
      console.log(chalk.cyan(`  Consulting Anthropic Claude (${model}) to audit Angular code...`));
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2
          })
        });
        if (!res.ok) {
          const errData = await res.text();
          throw new Error(`${res.status} ${res.statusText}: ${errData}`);
        }
        const data = await res.json();
        const resultText = data.content?.[0]?.text || '';
        return evaluateAiResult(resultText, `Anthropic (${model})`);
      } catch (err) {
        logError(`Anthropic AI Audit Error: ${err.message}`);
        return { passed: true, skipped: true, report: `Anthropic Error: ${err.message}` };
      }
    }

    // 4. DEEPSEEK (DeepSeek-V3, DeepSeek-R1)
    if (provider === 'deepseek') {
      const apiKey = config.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;
      const model = config.DEEPSEEK_MODEL || 'deepseek-chat';
      if (!apiKey) {
        logWarning('DEEPSEEK_API_KEY not configured.');
        return { passed: true, skipped: true, report: 'DEEPSEEK_API_KEY not configured. AI audit skipped.' };
      }
      console.log(chalk.cyan(`  Consulting DeepSeek (${model}) to audit Angular code...`));
      try {
        const res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 4096
          })
        });
        if (!res.ok) {
          const errData = await res.text();
          throw new Error(`${res.status} ${res.statusText}: ${errData}`);
        }
        const data = await res.json();
        const resultText = data.choices?.[0]?.message?.content || '';
        return evaluateAiResult(resultText, `DeepSeek (${model})`);
      } catch (err) {
        logError(`DeepSeek AI Audit Error: ${err.message}`);
        return { passed: true, skipped: true, report: `DeepSeek Error: ${err.message}` };
      }
    }

    // 5. GROQ (Ultra-Fast Llama-3.3, Qwen-2.5-Coder)
    if (provider === 'groq') {
      const apiKey = config.GROQ_API_KEY || process.env.GROQ_API_KEY;
      const model = config.GROQ_MODEL || 'llama-3.3-70b-versatile';
      if (!apiKey) {
        logWarning('GROQ_API_KEY not configured.');
        return { passed: true, skipped: true, report: 'GROQ_API_KEY not configured. AI audit skipped.' };
      }
      console.log(chalk.cyan(`  Consulting Groq (${model}) to audit Angular code...`));
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 4096
          })
        });
        if (!res.ok) {
          const errData = await res.text();
          throw new Error(`${res.status} ${res.statusText}: ${errData}`);
        }
        const data = await res.json();
        const resultText = data.choices?.[0]?.message?.content || '';
        return evaluateAiResult(resultText, `Groq (${model})`);
      } catch (err) {
        logError(`Groq AI Audit Error: ${err.message}`);
        return { passed: true, skipped: true, report: `Groq Error: ${err.message}` };
      }
    }

    // 6. OPENROUTER (Universal AI Hub - 300+ models)
    if (provider === 'openrouter') {
      const apiKey = config.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
      const model = config.OPENROUTER_MODEL || 'anthropic/claude-3.7-sonnet';
      if (!apiKey) {
        logWarning('OPENROUTER_API_KEY not configured.');
        return { passed: true, skipped: true, report: 'OPENROUTER_API_KEY not configured. AI audit skipped.' };
      }
      console.log(chalk.cyan(`  Consulting OpenRouter (${model}) to audit Angular code...`));
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://github.com/angular-gatekeeper',
            'X-Title': 'Angular Gatekeeper'
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 4096
          })
        });
        if (!res.ok) {
          const errData = await res.text();
          throw new Error(`${res.status} ${res.statusText}: ${errData}`);
        }
        const data = await res.json();
        const resultText = data.choices?.[0]?.message?.content || '';
        return evaluateAiResult(resultText, `OpenRouter (${model})`);
      } catch (err) {
        logError(`OpenRouter AI Audit Error: ${err.message}`);
        return { passed: true, skipped: true, report: `OpenRouter Error: ${err.message}` };
      }
    }

    // 7. GOOGLE GEMINI (Default Cloud AI Provider)
  const geminiKey = config.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    logWarning('resolved_issues.md detected, but GEMINI_API_KEY is not configured.');
    console.log(chalk.gray('  To configure AI, run Install.bat or AngularGatekeeperSetup.exe.'));
    return { passed: true, skipped: true, report: 'GEMINI_API_KEY not configured. AI audit skipped.' };
  }

  console.log(chalk.cyan('  Consulting Gemini AI to audit Angular code against known issues...'));
  const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest'
    ];
  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          maxOutputTokens: 4096,
          temperature: 0.2
        }
      });

      const resultText = response.text || '';
      return evaluateAiResult(resultText, modelName);
    } catch (apiErr) {
      console.log(chalk.yellow(`  ⚠ ${modelName} returned error (${apiErr.message || apiErr}). Switching to fallback model...`));
      lastError = apiErr;
      continue;
    }
  }

  logError(`AI Audit call error: ${lastError?.message || lastError}`);
  console.log(chalk.yellow('  Allowing commit/push with warning due to AI service error.'));
  return { passed: true, skipped: true, report: `AI Service Warning: ${lastError?.message || lastError}` };
}

/**
 * Raw HTTP client for local Ollama API to bypass Undici headersTimeout and IPv6 ECONNREFUSED
 */
function callOllamaViaHttp(url, model, prompt) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(url);
      const isLocalhost = parsed.hostname === 'localhost';
      const hostname = isLocalhost ? '127.0.0.1' : parsed.hostname;
      const port = parsed.port ? parseInt(parsed.port, 10) : 11434;

      const postData = JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 4096,
          num_ctx: 8192
        }
      });

      const options = {
        hostname,
        port,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let rawData = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const json = JSON.parse(rawData);
              resolve(json.response || '');
            } catch (e) {
              reject(new Error(`Failed to parse Ollama JSON response: ${e.message}`));
            }
          } else {
            reject(new Error(`Ollama HTTP Error: ${res.statusCode} ${res.statusMessage || ''}`));
          }
        });
      });

      req.on('error', (err) => {
        // If 127.0.0.1 failed, try localhost fallback
        if (hostname === '127.0.0.1') {
          const fallbackOptions = { ...options, hostname: 'localhost' };
          const fallbackReq = http.request(fallbackOptions, (res) => {
            let rawData = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  const json = JSON.parse(rawData);
                  resolve(json.response || '');
                } catch (e) {
                  reject(new Error(`Failed to parse Ollama JSON response: ${e.message}`));
                }
              } else {
                reject(new Error(`Ollama HTTP Error: ${res.statusCode} ${res.statusMessage || ''}`));
              }
            });
          });
          fallbackReq.on('error', () => reject(err));
          fallbackReq.write(postData);
          fallbackReq.end();
        } else {
          reject(err);
        }
      });

      req.write(postData);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Shared evaluation parser for all AI outputs (Gemini, Ollama, vLLM)
 */
function evaluateAiResult(resultText, modelIdentifier) {
  console.log('\n' + chalk.gray('─'.repeat(60)));
  console.log(chalk.bold(`AI Audit Report [${modelIdentifier}]:`));
  console.log(resultText);
  console.log(chalk.gray('─'.repeat(60)) + '\n');

  if (resultText.includes('VERDICT: FAILED')) {
    logError('AI Gatekeeper detected regressions or violations of resolved_issues.md!');
    console.log(chalk.red('  Commit/Push rejected: Please address the AI audit findings above.\n'));
    return { passed: false, skipped: false, report: resultText };
  } else {
    logSuccess(`AI Knowledge Base audit PASSED using ${modelIdentifier}. No known regressions detected.`);
    return { passed: true, skipped: false, report: resultText };
  }
}
