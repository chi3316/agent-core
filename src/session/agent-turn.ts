import type { ToolCall } from "../model/tool-call.js";
import type { Usage } from "../loop/agent-loop-result.js";

export type TurnRole = AgentTurn["role"];

export type ToolArgs = Readonly<Record<string, unknown>>;

export type AgentTurn = Readonly<
  | {
      role: "user";
      content: string;
      createdAt: Date;
    }
  | {
      role: "system";
      content: string;
      createdAt: Date;
    }
  | {
      role: "assistant";
      content: string;
      toolCalls: readonly ToolCall[];
      model?: string;
      usage: Usage;
      createdAt: Date;
    }
  | {
      role: "tool";
      toolCallId: string;
      toolName: string;
      toolArgs: ToolArgs;
      content: string;
      createdAt: Date;
    }
>;

export function userTurn(content: string, createdAt = new Date()): AgentTurn {
  return {
    role: "user",
    content,
    createdAt
  };
}

export function systemTurn(content: string, createdAt = new Date()): AgentTurn {
  return {
    role: "system",
    content,
    createdAt
  };
}

export function assistantTurn(input: {
  content?: string | null;
  toolCalls?: readonly ToolCall[] | null;
  model?: string;
  usage?: Usage | null;
  createdAt?: Date;
}): AgentTurn {
  return {
    role: "assistant",
    content: input.content ?? "",
    toolCalls: [...(input.toolCalls ?? [])],
    model: input.model,
    usage: input.usage ?? {},
    createdAt: input.createdAt ?? new Date()
  };
}

export function toolTurn(input: {
  toolCallId: string;
  toolName: string;
  toolArgs?: ToolArgs | null;
  content?: string | null;
  createdAt?: Date;
}): AgentTurn {
  return {
    role: "tool",
    toolCallId: input.toolCallId,
    toolName: input.toolName,
    toolArgs: input.toolArgs ?? {},
    content: input.content ?? "",
    createdAt: input.createdAt ?? new Date()
  };
}
