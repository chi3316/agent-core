import type { Tool, ToolContext } from "./tool.js";

export type ToolCollection =
  | readonly Tool[]
  | ReadonlyMap<string, Tool>
  | Readonly<Record<string, Tool>>;

export function toolMap(tools: ToolCollection): ReadonlyMap<string, Tool> {
  if (tools instanceof Map) {
    return new Map(tools);
  }

  if (Array.isArray(tools)) {
    return new Map(tools.map((tool) => [tool.name, tool]));
  }

  return new Map(Object.entries(tools));
}

export function enabledTools(
  tools: ToolCollection,
  context: ToolContext
): ReadonlyMap<string, Tool> {
  const availableTools = new Map<string, Tool>();

  for (const tool of toolMap(tools).values()) {
    if (tool.enabled == null || tool.enabled(context)) {
      availableTools.set(tool.name, tool);
    }
  }

  return availableTools;
}
