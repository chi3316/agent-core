import type { AgentSession } from "../session/agent-session.js";

export type ToolContext = Readonly<{
  session: AgentSession;
}>;

export function toolContext(session: AgentSession): ToolContext {
  return { session };
}
