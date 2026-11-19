// Step 1: no model. Known failures have signatures, and a signature is a regex.
export type Kind = 'timeout' | 'out-of-memory' | 'syntax' | 'assertion' | 'unknown';

export interface Classification {
  kind: Kind;
  evidence?: string; // the log line the rule matched
  canExplain: boolean; // false means: escalate to a model
}

const RULES: { kind: Kind; pattern: RegExp; canExplain: boolean }[] = [
  { kind: 'timeout', pattern: /timed out|ETIMEDOUT|test timed out/i, canExplain: true },
  { kind: 'out-of-memory', pattern: /heap out of memory|OOMKilled|ENOMEM/i, canExplain: true },
  { kind: 'syntax', pattern: /SyntaxError|ERR_MODULE_NOT_FOUND/, canExplain: true },
  // A rule can see that an assertion failed. It cannot say why.
  { kind: 'assertion', pattern: /AssertionError|ERR_ASSERTION|^not ok /m, canExplain: false },
];

export function classify(log: string): Classification {
  for (const { kind, pattern, canExplain } of RULES) {
    const line = log.split('\n').find((candidate) => pattern.test(candidate));
    if (line) return { kind, evidence: line.trim(), canExplain };
  }
  return { kind: 'unknown', canExplain: false };
}
