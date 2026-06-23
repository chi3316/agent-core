import type { ToolCall } from "./tool-call.js";

export type AssistantMessage = Readonly<{
  content: string;
  toolCalls: readonly ToolCall[];
}>;

export function assistantMessage(input: {
  content?: string | null;
  toolCalls?: readonly ToolCall[] | null;
}): AssistantMessage {
  return {
    content: input.content ?? "",
    toolCalls: [...(input.toolCalls ?? [])]
  };
}

export function needsFollowUp(message: AssistantMessage): boolean {
  return message.toolCalls.length > 0;
}
