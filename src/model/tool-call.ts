export type ToolCall = Readonly<{
  id: string;
  name: string;
  argumentsJson: string;
}>;

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
