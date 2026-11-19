// Where the agent works: a throwaway copy of sample/, never the real files.
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE = fileURLToPath(new URL('../sample', import.meta.url));

export async function createWorkspace() {
  const root = await mkdtemp(path.join(tmpdir(), 'agent-demo-'));
  await cp(SAMPLE, root, { recursive: true });
  return root;
}

// Every path the model sends goes through here. It can never leave the workspace.
export function resolveInside(root: string, relative: string) {
  const full = path.resolve(root, relative);
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error(`${relative} is outside the workspace`);
  }
  return full;
}

export async function listFiles(root: string) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)))
    .sort();
}

export interface TestRun {
  passed: boolean;
  output: string;
}

// The one command the agent can run. It is fixed: the model does not get a shell.
export function runTests(root: string): Promise<TestRun> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      ['--test', 'test/*.test.ts'],
      { cwd: root, timeout: 30_000 },
      (error, stdout, stderr) => {
        // Logs are long. Keep the tail, where the failure is.
        const output = `${stdout}${stderr}`.split('\n').slice(-120).join('\n');
        resolve({ passed: !error, output });
      },
    );
  });
}
