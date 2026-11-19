// One failing test, three ways. Usage: node src/cli.ts <rules|prompt|agent>
import { fix } from './agent.ts';
import { model } from './model.ts';
import { diagnose } from './prompt.ts';
import { classify } from './rules.ts';
import { createWorkspace, runTests } from './workspace.ts';

const mode = process.argv[2];
if (mode !== 'rules' && mode !== 'prompt' && mode !== 'agent') {
  console.error('Usage: node src/cli.ts <rules|prompt|agent>');
  process.exit(1);
}

const root = await createWorkspace();
const { passed, output: log } = await runTests(root);
console.log(`Workspace: ${root}`);
console.log(`Tests: ${passed ? 'pass' : 'fail'}\n`);

if (mode === 'rules') {
  const result = classify(log);
  console.log(`Kind:      ${result.kind}`);
  console.log(`Evidence:  ${result.evidence ?? '(none)'}`);
  console.log(
    result.canExplain
      ? 'A rule can answer this one. No model call.'
      : 'A rule can see that it failed, not why. Escalate: npm run prompt',
  );
}

if (mode === 'prompt') {
  const { diagnosis, inputTokens, outputTokens } = await diagnose(model, root, log);
  console.log(`Cause:      ${diagnosis.cause}`);
  console.log(`File:       ${diagnosis.file}`);
  console.log(`Evidence:   ${diagnosis.evidence}`);
  console.log(`Confidence: ${diagnosis.confidence}`);
  console.log(`\n1 model call, ${inputTokens} tokens in, ${outputTokens} out (${model})`);
  console.log('It can explain the bug. It cannot fix it or check a fix: npm run agent');
}

if (mode === 'agent') {
  let step = 0;
  const result = await fix(model, root, log, (line) => console.log(`  ${++step}. ${line}`));
  console.log(`\n${result.text}`);
  console.log(`\nTests: ${result.passed ? 'pass' : 'STILL FAILING'}`);
  console.log(
    `${result.steps} steps, ${result.inputTokens} tokens in, ${result.outputTokens} out (${model})`,
  );
  process.exitCode = result.passed ? 0 : 1;
}
