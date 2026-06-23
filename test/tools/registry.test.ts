import { describe, expect, it } from "vitest";
import { Session } from "../../src/session/session.js";
import { toolContext } from "../../src/tools/tool.js";
import { enabledTools } from "../../src/tools/registry.js";
import { EchoTool } from "./echo-tool.js";

describe("tool registry", () => {
  it("returns enabled tools by name", () => {
    const tools = enabledTools([new EchoTool()], toolContext(Session.create("u1")));

    expect(tools.has("echo")).toBe(true);
  });

  it("omits disabled tools", () => {
    const tools = enabledTools([new DisabledEchoTool()], toolContext(Session.create("u1")));

    expect(tools.has("echo")).toBe(false);
  });
});

class DisabledEchoTool extends EchoTool {
  enabled(): boolean {
    return false;
  }
}
