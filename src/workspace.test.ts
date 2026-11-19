import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createTools } from './tools.ts';
import { createWorkspace, listFiles, resolveInside, runTests } from './workspace.ts';

const options = { toolCallId: 'call_0', messages: [] } as never;

describe('workspace', () => {
  it('is a copy of the sample, and the sample fails its tests', async () => {
    const root = await createWorkspace();
    expect(await listFiles(root)).toEqual([
      'package.json',
      'src/session.ts',
      'test/session.test.ts',
    ]);

    const { passed, output } = await runTests(root);
    expect(passed).toBe(false);
    expect(output).toContain('an expired session is a 401');
  });

  it('keeps paths inside the workspace', () => {
    expect(() => resolveInside('/tmp/ws', '../etc/passwd')).toThrow('outside the workspace');
    expect(() => resolveInside('/tmp/ws', '/etc/passwd')).toThrow('outside the workspace');
    expect(resolveInside('/tmp/ws', 'src/a.ts')).toBe('/tmp/ws/src/a.ts');
  });
});

describe('tools', () => {
  it('cannot read outside the workspace', async () => {
    const tools = createTools(await createWorkspace());
    await expect(tools.readFile.execute!({ path: '../../etc/hosts' }, options)).rejects.toThrow(
      'outside the workspace',
    );
  });

  it('cannot edit the tests', async () => {
    const root = await createWorkspace();
    const tools = createTools(root);
    const before = await readFile(`${root}/test/session.test.ts`, 'utf8');

    await expect(
      tools.writeFile.execute!({ path: 'test/session.test.ts', content: '' }, options),
    ).rejects.toThrow('read-only');
    expect(await readFile(`${root}/test/session.test.ts`, 'utf8')).toBe(before);
  });
});
