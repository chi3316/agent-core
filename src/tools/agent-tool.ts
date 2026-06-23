import type { AgentSession } from "../session/agent-session.js";
import { allowTool, isToolDenied, type ToolPermission } from "./tool-permission.js";
import { toolContext, type ToolContext } from "./tool-context.js";
import type { ToolResult } from "./tool-result.js";

export type JsonSchema = Readonly<Record<string, unknown>>;
export type ToolArgs = Readonly<Record<string, unknown>>;

export type ShapedToolResult = Readonly<{
  ok: boolean;
  data?: unknown;
  error?: string;
  metadata: Readonly<Record<string, unknown>>;
}>;

export interface AgentTool<TInput = ToolArgs, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;

  parseInput(args: ToolArgs): TInput;

  execute(input: TInput, context: ToolContext): Promise<ToolResult<TOutput>>;

  isEnabled?(session: AgentSession): boolean;

  checkPermission?(input: TInput, context: ToolContext): Promise<ToolPermission>;
}

export async function callTool<TInput, TOutput>(
  tool: AgentTool<TInput, TOutput>,
  args: ToolArgs,
  session: AgentSession
): Promise<ShapedToolResult> {
  const input = tool.parseInput(args);
  const context = toolContext(session);
  const permission = tool.checkPermission == null
    ? allowTool()
    : await tool.checkPermission(input, context);

  if (isToolDenied(permission)) {
    return shapeToolResult({
      ok: false,
      error: permission.message,
      metadata: {}
    });
  }

  return shapeToolResult(await tool.execute(input, context));
}

export function shapeToolResult(result: ToolResult): ShapedToolResult {
  if (result.ok) {
    return {
      ok: true,
      data: result.data,
      metadata: result.metadata
    };
  }

  return {
    ok: false,
    error: result.error,
    metadata: result.metadata
  };
}
