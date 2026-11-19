import { describe, expect, it } from 'vitest';
import { classify } from './rules.ts';

describe('classify', () => {
  it('answers a timeout without a model', () => {
    expect(classify('step 3\nError: test timed out after 30000ms\n')).toEqual({
      kind: 'timeout',
      evidence: 'Error: test timed out after 30000ms',
      canExplain: true,
    });
  });

  it('answers out of memory without a model', () => {
    expect(classify('FATAL ERROR: JavaScript heap out of memory').kind).toBe('out-of-memory');
  });

  it('sees a failed assertion but cannot explain it', () => {
    const result = classify('ok 1 - passes\nnot ok 2 - an expired session is a 401\n');
    expect(result).toMatchObject({ kind: 'assertion', canExplain: false });
  });

  it('escalates what it does not recognise', () => {
    expect(classify('something odd happened')).toEqual({ kind: 'unknown', canExplain: false });
  });
});
