import type { AgentTool, JsonSchema, ToolArgs } from "../../src/tools/agent-tool.js";
import type { ToolContext } from "../../src/tools/tool-context.js";
import { toolSuccess, type ToolResult } from "../../src/tools/tool-result.js";

type EchoInput = Readonly<{
  text: string;
}>;

export class EchoTool implements AgentTool<EchoInput, Readonly<{ text: string }>> {
  readonly name = "echo";
  readonly description = "Echoes the provided text.";
  readonly inputSchema: JsonSchema = {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Text to echo"
      }
    },
    required: ["text"]
  };

  parseInput(args: ToolArgs): EchoInput {
    return {
      text: typeof args.text === "string" ? args.text : ""
    };
  }

  async execute(
    input: EchoInput,
    _context: ToolContext
  ): Promise<ToolResult<Readonly<{ text: string }>>> {
    return toolSuccess({ text: input.text });
  }
}
