// A scripted model for tests: no network, no tokens.
import { MockLanguageModelV4 } from 'ai/test';

type ToolCall = { toolName: string; input: unknown };

// One model reply: plain text, or a list of tool calls.
export function reply(content: string | ToolCall[]) {
  const isText = typeof content === 'string';
  return {
    content: isText
      ? [{ type: 'text' as const, text: content }]
      : content.map((call, i) => ({
          type: 'tool-call' as const,
          toolCallId: `call_${i}`,
          toolName: call.toolName,
          input: JSON.stringify(call.input),
        })),
    finishReason: { unified: isText ? ('stop' as const) : ('tool-calls' as const), raw: undefined },
    usage: {
      inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 10, text: 10, reasoning: undefined },
    },
    warnings: [],
  };
}

export const scripted = (...replies: ReturnType<typeof reply>[]) =>
  new MockLanguageModelV4({ doGenerate: replies });

// What a correct fix writes to src/session.ts
export const FIXED_SESSION = `export interface Session {
  userId: string;
  expiresAt: number;
}

export type Result =
  | { status: 200; userId: string }
  | { status: 401; error: string };

export function checkSession(session: Session | undefined, now = Date.now()): Result {
  if (!session) {
    return { status: 401, error: 'missing session' };
  }
  if (session.expiresAt < now) {
    return { status: 401, error: 'session expired' };
  }
  return { status: 200, userId: session.userId };
}
`;

// The model's side of a successful fix: read, write, run the tests, answer.
export const fixScript = () => [
  reply([{ toolName: 'readFile', input: { path: 'src/session.ts' } }]),
  reply([{ toolName: 'writeFile', input: { path: 'src/session.ts', content: FIXED_SESSION } }]),
  reply([{ toolName: 'runTests', input: {} }]),
  reply('Expired sessions threw instead of returning a 401. They return a 401 now.'),
];
