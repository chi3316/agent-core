import type { AgentContext } from "../context/agent-context.js";
import type { AgentTurn } from "../session/agent-turn.js";
import type { AgentTool } from "../tools/agent-tool.js";
import type { ToolCall } from "./tool-call.js";

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
  context: AgentContext;
}): readonly OpenAiMessage[] {
  return [
    {
      role: "system",
      content: `${input.systemPrompt}\n\n${runtimeContext(input.context)}`
    },
    ...turnsToOpenAiMessages(input.context.turns)
  ];
}

export function toOpenAiToolDefinition(tool: AgentTool): OpenAiToolDefinition {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
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

function runtimeContext(context: AgentContext): string {
  return `Runtime context:\n${JSON.stringify({
    session_id: context.sessionId,
    state: context.state
  })}`;
}

function turnsToOpenAiMessages(turns: readonly AgentTurn[]): readonly OpenAiMessage[] {
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
