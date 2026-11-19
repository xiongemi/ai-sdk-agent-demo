import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fix } from './agent.ts';
import { diagnose } from './prompt.ts';
import { fixScript, reply, scripted } from './test-helpers.ts';
import { createWorkspace, runTests } from './workspace.ts';

describe('diagnose', () => {
  it('returns a typed diagnosis from one call', async () => {
    const model = scripted(
      reply(
        JSON.stringify({
          cause: 'checkSession throws for an expired session.',
          file: 'src/session.ts',
          evidence: 'not ok 3 - an expired session is a 401',
          confidence: 'high',
        }),
      ),
    );
    const root = await createWorkspace();

    const result = await diagnose(model, root, 'not ok 3 - an expired session is a 401');

    expect(result.diagnosis.file).toBe('src/session.ts');
    expect(result).toMatchObject({ inputTokens: 100, outputTokens: 10 });
    expect(model.doGenerateCalls).toHaveLength(1);
  });
});

describe('fix', () => {
  it('reads, edits and reruns the tests until they pass', async () => {
    const root = await createWorkspace();
    const { output: log } = await runTests(root);
    const events: string[] = [];

    const result = await fix(scripted(...fixScript()), root, log, (line) => events.push(line));

    expect(events).toEqual([
      'readFile src/session.ts',
      'writeFile src/session.ts',
      'runTests -> pass',
    ]);
    expect(result).toMatchObject({ passed: true, steps: 4, inputTokens: 400, outputTokens: 40 });
  });

  it('never touches the real sample', async () => {
    const sample = fileURLToPath(new URL('../sample/src/session.ts', import.meta.url));
    const before = await readFile(sample, 'utf8');

    const root = await createWorkspace();
    await fix(scripted(...fixScript()), root, 'log');

    expect(await readFile(sample, 'utf8')).toBe(before);
  });

  it('reports a failure when the model says done but the tests disagree', async () => {
    const root = await createWorkspace();
    const result = await fix(scripted(reply('All fixed!')), root, 'log');
    expect(result.passed).toBe(false);
  });
});
