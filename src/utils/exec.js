import { spawn } from 'child_process';

/**
 * Executes a shell command with live real-time streaming of stdout and stderr.
 * Writes each chunk to process.stdout / process.stderr as it arrives, ensuring
 * that hooked listeners (WPF Progress Window and terminal/IDE) receive live updates.
 *
 * @param {string} command - Shell command to execute
 * @param {object} options - Options: cwd, env, onData callback
 * @returns {Promise<{stdout: string, stderr: string, combined: string, code: number}>}
 */
export function execStreaming(command, options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    onData = null
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

    const handleChunk = (chunk, isStderr = false) => {
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
      reject(err);
    });

    child.on('close', code => {
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
