// Step 2: one model call. Code fetches the context, the model returns a typed answer.
import { readFile } from 'node:fs/promises';
import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import { listFiles, resolveInside } from './workspace.ts';

const Diagnosis = z.object({
  cause: z.string().describe('What broke, in one or two sentences'),
  file: z.string().describe('The file that needs to change'),
  evidence: z.string().describe('The log line you are relying on, quoted'),
  confidence: z.enum(['high', 'low']),
});
export type Diagnosis = z.infer<typeof Diagnosis>;

export async function diagnose(model: LanguageModel, root: string, log: string) {
  // The project is tiny, so "fetch the context" is "read every file".
  // On a real repo this is the log tail and the commit's diff.
  const files = await Promise.all(
    (await listFiles(root)).map(async (file) => {
      const content = await readFile(resolveInside(root, file), 'utf8');
      return `--- ${file}\n${content}`;
    }),
  );

  const { output, usage } = await generateText({
    model,
    output: Output.object({ schema: Diagnosis }),
    prompt: `A test run failed. Say what broke. Never guess: quote the log line you rely on.

Test log:
${log}

Files:
${files.join('\n\n')}`,
  });

  return {
    diagnosis: output,
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  };
}
