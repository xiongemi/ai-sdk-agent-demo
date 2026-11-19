import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkSession } from '../src/session.ts';

const now = 1_000_000;

test('a valid session passes', () => {
  assert.deepEqual(checkSession({ userId: 'u1', expiresAt: now + 1 }, now), {
    status: 200,
    userId: 'u1',
  });
});

test('a missing session is a 401', () => {
  assert.deepEqual(checkSession(undefined, now), { status: 401, error: 'missing session' });
});

test('an expired session is a 401', () => {
  assert.deepEqual(checkSession({ userId: 'u1', expiresAt: now - 1 }, now), {
    status: 401,
    error: 'session expired',
  });
});
