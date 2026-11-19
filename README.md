# ai-sdk-agent-demo

One failing test, four ways. A small demo of when you need an AI agent and when you don't, built with the [Vercel AI SDK](https://ai-sdk.dev).

`sample/` is a tiny project with a bug: an expired session throws instead of returning a 401, so one test fails. Each command below takes on that same failure with more machinery than the last.

| Command | What it does | Model calls |
| --- | --- | --- |
| `npm run rules` | Matches known signatures in the test log | None |
| `npm run prompt` | Fetches the log and the code, asks once, gets a typed diagnosis | One |
| `npm run agent` | Loops: read, edit, run the tests, read the failure, edit again | Several |
| `npm run server` | The same escalation behind `POST /runs`, streaming each step | Several |

## Quick start

You need Node 22.18 or newer. Node runs the TypeScript directly, so there is no build step.

```bash
npm install
npm run rules          # works without an API key
```

The other three commands call a model. Model strings such as `anthropic/claude-sonnet-5.5` go through the Vercel AI Gateway:

```bash
cp .env.example .env   # then set AI_GATEWAY_API_KEY
npm run prompt
npm run agent
```

To use a different model, set `MODEL` in `.env` to any model string the gateway accepts.

## What you will see

**Rules** can tell that an assertion failed. They cannot say why:

```
Kind:      assertion
Evidence:  not ok 3 - an expired session is a 401
A rule can see that it failed, not why. Escalate: npm run prompt
```

**One prompt** explains the bug. The code decides what the model reads, and the answer comes back as a typed object (`cause`, `file`, `evidence`, `confidence`), so code can branch on it.

**The agent** fixes it. Nobody hard-codes the steps; the model picks the next tool each time around the loop, and every tool call is printed as it happens. The run ends with the step count and the token counts, which is what a run costs.

**The server** is the same thing behind an HTTP route:

```bash
npm run server
curl -N -X POST localhost:3000/runs
```

It escalates in order: rules first, one prompt if the rules cannot explain the failure, then the loop.

## How it is built

| File | What it is |
| --- | --- |
| `src/rules.ts` | Step 1. Regexes over the log. |
| `src/prompt.ts` | Step 2. One `generateText` call with `Output.object` and a Zod schema. |
| `src/agent.ts` | Step 3. A `ToolLoopAgent` with a step limit. |
| `src/tools.ts` | The four tools the agent may use: `listFiles`, `readFile`, `writeFile`, `runTests`. |
| `src/workspace.ts` | The throwaway copy of `sample/` the agent works in. |
| `src/server.ts` | Step 4. A plain `node:http` server. |
| `src/cli.ts` | The three terminal commands. |

## What keeps it safe to run

- **It works on a copy.** Every run copies `sample/` to a temp directory. The real files are never touched.
- **Paths cannot leave the workspace.** Every path the model sends is resolved and checked.
- **There is no shell tool.** The agent can run one fixed command, the test suite, and nothing else.
- **Tests are read-only.** Making a test pass by editing the test is refused.
- **The loop is bounded.** It stops after 12 steps.
- **The result is checked.** After the agent says it is done, the tests are run once more, and that result is what gets reported.

## Tests

```bash
npm test
npm run typecheck
```

The tests drive the agent loop and the server with a scripted mock model (`MockLanguageModelV4` from `ai/test`), so they need no API key and cost nothing.

## What it does not do

This is a demo, small on purpose. It has no sandbox beyond a temp directory, no run store, no authentication on the server (it listens on `127.0.0.1` only), and no spend cap beyond the step limit.

## License

MIT
