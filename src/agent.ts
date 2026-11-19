// Step 3: the loop. The model picks the next tool each time around:
// read, edit, run the tests, read the failure, edit again.
import { ToolLoopAgent, isStepCount, type LanguageModel } from 'ai';
import { createTools, type OnEvent } from './tools.ts';
import { runTests } from './workspace.ts';

export async function fix(model: LanguageModel, root: string, log: string, onEvent?: OnEvent) {
  const agent = new ToolLoopAgent({
    model,
    instructions: `You fix failing tests in a small project.
      Read the code before you change it. Make the smallest change that fixes the bug.
      After every change, run the tests. Stop when they pass.
      Finish with one or two sentences on what was wrong and what you changed.`,
    tools: createTools(root, onEvent),
    // The ceiling on a confused run, and on its cost.
    stopWhen: isStepCount(12),
  });

  const { text, steps, totalUsage } = await agent.generate({
    prompt: `The test suite is failing. Fix it.\n\nTest log:\n${log}`,
  });

  // Do not take the model's word for it. Run the tests one more time.
  const { passed } = await runTests(root);

  return {
    text,
    passed,
    steps: steps.length,
    inputTokens: totalUsage.inputTokens ?? 0,
    outputTokens: totalUsage.outputTokens ?? 0,
  };
}
