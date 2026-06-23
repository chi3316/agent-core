import { describe, expect, it } from "vitest";
import { OpenAiChatModel } from "../../src/model/openai-chat-model.js";
import type { ModelRequest } from "../../src/model/model-request.js";

describe("OpenAiChatModel", () => {
  it("posts chat completion payload and parses assistant tool calls", async () => {
    const calls: Array<{ input: string | URL; init: RequestInit }> = [];
    const model = new OpenAiChatModel({
      apiKey: "secret",
      model: "gpt-4.1-mini",
      endpoint: "https://example.test/chat",
      fetch: async (input, init) => {
        calls.push({ input, init });
        return response(200, {
          model: "gpt-4.1-mini-2026-01-01",
          choices: [
            {
              message: {
                content: "",
                tool_calls: [
                  {
                    id: "call_1",
                    type: "function",
                    function: {
                      name: "echo",
                      arguments: "{\"text\":\"hello\"}"
                    }
                  }
                ]
              }
            }
          ],
          usage: {
            prompt_tokens: 1
          }
        });
      }
    });

    const result = await model.complete(request());

    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("https://example.test/chat");
    expect(calls[0]?.init.headers).toEqual({
      Authorization: "Bearer secret",
      "Content-Type": "application/json"
    });
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: "hello" }],
      temperature: 0.2,
      tools: [
        {
          type: "function",
          function: {
            name: "echo",
            description: "Echoes.",
            parameters: { type: "object" }
          }
        }
      ],
      tool_choice: "auto"
    });
    expect(result).toEqual({
      message: {
        content: "",
        toolCalls: [
          {
            id: "call_1",
            name: "echo",
            argumentsJson: "{\"text\":\"hello\"}"
          }
        ]
      },
      model: "gpt-4.1-mini-2026-01-01",
      usage: {
        prompt_tokens: 1
      }
    });
  });

  it("does not send temperature for gpt-5 models", async () => {
    let payload: unknown;
    const model = new OpenAiChatModel({
      apiKey: "secret",
      model: "gpt-5.1",
      fetch: async (_input, init) => {
        payload = JSON.parse(String(init.body));
        return response(200, {
          choices: [{ message: { content: "ok" } }],
          usage: {}
        });
      }
    });

    await model.complete({ ...request(), tools: [] });

    expect(payload).toEqual({
      model: "gpt-5.1",
      messages: [{ role: "user", content: "hello" }]
    });
  });

  it("throws on non-success responses", async () => {
    const model = new OpenAiChatModel({
      apiKey: "secret",
      model: "gpt-4.1-mini",
      fetch: async () => response(500, "bad")
    });

    await expect(model.complete(request())).rejects.toThrow("Model call failed: HTTP 500 bad");
  });
});

function request(): ModelRequest {
  return {
    messages: [{ role: "user", content: "hello" }],
    tools: [
      {
        type: "function",
        function: {
          name: "echo",
          description: "Echoes.",
          parameters: { type: "object" }
        }
      }
    ],
    toolChoice: "auto"
  };
}

function response(status: number, body: unknown): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status
  });
}
