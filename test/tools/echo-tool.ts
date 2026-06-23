import { z } from "zod";
import type { Tool, JsonSchema, ToolContext } from "../../src/tools/tool.js";
import { ok, type ToolResult } from "../../src/tools/result.js";

const echoInput = z.object({
  text: z.string()
});

type EchoInput = z.infer<typeof echoInput>;

export class EchoTool implements Tool<EchoInput, Readonly<{ text: string }>> {
  readonly name = "echo";
  readonly description = "Echoes the provided text.";
  readonly input = echoInput;
  readonly parameters: JsonSchema = {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Text to echo"
      }
    },
    required: ["text"]
  };

  async execute(
    input: EchoInput,
    _context: ToolContext
  ): Promise<ToolResult<Readonly<{ text: string }>>> {
    return ok({ text: input.text });
  }
}
