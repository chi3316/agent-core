import type { Context } from "../context/context.js";
import type { Turn } from "../session/session.js";
import type { Tool } from "../tools/tool.js";
import type { ToolCall } from "./model.js";

export type OpenAiMessage =
  | Readonly<{
      role: "system" | "user";
      content: string;
    }>
  | Readonly<{
      role: "assistant";
      content: string;
      tool_calls?: readonly OpenAiToolCall[];
    }>
  | Readonly<{
      role: "tool";
      tool_call_id: string;
      name: string;
      content: string;
    }>;

export type OpenAiToolCall = Readonly<{
  id: string;
  type: "function";
  function: Readonly<{
    name: string;
    arguments: string;
  }>;
}>;

export type OpenAiToolDefinition = Readonly<{
  type: "function";
  function: Readonly<{
    name: string;
    description: string;
    parameters: Readonly<Record<string, unknown>>;
  }>;
}>;

export function buildOpenAiMessages(input: {
  systemPrompt: string;
  context: Context;
}): readonly OpenAiMessage[] {
  return [
    {
      role: "system",
      content: `${input.systemPrompt}\n\n${runtimeContext(input.context)}`
    },
    ...turnsToOpenAiMessages(input.context.turns)
  ];
}

export function toOpenAiToolDefinition(tool: Tool): OpenAiToolDefinition {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  };
}

export function toOpenAiToolCall(toolCall: ToolCall): OpenAiToolCall {
  return {
    id: toolCall.id,
    type: "function",
    function: {
      name: toolCall.name,
      arguments: toolCall.argumentsJson
    }
  };
}

function runtimeContext(context: Context): string {
  return `Runtime context:\n${JSON.stringify({
    session_id: context.sessionId,
    state: context.state
  })}`;
}

function turnsToOpenAiMessages(turns: readonly Turn[]): readonly OpenAiMessage[] {
  const messages: OpenAiMessage[] = [];
  const validToolCallIds = new Set<string>();

  for (const turn of turns) {
    switch (turn.role) {
      case "assistant": {
        if (turn.toolCalls.length > 0) {
          const toolCalls = turn.toolCalls.map(toOpenAiToolCall);
          for (const toolCall of toolCalls) {
            validToolCallIds.add(toolCall.id);
          }
          messages.push({
            role: "assistant",
            content: turn.content,
            tool_calls: toolCalls
          });
        } else {
          messages.push({
            role: "assistant",
            content: turn.content
          });
        }
        break;
      }
      case "tool":
        if (validToolCallIds.has(turn.toolCallId)) {
          messages.push({
            role: "tool",
            tool_call_id: turn.toolCallId,
            name: turn.toolName,
            content: turn.content
          });
        }
        break;
      case "system":
      case "user":
        messages.push({
          role: turn.role,
          content: turn.content
        });
        break;
      default:
        assertNever(turn);
    }
  }

  return messages;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled turn role: ${JSON.stringify(value)}`);
}
