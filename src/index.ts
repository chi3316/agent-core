export type { AgentContext } from "./context/agent-context.js";
export { ContextBuilder } from "./context/context-builder.js";

export type { AgentLoopResult, Usage } from "./loop/agent-loop-result.js";
export { AgentLoop } from "./loop/agent-loop.js";
export { FinishReason } from "./loop/finish-reason.js";

export type { AgentModel } from "./model/agent-model.js";
export type { AssistantMessage } from "./model/assistant-message.js";
export { assistantMessage, needsFollowUp } from "./model/assistant-message.js";
export type { ModelRequest, ToolChoice } from "./model/model-request.js";
export type { ModelResponse } from "./model/model-response.js";
export { OpenAiChatModel } from "./model/openai-chat-model.js";
export type {
  OpenAiMessage,
  OpenAiToolCall,
  OpenAiToolDefinition
} from "./model/openai-adapter.js";
export {
  buildOpenAiMessages,
  toOpenAiToolCall,
  toOpenAiToolDefinition
} from "./model/openai-adapter.js";
export type { ToolCall } from "./model/tool-call.js";
export { toolCall } from "./model/tool-call.js";

export { AgentSession } from "./session/agent-session.js";
export type { SessionState } from "./session/agent-session.js";
export type { AgentTurn, ToolArgs, TurnRole } from "./session/agent-turn.js";
export {
  assistantTurn,
  systemTurn,
  toolTurn,
  userTurn
} from "./session/agent-turn.js";

export type {
  AgentTool,
  JsonSchema,
  ShapedToolResult
} from "./tools/agent-tool.js";
export { callTool, shapeToolResult } from "./tools/agent-tool.js";
export type { ToolContext } from "./tools/tool-context.js";
export { toolContext } from "./tools/tool-context.js";
export type { ToolPermission } from "./tools/tool-permission.js";
export {
  allowTool,
  denyTool,
  isToolDenied
} from "./tools/tool-permission.js";
export { ToolRegistry } from "./tools/tool-registry.js";
export type { ToolMetadata, ToolResult } from "./tools/tool-result.js";
export { toolFailure, toolSuccess } from "./tools/tool-result.js";
