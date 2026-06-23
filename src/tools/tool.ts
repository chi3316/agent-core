import type { z } from "zod";
import type { Session } from "../session/session.js";
import { err, type ToolResult } from "./result.js";

export type JsonObject = Record<string, unknown>;
export type JsonSchema = Readonly<JsonObject>;
export type ToolArgs = Readonly<JsonObject>;

export type ToolContext = {
  session: Session;
};

export type ToolPermission = Readonly<
  | {
      behavior: "allow";
    }
  | {
      behavior: "deny";
      message: string;
    }
>;

export type ShapedToolResult = Readonly<{
  ok: boolean;
  data?: unknown;
  error?: string;
  metadata: Readonly<Record<string, unknown>>;
}>;

export interface Tool<TInput = ToolArgs, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly parameters: JsonSchema;
  readonly input: z.ZodType<TInput>;

  execute(input: TInput, context: ToolContext): Promise<ToolResult<TOutput>> | ToolResult<TOutput>;

  enabled?(context: ToolContext): boolean;

  authorize?(input: TInput, context: ToolContext): Promise<ToolPermission> | ToolPermission;
}

export async function callTool<TInput, TOutput>(
  tool: Tool<TInput, TOutput>,
  args: ToolArgs,
  context: ToolContext
): Promise<ShapedToolResult> {
  const parsed = tool.input.safeParse(args);
  if (!parsed.success) {
    return shapeToolResult(err(`Invalid tool input: ${formatZodIssues(parsed.error.issues)}`));
  }

  const permission = tool.authorize == null
    ? allowTool()
    : await tool.authorize(parsed.data, context);

  if (isToolDenied(permission)) {
    return shapeToolResult(err(permission.message));
  }

  return shapeToolResult(await tool.execute(parsed.data, context));
}

export function toolContext(session: Session): ToolContext {
  return { session };
}

export function allowTool(): ToolPermission {
  return { behavior: "allow" };
}

export function denyTool(message: string): ToolPermission {
  return { behavior: "deny", message };
}

export function isToolDenied(
  permission: ToolPermission
): permission is Extract<ToolPermission, { behavior: "deny" }> {
  return permission.behavior === "deny";
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

function formatZodIssues(issues: readonly z.core.$ZodIssue[]): string {
  return issues
    .map((issue) => {
      const path = issue.path.length === 0 ? "<root>" : issue.path.join(".");
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}
