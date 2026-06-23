import type { Usage } from "../loop/agent-loop-result.js";
import type { AssistantMessage } from "./assistant-message.js";

export type ModelResponse = Readonly<{
  message: AssistantMessage;
  model?: string;
  usage: Usage;
}>;
