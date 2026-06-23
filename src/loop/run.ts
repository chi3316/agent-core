import { buildContext, type ContextOptions } from "../context/context.js";
import { needsFollowUp, type Model, type ModelRequest, type ToolCall, type ToolChoice } from "../model/model.js";
import {
  buildOpenAiMessages,
  toOpenAiToolDefinition
} from "../model/openai-adapter.js";
import { Session } from "../session/session.js";
import { assistantTurn, toolTurn } from "../session/session.js";
import { callTool, toolContext, type ShapedToolResult, type ToolArgs } from "../tools/tool.js";
import { toolMap, type ToolCollection } from "../tools/registry.js";

const MAX_TOOL_RESULT_CHARS = 1_200;

export type FinishReason =
  | "completed"
  | "max_steps"
  | "forced_summary"
  | "model_error";

export const FinishReason = {
  Completed: "completed",
  MaxSteps: "max_steps",
  ForcedSummary: "forced_summary",
  ModelError: "model_error"
} as const satisfies Record<string, FinishReason>;

export type Usage = Readonly<Record<string, unknown>>;

export type RunResult = Readonly<{
  content: string;
  model?: string;
  usage: Usage;
  finishReason: FinishReason;
  turnCount: number;
}>;

export type Loop = Readonly<{
  runTurn(session: Session, userMessage: string): Promise<RunResult>;
}>;

export type LoopOptions = Readonly<{
  model: Model;
  tools?: ToolCollection;
  systemPrompt: string;
  maxSteps?: number;
  context?: ContextOptions;
}>;

export function createLoop(options: LoopOptions): Loop {
  const tools = toolMap(options.tools ?? []);
  const maxSteps = options.maxSteps ?? 8;

  async function runTurn(session: Session, userMessage: string): Promise<RunResult> {
    session.appendUser(userMessage);
    return runIterations(session, 0, undefined, {});
  }

  async function runIterations(
    session: Session,
    turnCount: number,
    lastModel: string | undefined,
    lastUsage: Usage
  ): Promise<RunResult> {
    if (turnCount >= maxSteps) {
      return forceSummary(session, turnCount, lastModel, lastUsage);
    }

    try {
      const response = await options.model.complete(prepareModelRequest(session, "auto"));
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

      await executeTools(session, message.toolCalls);
      return runIterations(session, turnCount + 1, response.model, response.usage);
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

  function prepareModelRequest(session: Session, toolChoice: ToolChoice): ModelRequest {
    const context = buildContext(session, options.context);

    return {
      messages: buildOpenAiMessages({
        systemPrompt: options.systemPrompt,
        context
      }),
      tools: [...tools.values()].map(toOpenAiToolDefinition),
      toolChoice,
      userId: session.numericUserId(),
      sessionId: session.numericSessionId()
    };
  }

  async function executeTools(session: Session, toolCalls: readonly ToolCall[]): Promise<void> {
    const turns = await Promise.all(toolCalls.map((toolCall) => executeTool(session, toolCall)));
    for (const turn of turns) {
      session.append(turn);
    }
  }

  async function executeTool(session: Session, toolCall: ToolCall) {
    const args = parseArgs(toolCall.argumentsJson);
    const tool = tools.get(toolCall.name);
    const context = toolContext(session);
    const result = tool == null
      ? {
          ok: false,
          error: `Unknown tool: ${toolCall.name}`,
          metadata: {}
        } satisfies ShapedToolResult
      : await callTool(tool, args, context).catch((error: unknown) => ({
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

  async function forceSummary(
    session: Session,
    turnCount: number,
    lastModel: string | undefined,
    lastUsage: Usage
  ): Promise<RunResult> {
    const response = await options.model.complete(prepareModelRequest(session, "none"));
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

  return { runTurn };
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
