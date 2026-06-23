import { describe, expect, it } from "vitest";
import { ContextBuilder } from "../../src/context/context-builder.js";
import { AgentLoop } from "../../src/loop/agent-loop.js";
import { FinishReason } from "../../src/loop/finish-reason.js";
import type { AgentModel } from "../../src/model/agent-model.js";
import { assistantMessage } from "../../src/model/assistant-message.js";
import type { ModelRequest } from "../../src/model/model-request.js";
import type { ModelResponse } from "../../src/model/model-response.js";
import { toolCall } from "../../src/model/tool-call.js";
import { AgentSession } from "../../src/session/agent-session.js";
import type { AgentTool } from "../../src/tools/agent-tool.js";
import type { ToolContext } from "../../src/tools/tool-context.js";
import { denyTool, type ToolPermission } from "../../src/tools/tool-permission.js";
import { toolSuccess, type ToolResult } from "../../src/tools/tool-result.js";
import { EchoTool } from "../tools/echo-tool.js";

describe("AgentLoop", () => {
  it("runs a tool call then returns the final answer", async () => {
    const session = AgentSession.create("42", "100");
    const echo = new EchoTool();
    const model = new ScriptedModel([
      {
        message: assistantMessage({
          toolCalls: [toolCall({ id: "call_1", name: "echo", argumentsJson: '{"text":"hello"}' })]
        }),
        model: "test-model",
        usage: { prompt_tokens: 1 }
      },
      {
        message: assistantMessage({ content: "final answer" }),
        model: "test-model",
        usage: { completion_tokens: 1 }
      }
    ]);

    const loop = new AgentLoop(
      model,
      new Map([[echo.name, echo]]),
      "Use tools when needed.",
      new ContextBuilder(12),
      4
    );

    const result = await loop.runTurn(session, "say hello");

    expect(result.finishReason).toBe(FinishReason.Completed);
    expect(result.content).toBe("final answer");
    expect(session.turns().map((turn) => turn.role)).toEqual([
      "user",
      "assistant",
      "tool",
      "assistant"
    ]);
    expect(session.turns()[2]?.content).toContain("hello");
    expect(model.requests[0]?.userId).toBe(42);
    expect(model.requests[0]?.sessionId).toBe(100);
  });

  it("executes tool calls in parallel and appends results in model order", async () => {
    const first = new DelayedTool("first", 20);
    const second = new DelayedTool("second", 0);
    const model = new ScriptedModel([
      {
        message: assistantMessage({
          toolCalls: [
            toolCall({ id: "call_1", name: "first", argumentsJson: "{}" }),
            toolCall({ id: "call_2", name: "second", argumentsJson: "{}" })
          ]
        }),
        usage: {}
      },
      {
        message: assistantMessage({ content: "done" }),
        usage: {}
      }
    ]);
    const session = AgentSession.create("u1", "s1");
    const loop = new AgentLoop(
      model,
      new Map([
        [first.name, first],
        [second.name, second]
      ]),
      "sys",
      new ContextBuilder(),
      4
    );

    await loop.runTurn(session, "run");

    const toolTurns = session.turns().filter((turn) => turn.role === "tool");
    expect(toolTurns.map((turn) => turn.toolName)).toEqual(["first", "second"]);
  });

  it("forces a summary when max steps is reached", async () => {
    const model = new ScriptedModel([
      {
        message: assistantMessage({ content: "summary" }),
        model: "summary-model",
        usage: { completion_tokens: 1 }
      }
    ]);
    const session = AgentSession.create("u1", "s1");
    const loop = new AgentLoop(model, new Map(), "sys", new ContextBuilder(), 0);

    const result = await loop.runTurn(session, "hello");

    expect(result.finishReason).toBe(FinishReason.ForcedSummary);
    expect(result.content).toBe("summary");
    expect(model.requests[0]?.toolChoice).toBe("none");
  });

  it("returns model error when the model call fails", async () => {
    const session = AgentSession.create("u1", "s1");
    const loop = new AgentLoop(
      new FailingModel(new Error("upstream down")),
      new Map(),
      "sys",
      new ContextBuilder(),
      4
    );

    const result = await loop.runTurn(session, "hello");

    expect(result.finishReason).toBe(FinishReason.ModelError);
    expect(result.content).toBe("Model call failed: upstream down");
    expect(session.turns().at(-1)?.role).toBe("assistant");
  });

  it("records an error result for unknown tools", async () => {
    const model = new ScriptedModel([
      {
        message: assistantMessage({
          toolCalls: [toolCall({ id: "call_1", name: "missing", argumentsJson: "{}" })]
        }),
        usage: {}
      },
      {
        message: assistantMessage({ content: "done" }),
        usage: {}
      }
    ]);
    const session = AgentSession.create("u1", "s1");
    const loop = new AgentLoop(model, new Map(), "sys", new ContextBuilder(), 4);

    await loop.runTurn(session, "run");

    expect(session.turns()[2]?.content).toContain("Unknown tool: missing");
  });

  it("records denied tool permission as a tool result", async () => {
    const tool = new DeniedTool();
    const model = new ScriptedModel([
      {
        message: assistantMessage({
          toolCalls: [toolCall({ id: "call_1", name: tool.name, argumentsJson: "{}" })]
        }),
        usage: {}
      },
      {
        message: assistantMessage({ content: "done" }),
        usage: {}
      }
    ]);
    const session = AgentSession.create("u1", "s1");
    const loop = new AgentLoop(model, new Map([[tool.name, tool]]), "sys", new ContextBuilder(), 4);

    await loop.runTurn(session, "run");

    expect(session.turns()[2]?.content).toContain("not allowed");
  });

  it("truncates large tool results", async () => {
    const tool = new LargeResultTool();
    const model = new ScriptedModel([
      {
        message: assistantMessage({
          toolCalls: [toolCall({ id: "call_1", name: tool.name, argumentsJson: "{}" })]
        }),
        usage: {}
      },
      {
        message: assistantMessage({ content: "done" }),
        usage: {}
      }
    ]);
    const session = AgentSession.create("u1", "s1");
    const loop = new AgentLoop(model, new Map([[tool.name, tool]]), "sys", new ContextBuilder(), 4);

    await loop.runTurn(session, "run");

    expect(session.turns()[2]?.content.length).toBeLessThan(1_230);
    expect(session.turns()[2]?.content).toContain("...[truncated]");
  });
});

