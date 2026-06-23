import type { Session } from "../session/session.js";
import type { Turn } from "../session/session.js";
import type { SessionState } from "../session/session.js";

export type Context = Readonly<{
  sessionId: string;
  userId: string;
  state: Readonly<SessionState>;
  turns: readonly Turn[];
}>;

export type ContextOptions = Readonly<{
  maxTurns?: number;
}>;

export function buildContext(
  session: Session,
  options: ContextOptions = {}
): Context {
  const maxTurns = options.maxTurns ?? 12;
  const turns = session.turns();
  const fromIndex = Math.max(0, turns.length - maxTurns);

  return {
    sessionId: session.sessionId,
    userId: session.userId,
    state: { ...session.state() },
    turns: turns.slice(fromIndex)
  };
}
