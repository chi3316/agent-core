import type { AgentTurn } from "../session/agent-turn.js";
import type { SessionState } from "../session/agent-session.js";

export type AgentContext = Readonly<{
  sessionId: string;
  userId: string;
  state: Readonly<SessionState>;
  turns: readonly AgentTurn[];
}>;
