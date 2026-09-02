import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { GoogleGenAI } from '@google/genai';
import { logStep, logSuccess, logError, logWarning } from '../utils/logger.js';
import { getDiff, getProjectStructureTree } from '../utils/git.js';

/**
 * Generate the Senior Angular Architect & Security Gatekeeper prompt
 */
export function buildGeminiAuditPrompt(knowledgeBase, diffOutput, projectTree = '') {
  return `
You are a Principal Angular Architect, DevSecOps Specialist, and Code Quality Gatekeeper.
Your job is to audit the current Angular repository and incoming Git changes against our repository's Knowledge Base of established standards, architecture patterns, and resolved issues in "resolved_issues.md".

### 1. ESTABLISHED REPOSITORY STANDARDS & RESOLVED ISSUES (Knowledge Base):
\`\`\`markdown
${knowledgeBase.slice(0, 15000)}
\`\`\`

### 2. REPOSITORY PROJECT STRUCTURE SNAPSHOT:
\`\`\`text
${projectTree.slice(0, 8000)}
\`\`\`

### 3. ACTIVE CODE DIFF / COMMITTED CHANGES:
\`\`\`diff
${diffOutput.slice(0, 25000)}
\`\`\`

### CRITICAL EVALUATION RULES:
1. **IGNORE direct edits or deletions to the "resolved_issues.md" file itself**. Do NOT fail the commit because resolved_issues.md was modified, reformatted, or shortened.
2. Evaluate the **entire codebase and incoming code changes** against the technical rules, architecture constraints, and bug avoidance guidelines documented in resolved_issues.md.
3. Verify that the project structure adheres to the architectural requirements (e.g. proper folder layout, RxJS cleanup with takeUntilDestroyed / async pipe, zero direct nativeElement.innerHTML mutations, clean type safety).
4. If the active code changes reintroduce previously documented bugs, break architecture rules, or violate security standards:
   - Output: "VERDICT: FAILED"
   - Provide a concise explanation of the violation with relevant file paths / code snippets.
5. If the project code adheres to the documented guidelines:
   - Output: "VERDICT: PASSED"
   - Provide a concise summary and constructive architectural insights.

Ensure your response clearly includes either "VERDICT: PASSED" or "VERDICT: FAILED" in capital letters.
`;
}

/**
 * Step 8: Multi-Provider AI Knowledge Base Audit (Gemini, Ollama, vLLM / OpenAI-compatible)
 */
export async function runAiKnowledgeBaseAudit(config = {}, cwd = process.cwd()) {
  const provider = (config.AI_PROVIDER || (config.GEMINI_API_KEY ? 'gemini' : 'none')).toLowerCase();
  const providerName = provider === 'ollama' ? 'Local Ollama' : (provider === 'openai_compat' ? 'Local vLLM / OpenAI-Compatible' : 'Google Gemini 3.7');
  
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
  console.log(chalk.blue('  Reading git diff for current Angular changes...'));

  const diffOutput = getDiff(cwd, true); // true = exclude resolved_issues.md and lockfile diff
  const projectTree = getProjectStructureTree(cwd);

  if (!diffOutput || diffOutput.trim() === '') {
    console.log(chalk.gray('  No code diff detected against baseline. AI audit passed.'));
    return { passed: true, skipped: true, report: 'No active code git diff detected against baseline (documentation edits ignored).' };
  }

  const prompt = buildGeminiAuditPrompt(knowledgeBase, diffOutput, projectTree);

  // 1. OLLAMA LOCAL AI PROVIDER
  if (provider === 'ollama') {
    const ollamaUrl = (config.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
    const model = config.OLLAMA_MODEL || 'qwen2.5-coder:latest';
    console.log(chalk.cyan(`  Consulting Local Ollama (${ollamaUrl} - ${model}) to audit Angular code...`));

    try {
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: { temperature: 0.2 }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP Error: ${response.status} ${response.statusText}`);
      }

      const resData = await response.json();
      const resultText = resData.response || '';
      return evaluateAiResult(resultText, `Ollama (${model})`);
    } catch (err) {
      logError(`Ollama AI Audit Error: ${err.message}`);
      console.log(chalk.yellow('  Ensure Ollama is running locally ("ollama serve"). Allowing commit with warning.'));
      return { passed: true, skipped: true, report: `Ollama Local Error: ${err.message}` };
    }
  }

  // 2. vLLM / LOCALAI / OPENAI-COMPATIBLE PROVIDER
  if (provider === 'openai_compat' || provider === 'vllm') {
    const baseUrl = (config.OPENAI_BASE_URL || 'http://localhost:8000/v1').replace(/\/$/, '');
    const model = config.OPENAI_MODEL || 'default';
    const apiKey = config.OPENAI_API_KEY || 'not-needed';
    console.log(chalk.cyan(`  Consulting Local vLLM/OpenAI-Compatible Server (${baseUrl} - ${model})...`));

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a Principal Angular Architect and DevSecOps Gatekeeper.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`vLLM HTTP Error: ${response.status} ${response.statusText}`);
      }

      const resData = await response.json();
      const resultText = resData.choices?.[0]?.message?.content || '';
      return evaluateAiResult(resultText, `vLLM (${model})`);
    } catch (err) {
      logError(`vLLM AI Audit Error: ${err.message}`);
      console.log(chalk.yellow('  Ensure local vLLM/LM Studio server is running. Allowing commit with warning.'));
      return { passed: true, skipped: true, report: `vLLM Local Error: ${err.message}` };
    }
  }

  // 3. GOOGLE GEMINI (Default Cloud AI Provider)
  const geminiKey = config.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    logWarning('resolved_issues.md detected, but GEMINI_API_KEY is not configured.');
    console.log(chalk.gray('  To configure AI, run Install.bat or AngularGatekeeperSetup.exe.'));
    return { passed: true, skipped: true, report: 'GEMINI_API_KEY not configured. AI audit skipped.' };
  }

  console.log(chalk.cyan('  Consulting Gemini 3.7 Flash to audit Angular code against known issues...'));
  const candidateModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt
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
