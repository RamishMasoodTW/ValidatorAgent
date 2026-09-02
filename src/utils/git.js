import { execSync } from 'child_process';

export function runGit(command, allowFail = false, cwd = process.cwd()) {
  try {
    return execSync(command, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    }).trim();
  } catch (err) {
    if (!allowFail) {
      throw err;
    }
    return '';
  }
}

export function getCurrentBranch(cwd = process.cwd()) {
  return runGit('git rev-parse --abbrev-ref HEAD', true, cwd) || 'main';
}

export function getDiff(cwd = process.cwd(), excludeResolvedIssues = true) {
  const excludeArg = excludeResolvedIssues ? '":(exclude)resolved_issues.md" ":(exclude)package-lock.json"' : '';
  let diff = runGit(`git diff --cached -- . ${excludeArg}`, true, cwd);
  if (!diff || diff.trim() === '') {
    diff = runGit(`git diff HEAD~1 -- . ${excludeArg}`, true, cwd);
  }
  if (!diff || diff.trim() === '') {
    diff = runGit(`git diff origin/main...HEAD -- . ${excludeArg}`, true, cwd);
  }
  if (!diff || diff.trim() === '') {
    diff = runGit(`git diff origin/master...HEAD -- . ${excludeArg}`, true, cwd);
  }
  if (!diff || diff.trim() === '') {
    diff = runGit(`git diff HEAD -- . ${excludeArg}`, true, cwd);
  }
  return diff || '';
}

export function getProjectStructureTree(cwd = process.cwd()) {
  try {
    const output = runGit('git ls-tree -r --name-only HEAD', true, cwd);
    if (output) {
      const files = output.split('\n').filter(f => !f.includes('node_modules') && !f.includes('dist') && !f.startsWith('.git'));
      return files.slice(0, 150).join('\n');
    }
  } catch (_) {}
  return '';
}

export function getStagedFiles(cwd = process.cwd()) {
  const output = runGit('git diff --cached --name-only --diff-filter=ACM', true, cwd);
  if (!output) return [];
  return output.split('\n').map(f => f.trim()).filter(Boolean);
}
