export type { Context, ContextOptions } from "./context/context.js";
export { buildContext } from "./context/context.js";

export type { RunResult, Usage } from "./loop/run.js";
export type { Loop, LoopOptions } from "./loop/run.js";
export { createLoop } from "./loop/run.js";
export { FinishReason } from "./loop/run.js";

export type {
  AssistantMessage,
  Model,
  ModelRequest,
  ModelResponse,
  ToolCall,
  ToolChoice
} from "./model/model.js";
export {
  assistantMessage,
  needsFollowUp,
  toolCall
} from "./model/model.js";
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
export { Session } from "./session/session.js";
export type { SessionState } from "./session/session.js";
export type { Turn, ToolArgs, TurnRole } from "./session/session.js";
export {
  assistantTurn,
  systemTurn,
  toolTurn,
  userTurn
} from "./session/session.js";

export type {
  Tool,
  JsonObject,
  JsonSchema,
  ShapedToolResult,
  ToolContext,
  ToolPermission
} from "./tools/tool.js";
export {
  allowTool,
  callTool,
  denyTool,
  isToolDenied,
  shapeToolResult,
  toolContext
} from "./tools/tool.js";
export type { ToolCollection } from "./tools/registry.js";
export { enabledTools, toolMap } from "./tools/registry.js";
export type { ToolMetadata, ToolResult } from "./tools/result.js";
export { err, ok } from "./tools/result.js";
