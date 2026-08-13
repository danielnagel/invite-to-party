import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// `e2e/` sits next to `backend/`, `frontend/` and `docker-compose.yml` at the
// repo root, so the compose file lives one directory above this file.
const repoRoot = path.resolve(fileURLToPath(import.meta.url), '../..');

/**
 * Runs an npm script of the backend CLI (`src/cli/*.js`) inside the already
 * running `backend` container via `docker compose exec`, exactly like an
 * admin would in real usage - hosts are only ever created this way, there is
 * no self-registration (see plan, Roles & core flows / Backend CLI
 * sections). Returns the captured stdout.
 */
export function runBackendCli(npmScript, args = []) {
  const dockerArgs = ['compose', 'exec', '-T', 'backend', 'npm', 'run', npmScript];
  if (args.length > 0) {
    dockerArgs.push('--', ...args);
  }

  const result = spawnSync('docker', dockerArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  if (result.error) {
    throw new Error(
      `Could not run "docker compose exec backend npm run ${npmScript}": ${result.error.message}`,
    );
  }

  if (result.status !== 0) {
    throw new Error(
      `"docker compose exec backend npm run ${npmScript}" failed (exit code ${result.status}).\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    );
  }

  return result.stdout;
}
