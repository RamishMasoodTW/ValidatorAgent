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
 * Step 8: AI Knowledge Base Audit (Gemini 3.7 / 3.6 Flash)
 */
export async function runAiKnowledgeBaseAudit(apiKey, cwd = process.cwd()) {
  logStep(8, 'Angular AI Knowledge Base Regression Audit (Gemini 3.7 Flash)');
  const resolvedIssuesPath = path.join(cwd, 'resolved_issues.md');

  if (!fs.existsSync(resolvedIssuesPath)) {
    console.log(chalk.gray('  No resolved_issues.md found at repository root. AI audit skipped.'));
    return { passed: true, skipped: true, report: 'No resolved_issues.md found at repository root. AI audit skipped.' };
  }

  if (!apiKey) {
    logWarning('resolved_issues.md detected, but GEMINI_API_KEY is not set in environment or config.');
    console.log(chalk.gray('  To enable AI audits, run AngularGatekeeperSetup.exe or set GEMINI_API_KEY.'));
    return { passed: true, skipped: true, report: 'GEMINI_API_KEY not configured. AI audit skipped.' };
  }

  const knowledgeBase = fs.readFileSync(resolvedIssuesPath, 'utf8');
  console.log(chalk.blue('  Reading git diff for current Angular changes...'));

  const diffOutput = getDiff(cwd, true); // true = exclude resolved_issues.md and lockfile diff
  const projectTree = getProjectStructureTree(cwd);

  if (!diffOutput || diffOutput.trim() === '') {
    console.log(chalk.gray('  No code diff detected against baseline. AI audit passed.'));
    return { passed: true, skipped: true, report: 'No active code git diff detected against baseline (documentation edits ignored).' };
  }

  console.log(chalk.cyan('  Consulting Gemini 3.7 Flash to audit Angular code against known issues...'));

  // Default: Gemini 3.7 Flash, Fallback: Gemini 3.6 Flash, then Gemini 2.5 Flash
  const candidateModels = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = buildGeminiAuditPrompt(knowledgeBase, diffOutput, projectTree);

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt
      });

      const resultText = response.text || '';
      console.log('\n' + chalk.gray('─'.repeat(60)));
      console.log(chalk.bold(`AI Audit Report [${modelName}]:`));
      console.log(resultText);
      console.log(chalk.gray('─'.repeat(60)) + '\n');

      if (resultText.includes('VERDICT: FAILED')) {
        logError('AI Gatekeeper detected regressions or violations of resolved_issues.md!');
        console.log(chalk.red('  Commit/Push rejected: Please address the AI audit findings above.\n'));
        return { passed: false, skipped: false, report: resultText };
      } else {
        logSuccess(`AI Knowledge Base audit PASSED using ${modelName}. No known regressions detected.`);
        return { passed: true, skipped: false, report: resultText };
      }
    } catch (apiErr) {
      console.log(chalk.yellow(`  ⚠ ${modelName} returned error (${apiErr.message || apiErr}). Switching to alternative model fallback...`));
      lastError = apiErr;
      // Try next fallback model
      continue;
    }
  }

  logError(`AI Audit call error: ${lastError?.message || lastError}`);
  console.log(chalk.yellow('  Allowing commit/push with warning due to AI service error.'));
  return { passed: true, skipped: true, report: `AI Service Warning: ${lastError?.message || lastError}` };
}
