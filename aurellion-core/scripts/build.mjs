import { execFileSync } from 'node:child_process';
import {
  rmSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(scriptDir, '..');
const distDir = path.join(workspaceDir, 'dist');

rmSync(distDir, { recursive: true, force: true });

execFileSync('bun', ['build', './src/index.ts', '--outdir', './dist', '--target', 'node', '--format', 'esm'], {
  cwd: workspaceDir,
  stdio: 'inherit',
});
