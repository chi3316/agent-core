import type { Usage } from "../loop/agent-loop-result.js";
import type { AgentModel } from "./agent-model.js";
import { assistantMessage } from "./assistant-message.js";
import type { ModelRequest } from "./model-request.js";
import type { ModelResponse } from "./model-response.js";
import { toolCall } from "./tool-call.js";

type FetchLike = (input: string | URL, init: RequestInit) => Promise<Response>;

export type OpenAiChatModelOptions = Readonly<{
  apiKey: string;
  model: string;
  endpoint?: string | URL;
  temperature?: number;
  fetch?: FetchLike;
}>;

export class OpenAiChatModel implements AgentModel {
  private readonly endpoint: string | URL;
  private readonly temperature: number | undefined;
  private readonly fetchImpl: FetchLike;

  constructor(private readonly options: OpenAiChatModelOptions) {
    this.endpoint = options.endpoint ?? "https://api.openai.com/v1/chat/completions";
    this.temperature = options.temperature ?? 0.2;
    this.fetchImpl = options.fetch ?? fetch;
  }

  async complete(request: ModelRequest): Promise<ModelResponse> {
    const payload = this.buildPayload(request);
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`Model call failed: HTTP ${response.status} ${body}`);
    }

    try {
      return parseOpenAiResponse(body, this.options.model);
    } catch (error) {
      throw new Error("Failed to parse model response", { cause: error });
    }
  }

  private buildPayload(request: ModelRequest): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      model: this.options.model,
      messages: request.messages
    };

    if (this.temperature != null && !this.options.model.toLowerCase().startsWith("gpt-5")) {
      payload.temperature = this.temperature;
    }

    if (request.tools.length > 0) {
      payload.tools = request.tools;
      payload.tool_choice = request.toolChoice;
    }

    return payload;
  }
}

function parseOpenAiResponse(body: string, fallbackModel: string): ModelResponse {
  const root = JSON.parse(body) as unknown;
  const rootObject = asObject(root);
  const choice = firstChoice(rootObject);
  const message = asObject(choice.message);
  const toolCalls = Array.isArray(message.tool_calls)
    ? message.tool_calls.map(parseToolCall)
    : [];

  return {
    message: assistantMessage({
      content: typeof message.content === "string" ? message.content : "",
      toolCalls
    }),
    model: typeof rootObject.model === "string" ? rootObject.model : fallbackModel,
    usage: parseUsage(rootObject.usage)
  };
}

function firstChoice(root: Record<string, unknown>): Record<string, unknown> {
  const choices = root.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("Missing choices");
  }

  return asObject(choices[0]);
}

function parseToolCall(value: unknown) {
  const item = asObject(value);
  const fn = asObject(item.function);

  return toolCall({
    id: typeof item.id === "string" ? item.id : "",
    name: typeof fn.name === "string" ? fn.name : "",
    argumentsJson: typeof fn.arguments === "string" ? fn.arguments : "{}"
  });
}

function parseUsage(value: unknown): Usage {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function asObject(value: unknown): Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected object");
  }

  return value as Record<string, unknown>;
}
