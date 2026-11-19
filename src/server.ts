// Step 4: the same agent on a server. A request comes in, the run starts,
// and each step is streamed back as a line.
//
//   curl -N -X POST localhost:3000/runs
import { createServer, type Server } from 'node:http';
import type { LanguageModel } from 'ai';
import { fix } from './agent.ts';
import { model as defaultModel } from './model.ts';
import { diagnose } from './prompt.ts';
import { classify } from './rules.ts';
import { createWorkspace, runTests } from './workspace.ts';

export function createApp(model: LanguageModel = defaultModel): Server {
  return createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/runs') {
      res.writeHead(404).end('POST /runs\n');
      return;
    }

    const runId = `run_${crypto.randomUUID().slice(0, 8)}`;
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    const send = (line: string) => res.write(`${line}\n`);

    try {
      send(`${runId} started`);
      const root = await createWorkspace();
      const { passed, output: log } = await runTests(root);
      if (passed) {
        send('tests pass, nothing to do');
        return;
      }

      // Escalate: rules first, then one prompt, then the loop.
      const rule = classify(log);
      send(`rules: ${rule.kind}`);
      if (rule.canExplain) {
        send(`done without a model: ${rule.evidence}`);
        return;
      }

      const { diagnosis } = await diagnose(model, root, log);
      send(`prompt: ${diagnosis.cause}`);

      const result = await fix(model, root, log, (line) => send(`agent: ${line}`));
      send(result.text);
      send(
        `${runId} ${result.passed ? 'completed' : 'failed'}: ${result.steps} steps, ` +
          `${result.inputTokens} tokens in, ${result.outputTokens} out`,
      );
    } catch (error) {
      // A run that fails silently is worse than no run.
      send(`${runId} failed: ${String(error)}`);
    } finally {
      res.end();
    }
  });
}

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000);
  // Local demo: listen on this machine only.
  createApp().listen(port, '127.0.0.1', () => {
    console.log(`Listening. Try: curl -N -X POST localhost:${port}/runs`);
  });
}
