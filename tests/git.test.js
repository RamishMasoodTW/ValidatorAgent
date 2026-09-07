/**
 * Unit Tests: src/utils/git.js
 */

import {
  getCurrentBranch,
  getStagedFiles,
  getDiff,
  getProjectStructureTree,
  runGit
} from '../src/utils/git.js';

describe('Git utility functions', () => {
  test('getCurrentBranch() returns a non-empty string in active git repo', () => {
    const branch = getCurrentBranch(process.cwd());
    expect(typeof branch).toBe('string');
    expect(branch.length).toBeGreaterThan(0);
  });

  test('getStagedFiles() returns an array', () => {
    const staged = getStagedFiles(process.cwd());
    expect(Array.isArray(staged)).toBe(true);
  });

  test('getDiff() returns string diff without throwing', () => {
    const diff = getDiff(process.cwd());
    expect(typeof diff).toBe('string');
  });

  test('getProjectStructureTree() returns string project structure', () => {
    const tree = getProjectStructureTree(process.cwd());
    expect(typeof tree).toBe('string');
  });

  test('runGit() returns trimmed string on valid command', () => {
    const out = runGit('git status --short', true, process.cwd());
    expect(typeof out).toBe('string');
  });

  test('runGit() returns empty string on failure when allowFail is true', () => {
    const out = runGit('git non-existent-command-xyz', true, process.cwd());
    expect(out).toBe('');
  });

  test('runGit() throws error on failure when allowFail is false', () => {
    expect(() => runGit('git non-existent-command-xyz', false, process.cwd())).toThrow();
  });
});

