import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { GoogleGenAI } from '@google/genai';
import { logStep, logSuccess, logError, logWarning } from '../utils/logger.js';
import { getDiff } from '../utils/git.js';

/**
 * Generate the Senior Angular Architect & Security Gatekeeper prompt
 */
export function buildGeminiAuditPrompt(knowledgeBase, diffOutput) {
  return `
You are a Principal Angular Architect, DevSecOps Specialist, and Code Quality Gatekeeper.
Your job is to audit incoming Git code changes in an Angular application against our repository's historical Knowledge Base of previously resolved issues, anti-patterns, bugs, and architecture rules.

### HISTORICAL RESOLVED ISSUES KNOWLEDGE BASE:
\`\`\`markdown
${knowledgeBase.slice(0, 15000)}
\`\`\`

### INCOMING GIT DIFF:
\`\`\`diff
${diffOutput.slice(0, 25000)}
\`\`\`

### ANGULAR AUDIT CRITERIA:
1. Thoroughly analyze the Git diff against each rule/bug in the Knowledge Base.
2. Specifically check for critical Angular regressions:
   - Unhandled RxJS subscription memory leaks (missing takeUntilDestroyed / async pipe).
   - Direct DOM mutations (e.g. element.nativeElement.innerHTML or document.getElementById) bypassing Angular renderer/templates.
   - Any violation of documented business rules, security rules, or architectural standards in resolved_issues.md.
3. If the diff reintroduces any previously resolved bugs or violates forbidden patterns:
   - Output: "VERDICT: FAILED"
   - Provide a concise list of specific violations with line numbers or code snippets from the diff, explaining why it violates the rule and how to fix it in Angular.
4. If the diff is clean and adheres to all documented best practices:
   - Output: "VERDICT: PASSED"
   - Provide a 1-2 sentence positive summary.

Ensure your response clearly includes either "VERDICT: PASSED" or "VERDICT: FAILED" in capital letters.
`;
}

/**
 * Step 7: AI Knowledge Base Audit (Gemini 2.5 Flash)
 */
export async function runAiKnowledgeBaseAudit(apiKey, cwd = process.cwd()) {
  logStep(7, 'Angular AI Knowledge Base Regression Audit (Gemini 2.5 Flash)');
  const resolvedIssuesPath = path.join(cwd, 'resolved_issues.md');

  if (!fs.existsSync(resolvedIssuesPath)) {
    console.log(chalk.gray('  No resolved_issues.md found at repository root. AI audit skipped.'));
    return;
  }

  if (!apiKey) {
    logWarning('resolved_issues.md detected, but GEMINI_API_KEY is not set in environment or config.');
    console.log(chalk.gray('  To enable AI audits, run AngularGatekeeperSetup.exe or set GEMINI_API_KEY.'));
    return;
  }

  const knowledgeBase = fs.readFileSync(resolvedIssuesPath, 'utf8');
  console.log(chalk.blue('  Reading git diff for current Angular changes...'));

  const diffOutput = getDiff(cwd);

  if (!diffOutput || diffOutput.trim() === '') {
    console.log(chalk.gray('  No diff detected against baseline. AI audit passed.'));
    return;
  }

  console.log(chalk.cyan('  Consulting Gemini 2.5 Flash to audit Angular code against known issues...'));
  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildGeminiAuditPrompt(knowledgeBase, diffOutput);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    const resultText = response.text || '';
    console.log('\n' + chalk.gray('─'.repeat(60)));
    console.log(chalk.bold('AI Audit Report:'));
    console.log(resultText);
    console.log(chalk.gray('─'.repeat(60)) + '\n');

    if (resultText.includes('VERDICT: FAILED')) {
      logError('AI Gatekeeper detected regressions or violations of resolved_issues.md!');
      console.log(chalk.red('  Commit/Push rejected: Please address the AI audit findings above.\n'));
      process.exit(1);
    } else {
      logSuccess('AI Knowledge Base audit PASSED. No known regressions detected.');
    }
  } catch (apiErr) {
    logError(`AI Audit call error: ${apiErr.message || apiErr}`);
    console.log(chalk.yellow('  Allowing commit/push with warning due to AI service error.'));
  }
}
