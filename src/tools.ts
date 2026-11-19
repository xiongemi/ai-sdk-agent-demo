// Everything the agent is allowed to do. The workspace is never a tool input:
// it is fixed when the tools are created, so no prompt can point them elsewhere.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tool } from 'ai';
import { z } from 'zod';
import { listFiles, resolveInside, runTests } from './workspace.ts';

export type OnEvent = (line: string) => void;

export function createTools(root: string, onEvent: OnEvent = () => {}) {
  return {
    listFiles: tool({
      description: 'List every file in the project.',
      inputSchema: z.object({}),
      execute: async () => {
        onEvent('listFiles');
        return listFiles(root);
      },
    }),

    readFile: tool({
      description: 'Read one file from the project.',
      inputSchema: z.object({ path: z.string().describe('Path relative to the project root') }),
      execute: async ({ path: file }) => {
        onEvent(`readFile ${file}`);
        return readFile(resolveInside(root, file), 'utf8');
      },
    }),

    writeFile: tool({
      description: 'Replace one source file with new content. Tests cannot be changed.',
      inputSchema: z.object({
        path: z.string().describe('Path relative to the project root'),
        content: z.string().describe('The whole file, not a diff'),
      }),
      execute: async ({ path: file, content }) => {
        onEvent(`writeFile ${file}`);
        const full = resolveInside(root, file);
        // Making a test pass by editing the test is not a fix.
        if (path.relative(root, full).split(path.sep)[0] === 'test') {
          throw new Error('Tests are read-only. Fix the source instead.');
        }
        await mkdir(path.dirname(full), { recursive: true });
        await writeFile(full, content);
        return { written: file };
      },
    }),

    runTests: tool({
      description: 'Run the test suite. Returns whether it passed and the end of the log.',
      inputSchema: z.object({}),
      execute: async () => {
        const result = await runTests(root);
        onEvent(`runTests -> ${result.passed ? 'pass' : 'fail'}`);
        return result;
      },
    }),
  };
}
