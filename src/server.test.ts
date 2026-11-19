import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from './server.ts';
import { fixScript, reply, scripted } from './test-helpers.ts';

let close: (() => void) | undefined;
afterEach(() => close?.());

async function start(model: Parameters<typeof createApp>[0]) {
  const app = createApp(model);
  await new Promise<void>((resolve) => app.listen(0, '127.0.0.1', resolve));
  close = () => app.close();
  return `http://127.0.0.1:${(app.address() as AddressInfo).port}`;
}

describe('POST /runs', () => {
  it('escalates from rules to one prompt to the agent, and streams each step', async () => {
    const diagnosis = reply(
      JSON.stringify({
        cause: 'checkSession throws for an expired session.',
        file: 'src/session.ts',
        evidence: 'not ok 3',
        confidence: 'high',
      }),
    );
    const url = await start(scripted(diagnosis, ...fixScript()));

    const lines = (await (await fetch(`${url}/runs`, { method: 'POST' })).text()).trim().split('\n');

    expect(lines[0]).toMatch(/^run_\w+ started$/);
    expect(lines.slice(1, -2)).toEqual([
      'rules: assertion',
      'prompt: checkSession throws for an expired session.',
      'agent: readFile src/session.ts',
      'agent: writeFile src/session.ts',
      'agent: runTests -> pass',
    ]);
    expect(lines.at(-1)).toMatch(/completed: 4 steps, 400 tokens in, 40 out$/);
  });

  it('answers anything else with a 404', async () => {
    const url = await start(scripted());
    expect((await fetch(`${url}/health`)).status).toBe(404);
  });
});
