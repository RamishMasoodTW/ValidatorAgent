import fs from 'fs';
import {
  ACTION_FILE,
  initProgressWindow,
  isProgressWindowEnabled,
  getRequestedAction,
  isForceCommitRequested,
  isCloseRequested,
  waitForUserDecisionOnFailure
} from '../src/ui/progress-window.js';

describe('Progress Window — Force Commit & User Decision System', () => {
  const origShowProgress = process.env.SHOW_PROGRESS;

  afterEach(() => {
    process.env.SHOW_PROGRESS = origShowProgress;
    try {
      if (fs.existsSync(ACTION_FILE)) {
        fs.unlinkSync(ACTION_FILE);
      }
    } catch (_) {}
  });

  test('isProgressWindowEnabled() reflects SHOW_PROGRESS env var', () => {
    process.env.SHOW_PROGRESS = 'false';
    initProgressWindow();
    expect(isProgressWindowEnabled()).toBe(false);

    process.env.SHOW_PROGRESS = 'true';
    initProgressWindow();
    expect(isProgressWindowEnabled()).toBe(true);
  });

  test('getRequestedAction() returns null when no action file exists', () => {
    process.env.SHOW_PROGRESS = 'true';
    initProgressWindow();
    expect(getRequestedAction()).toBeNull();
    expect(isForceCommitRequested()).toBe(false);
    expect(isCloseRequested()).toBe(false);
  });

  test('detects force_commit action correctly from ACTION_FILE', () => {
    process.env.SHOW_PROGRESS = 'true';
    initProgressWindow();
    fs.writeFileSync(ACTION_FILE, JSON.stringify({ action: 'force_commit' }), 'utf8');

    expect(getRequestedAction()).toBe('force_commit');
    expect(isForceCommitRequested()).toBe(true);
    expect(isCloseRequested()).toBe(false);
  });

  test('detects close action correctly from ACTION_FILE', () => {
    process.env.SHOW_PROGRESS = 'true';
    initProgressWindow();
    fs.writeFileSync(ACTION_FILE, JSON.stringify({ action: 'close' }), 'utf8');

    expect(getRequestedAction()).toBe('close');
    expect(isForceCommitRequested()).toBe(false);
    expect(isCloseRequested()).toBe(true);
  });

  test('waitForUserDecisionOnFailure() resolves immediately with close if window disabled', async () => {
    process.env.SHOW_PROGRESS = 'false';
    initProgressWindow();

    const decision = await waitForUserDecisionOnFailure();
    expect(decision).toBe('close');
  });

  test('waitForUserDecisionOnFailure() resolves with force_commit if already requested', async () => {
    process.env.SHOW_PROGRESS = 'true';
    initProgressWindow();
    fs.writeFileSync(ACTION_FILE, JSON.stringify({ action: 'force_commit' }), 'utf8');

    const decision = await waitForUserDecisionOnFailure(20);
    expect(decision).toBe('force_commit');
  });

  test('waitForUserDecisionOnFailure() polls and resolves when force_commit is written asynchronously', async () => {
    process.env.SHOW_PROGRESS = 'true';
    initProgressWindow();

    setTimeout(() => {
      fs.writeFileSync(ACTION_FILE, JSON.stringify({ action: 'force_commit' }), 'utf8');
    }, 50);

    const decision = await waitForUserDecisionOnFailure(20);
    expect(decision).toBe('force_commit');
  });

  test('waitForUserDecisionOnFailure() polls and resolves with close when close is written asynchronously', async () => {
    process.env.SHOW_PROGRESS = 'true';
    initProgressWindow();

    setTimeout(() => {
      fs.writeFileSync(ACTION_FILE, JSON.stringify({ action: 'close' }), 'utf8');
    }, 50);

    const decision = await waitForUserDecisionOnFailure(20);
    expect(decision).toBe('close');
  });

  test('initProgressWindow() clears any leftover action file before starting', () => {
    fs.writeFileSync(ACTION_FILE, JSON.stringify({ action: 'force_commit' }), 'utf8');
    expect(fs.existsSync(ACTION_FILE)).toBe(true);

    process.env.SHOW_PROGRESS = 'true';
    initProgressWindow();
    expect(fs.existsSync(ACTION_FILE)).toBe(false);
  });
});
