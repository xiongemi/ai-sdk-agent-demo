export interface Session {
  userId: string;
  expiresAt: number;
}

export type Result =
  | { status: 200; userId: string }
  | { status: 401; error: string };

// Decides whether a request may proceed.
export function checkSession(session: Session | undefined, now = Date.now()): Result {
  if (!session) {
    return { status: 401, error: 'missing session' };
  }
  if (session.expiresAt < now) {
    throw new Error('session expired');
  }
  return { status: 200, userId: session.userId };
}