class ScriptedModel implements AgentModel {
  readonly requests: ModelRequest[] = [];
  private index = 0;

  constructor(private readonly responses: readonly ModelResponse[]) {
  }

  async complete(request: ModelRequest): Promise<ModelResponse> {
    this.requests.push(request);
    const response = this.responses[this.index];
    this.index += 1;

    if (response == null) {
      throw new Error("No scripted response");
    }

    return response;
  }
}

class FailingModel implements AgentModel {
  constructor(private readonly error: Error) {
  }

  async complete(): Promise<ModelResponse> {
    throw this.error;
  }
}

class DelayedTool implements AgentTool<Record<string, never>, Readonly<{ name: string }>> {
  readonly description = "Returns its own name after a delay.";
  readonly inputSchema = {
    type: "object",
    properties: {}
  };

  constructor(
    readonly name: string,
    private readonly delayMs: number
  ) {
  }

  parseInput(): Record<string, never> {
    return {};
  }

  async execute(
    _input: Record<string, never>,
    _context: ToolContext
  ): Promise<ToolResult<Readonly<{ name: string }>>> {
    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    return toolSuccess({ name: this.name });
  }
}

class DeniedTool implements AgentTool<Record<string, never>, never> {
  readonly name = "denied";
  readonly description = "Always denied.";
  readonly inputSchema = {
    type: "object",
    properties: {}
  };

  parseInput(): Record<string, never> {
    return {};
  }

  async checkPermission(): Promise<ToolPermission> {
    return denyTool("not allowed");
  }

  async execute(): Promise<ToolResult<never>> {
    throw new Error("should not execute");
  }
}

class LargeResultTool implements AgentTool<Record<string, never>, Readonly<{ text: string }>> {
  readonly name = "large";
  readonly description = "Returns a large payload.";
  readonly inputSchema = {
    type: "object",
    properties: {}
  };

  parseInput(): Record<string, never> {
    return {};
  }

  async execute(): Promise<ToolResult<Readonly<{ text: string }>>> {
    return toolSuccess({ text: "x".repeat(2_000) });
  }
}
