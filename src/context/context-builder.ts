import type { AgentSession } from "../session/agent-session.js";
import type { AgentContext } from "./agent-context.js";

export class ContextBuilder {
  private readonly maxTurns: number;

  constructor(maxTurns = 12) {
    this.maxTurns = maxTurns;
  }

  build(session: AgentSession): AgentContext {
    const turns = session.turns();
    const fromIndex = Math.max(0, turns.length - this.maxTurns);

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      state: { ...session.state() },
      turns: turns.slice(fromIndex)
    };
  }
}
