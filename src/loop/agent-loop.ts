import type { ContextBuilder } from "../context/context-builder.js";
import type { AgentModel } from "../model/agent-model.js";
import { needsFollowUp } from "../model/assistant-message.js";
import type { ModelRequest, ToolChoice } from "../model/model-request.js";
import {
  buildOpenAiMessages,
  toOpenAiToolDefinition
} from "../model/openai-adapter.js";
import type { ToolCall } from "../model/tool-call.js";
import { AgentSession } from "../session/agent-session.js";
import { assistantTurn, toolTurn } from "../session/agent-turn.js";
import { callTool, type AgentTool, type ShapedToolResult, type ToolArgs } from "../tools/agent-tool.js";
import type { AgentLoopResult, Usage } from "./agent-loop-result.js";
import { FinishReason } from "./finish-reason.js";

const MAX_TOOL_RESULT_CHARS = 1_200;

export class AgentLoop {
  private readonly tools: ReadonlyMap<string, AgentTool>;

  constructor(
    private readonly model: AgentModel,
    tools: ReadonlyMap<string, AgentTool> | Readonly<Record<string, AgentTool>>,
    private readonly systemPrompt: string,
    private readonly contextBuilder: ContextBuilder,
    private readonly maxSteps: number
  ) {
    this.tools = tools instanceof Map ? new Map(tools) : new Map(Object.entries(tools));
  }

  async runTurn(session: AgentSession, userMessage: string): Promise<AgentLoopResult> {
    session.appendUser(userMessage);
    return this.runIterations(session, 0, undefined, {});
  }

  private async runIterations(
    session: AgentSession,
    turnCount: number,
    lastModel: string | undefined,
    lastUsage: Usage
  ): Promise<AgentLoopResult> {
    if (turnCount >= this.maxSteps) {
      return this.forceSummary(session, turnCount, lastModel, lastUsage);
    }

    try {
      const response = await this.model.complete(this.prepareModelRequest(session, "auto"));
      const message = response.message;

      if (!needsFollowUp(message)) {
        session.append(assistantTurn({
          content: message.content,
          model: response.model,
          usage: response.usage
        }));
        return {
          content: message.content,
          model: response.model,
          usage: response.usage,
          finishReason: FinishReason.Completed,
          turnCount
        };
      }

      session.append(assistantTurn({
        content: message.content,
        toolCalls: message.toolCalls,
        model: response.model,
        usage: response.usage
      }));

      await this.executeTools(session, message.toolCalls);
      return this.runIterations(session, turnCount + 1, response.model, response.usage);
    } catch (error) {
      const content = `Model call failed: ${rootMessage(error)}`;
      session.append(assistantTurn({
        content,
        model: lastModel,
        usage: lastUsage
      }));
      return {
        content,
        model: lastModel,
        usage: lastUsage,
        finishReason: FinishReason.ModelError,
        turnCount
      };
    }
  }

  private prepareModelRequest(session: AgentSession, toolChoice: ToolChoice): ModelRequest {
    const context = this.contextBuilder.build(session);

    return {
      messages: buildOpenAiMessages({
        systemPrompt: this.systemPrompt,
        context
      }),
      tools: [...this.tools.values()].map(toOpenAiToolDefinition),
      toolChoice,
      userId: session.numericUserId(),
      sessionId: session.numericSessionId()
    };
  }

  private async executeTools(session: AgentSession, toolCalls: readonly ToolCall[]): Promise<void> {
    const turns = await Promise.all(toolCalls.map((toolCall) => this.executeTool(session, toolCall)));
    for (const turn of turns) {
      session.append(turn);
    }
  }

  private async executeTool(session: AgentSession, toolCall: ToolCall) {
    const args = parseArgs(toolCall.argumentsJson);
    const tool = this.tools.get(toolCall.name);
    const result = tool == null
      ? {
          ok: false,
          error: `Unknown tool: ${toolCall.name}`,
          metadata: {}
        } satisfies ShapedToolResult
      : await callTool(tool, args, session).catch((error: unknown) => ({
          ok: false,
          error: rootMessage(error),
          metadata: {}
        }) satisfies ShapedToolResult);

    return toolTurn({
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      toolArgs: args,
      content: summarizeToolResult(result)
    });
  }

  private async forceSummary(
    session: AgentSession,
    turnCount: number,
    lastModel: string | undefined,
    lastUsage: Usage
  ): Promise<AgentLoopResult> {
    const response = await this.model.complete(this.prepareModelRequest(session, "none"));
    const content = response.message.content.trim() === ""
      ? "Too many steps; stopped. Please narrow the request and try again."
      : response.message.content;
    const model = response.model ?? lastModel;
    const usage = Object.keys(response.usage).length === 0 ? lastUsage : response.usage;

    session.append(assistantTurn({
      content,
      model,
      usage
    }));

    return {
      content,
      model,
      usage,
      finishReason: FinishReason.ForcedSummary,
      turnCount
    };
  }
}

function parseArgs(rawArgs: string): ToolArgs {
  try {
    const value: unknown = JSON.parse(rawArgs.trim() === "" ? "{}" : rawArgs);
    if (value != null && typeof value === "object" && !Array.isArray(value)) {
      return { ...(value as Record<string, unknown>) };
    }
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
  }

  return {};
}

function summarizeToolResult(result: ShapedToolResult): string {
  const text = JSON.stringify(result);
  return text.length <= MAX_TOOL_RESULT_CHARS
    ? text
    : `${text.slice(0, MAX_TOOL_RESULT_CHARS)}...[truncated]`;
}

function rootMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  let current: Error = error;
  while (current.cause instanceof Error) {
    current = current.cause;
  }

  return current.message === "" ? current.name : current.message;
}
