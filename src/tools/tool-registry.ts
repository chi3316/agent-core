import type { AgentSession } from "../session/agent-session.js";
import type { AgentTool } from "./agent-tool.js";

export class ToolRegistry {
  private readonly tools: readonly AgentTool[];

  constructor(tools: readonly AgentTool[]) {
    this.tools = [...tools];
  }

  getTools(session: AgentSession): ReadonlyMap<string, AgentTool> {
    const enabledTools = new Map<string, AgentTool>();

    for (const tool of this.tools) {
      if (tool.isEnabled == null || tool.isEnabled(session)) {
        enabledTools.set(tool.name, tool);
      }
    }

    return enabledTools;
  }
}
