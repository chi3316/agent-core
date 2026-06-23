import { describe, expect, it } from "vitest";
import type { Context } from "../../src/context/context.js";
import {
  buildOpenAiMessages,
  toOpenAiToolDefinition
} from "../../src/model/openai-adapter.js";
import { toolCall } from "../../src/model/model.js";
import { assistantTurn, toolTurn, userTurn } from "../../src/session/session.js";
import { EchoTool } from "../tools/echo-tool.js";

describe("OpenAI adapter", () => {
  it("builds messages with a single system message", () => {
    const context: Context = {
      sessionId: "s1",
      userId: "u1",
      state: { mode: "test" },
      turns: [userTurn("hello")]
    };

    const messages = buildOpenAiMessages({
      systemPrompt: "Use tools when needed.",
      context
    });

    expect(messages).toEqual([
      {
        role: "system",
        content: 'Use tools when needed.\n\nRuntime context:\n{"session_id":"s1","state":{"mode":"test"}}'
      },
      {
        role: "user",
        content: "hello"
      }
    ]);
  });

  it("maps assistant tool calls and matching tool results", () => {
    const context: Context = {
      sessionId: "s1",
      userId: "u1",
      state: {},
      turns: [
        assistantTurn({
          toolCalls: [toolCall({ id: "call_1", name: "echo", argumentsJson: '{"text":"hi"}' })]
        }),
        toolTurn({
          toolCallId: "call_1",
          toolName: "echo",
          content: '{"ok":true}'
        })
      ]
    };

    expect(buildOpenAiMessages({ systemPrompt: "sys", context }).slice(1)).toEqual([
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: "echo",
              arguments: '{"text":"hi"}'
            }
          }
        ]
      },
      {
        role: "tool",
        tool_call_id: "call_1",
        name: "echo",
        content: '{"ok":true}'
      }
    ]);
  });

  it("drops orphan tool results", () => {
    const context: Context = {
      sessionId: "s1",
      userId: "u1",
      state: {},
      turns: [
        toolTurn({
          toolCallId: "missing",
          toolName: "echo",
          content: "{}"
        })
      ]
    };

    expect(buildOpenAiMessages({ systemPrompt: "sys", context })).toEqual([
      {
        role: "system",
        content: 'sys\n\nRuntime context:\n{"session_id":"s1","state":{}}'
      }
    ]);
  });

  it("maps tool definitions", () => {
    expect(toOpenAiToolDefinition(new EchoTool())).toEqual({
      type: "function",
      function: {
        name: "echo",
        description: "Echoes the provided text.",
        parameters: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Text to echo"
            }
          },
          required: ["text"]
        }
      }
    });
  });
});
