import type { OpenAiMessage, OpenAiToolDefinition } from "./openai-adapter.js";

export type ToolChoice = "auto" | "none";

export type ModelRequest = Readonly<{
  messages: readonly OpenAiMessage[];
  tools: readonly OpenAiToolDefinition[];
  toolChoice: ToolChoice;
  userId?: number;
  sessionId?: number;
}>;
