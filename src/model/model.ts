import type { Usage } from "../loop/run.js";
import type { OpenAiMessage, OpenAiToolDefinition } from "./openai-adapter.js";

export type ToolChoice = "auto" | "none";

export type ToolCall = Readonly<{
  id: string;
  name: string;
  argumentsJson: string;
}>;

export type AssistantMessage = Readonly<{
  content: string;
  toolCalls: readonly ToolCall[];
}>;

export type ModelRequest = Readonly<{
  messages: readonly OpenAiMessage[];
  tools: readonly OpenAiToolDefinition[];
  toolChoice: ToolChoice;
  userId?: number;
  sessionId?: number;
}>;

export type ModelResponse = Readonly<{
  message: AssistantMessage;
  model?: string;
  usage: Usage;
}>;

export interface Model {
  complete(request: ModelRequest): Promise<ModelResponse>;
}

export function toolCall(input: {
  id: string;
  name: string;
  argumentsJson?: string | null;
}): ToolCall {
  return {
    id: input.id,
    name: input.name,
    argumentsJson: input.argumentsJson == null || input.argumentsJson.trim() === ""
      ? "{}"
      : input.argumentsJson
  };
}

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
