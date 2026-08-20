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

export function getDiff(cwd = process.cwd()) {
  let diff = runGit('git diff --cached', true, cwd);
  if (!diff || diff.trim() === '') {
    diff = runGit('git diff HEAD~1', true, cwd);
  }
  if (!diff || diff.trim() === '') {
    diff = runGit('git diff origin/main...HEAD', true, cwd);
  }
  if (!diff || diff.trim() === '') {
    diff = runGit('git diff origin/master...HEAD', true, cwd);
  }
  if (!diff || diff.trim() === '') {
    diff = runGit('git diff HEAD', true, cwd);
  }
  return diff || '';
}
