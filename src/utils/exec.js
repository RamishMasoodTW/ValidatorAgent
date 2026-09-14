import { spawn, execSync } from 'child_process';
import {
  isSkipStepRequested,
  isForceCommitRequested,
  isCloseRequested
} from '../ui/progress-window.js';

/**
 * Executes a shell command with live real-time streaming of stdout and stderr.
 * Writes each chunk to process.stdout / process.stderr as it arrives, ensuring
 * that hooked listeners (WPF Progress Window and terminal/IDE) receive live updates.
 *
 * @param {string} command - Shell command to execute
 * @param {object} options - Options: cwd, env, onData callback, stepNum
 * @returns {Promise<{stdout: string, stderr: string, combined: string, code: number}>}
 */
export function execStreaming(command, options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    onData = null,
    stepNum = null
  } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      env: {
        ...env,
        FORCE_COLOR: '0',
        CI: 'true'
      },
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';
    let combined = '';
    let hasTerminated = false;
    let abortInterval = null;

    const cleanup = () => {
      if (abortInterval) {
        clearInterval(abortInterval);
        abortInterval = null;
      }
    };

    const killChild = () => {
      if (child.pid) {
        if (process.platform === 'win32') {
          try {
            execSync(`taskkill /pid ${child.pid} /f /t`, { stdio: 'ignore' });
          } catch (_) {}
        } else {
          try {
            child.kill('SIGTERM');
          } catch (_) {}
        }
      }
    };

    if (stepNum || options.abortable) {
      abortInterval = setInterval(() => {
        if (stepNum && isSkipStepRequested(stepNum)) {
          if (hasTerminated) return;
          hasTerminated = true;
          cleanup();
          killChild();
          const err = new Error(`Step ${stepNum} skipped by developer`);
          err.isSkipped = true;
          err.step = stepNum;
          reject(err);
        } else if (isForceCommitRequested()) {
          if (hasTerminated) return;
          hasTerminated = true;
          cleanup();
          killChild();
          const err = new Error('Force commit requested by developer');
          err.isForceCommit = true;
          reject(err);
        } else if (isCloseRequested()) {
          if (hasTerminated) return;
          hasTerminated = true;
          cleanup();
          killChild();
          const err = new Error('Window closed by developer');
          err.isClose = true;
          reject(err);
        }
      }, 100);
    }

    const handleChunk = (chunk, isStderr = false) => {
      if (hasTerminated) return;
      const text = chunk.toString('utf8');
      if (isStderr) {
        stderr += text;
        process.stderr.write(text);
      } else {
        stdout += text;
        process.stdout.write(text);
      }
      combined += text;

      if (onData) {
        try {
          onData(text, isStderr);
        } catch (_) {}
      }
    };

    if (child.stdout) {
      child.stdout.on('data', chunk => handleChunk(chunk, false));
    }
    if (child.stderr) {
      child.stderr.on('data', chunk => handleChunk(chunk, true));
    }

    child.on('error', err => {
      if (hasTerminated) return;
      hasTerminated = true;
      cleanup();
      reject(err);
    });

    child.on('close', code => {
      if (hasTerminated) return;
      hasTerminated = true;
      cleanup();
      if (code === 0) {
        resolve({ stdout, stderr, combined, code });
      } else {
        const error = new Error(`Command failed with exit code ${code}: ${command}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        error.combined = combined;
        error.stepOutput = combined || error.message;
        reject(error);
      }
    });
  });
}

