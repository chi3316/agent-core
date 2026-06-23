import { describe, expect, it } from "vitest";
import { AgentSession } from "../../src/session/agent-session.js";
import { ToolRegistry } from "../../src/tools/tool-registry.js";
import { EchoTool } from "./echo-tool.js";

describe("ToolRegistry", () => {
  it("returns enabled tools by name", () => {
    const registry = new ToolRegistry([new EchoTool()]);

    expect(registry.getTools(AgentSession.create("u1")).has("echo")).toBe(true);
  });

  it("omits disabled tools", () => {
    const registry = new ToolRegistry([new DisabledEchoTool()]);

    expect(registry.getTools(AgentSession.create("u1")).has("echo")).toBe(false);
  });
});

class DisabledEchoTool extends EchoTool {
  isEnabled(): boolean {
    return false;
  }
}
