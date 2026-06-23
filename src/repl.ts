#!/usr/bin/env node

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { z } from "zod";
import { createLoop } from "./loop/run.js";
import { OpenAiChatModel } from "./model/openai-chat-model.js";
import { Session } from "./session/session.js";
import type { Tool, ToolContext } from "./tools/tool.js";
import { ok, type ToolResult } from "./tools/result.js";

type EchoInput = z.infer<typeof echoInput>;

const echoInput = z.object({
  text: z.string()
});

const echoTool: Tool<EchoInput, Readonly<{ text: string }>> = {
  name: "echo",
  description: "Echoes the provided text.",
  input: echoInput,
  parameters: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Text to echo"
      }
    },
    required: ["text"]
  },
  execute(input: EchoInput, _context: ToolContext): ToolResult<Readonly<{ text: string }>> {
    return ok({ text: input.text });
  }
};

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey == null || apiKey.trim() === "") {
    console.error("Missing OPENAI_API_KEY.");
    process.exitCode = 1;
    return;
  }

  const model = new OpenAiChatModel({
    apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    endpoint: openAiEndpoint(process.env.OPENAI_BASE_URL),
    temperature: numberEnv("OPENAI_TEMPERATURE", 0.2)
  });
  const loop = createLoop({
    model,
    tools: [echoTool],
    systemPrompt: process.env.AGENT_SYSTEM_PROMPT ?? "You are a concise, helpful assistant. Use tools when useful.",
    context: {
      maxTurns: integerEnv("AGENT_CONTEXT_TURNS", 12)
    },
    maxSteps: integerEnv("AGENT_MAX_STEPS", 8)
  });
  const session = Session.create(process.env.AGENT_USER_ID ?? "repl_user");
  const rl = createInterface({ input, output });

  console.log("Agent Core REPL. Type /exit to quit.");
  console.log(`Model: ${process.env.OPENAI_MODEL ?? "gpt-4.1-mini"}`);

  try {
    while (true) {
      const message = (await rl.question("> ")).trim();
      if (message === "") {
        continue;
      }
      if (message === "/exit" || message === "/quit") {
        break;
      }

      try {
        const result = await loop.runTurn(session, message);
        console.log(result.content);
      } catch (error) {
        console.error(rootMessage(error));
      }
    }
  } finally {
    rl.close();
  }
}

function openAiEndpoint(value: string | undefined): string {
  if (value == null || value.trim() === "") {
    return "https://api.openai.com/v1/chat/completions";
  }

  const trimmed = value.replace(/\/+$/, "");
  return trimmed.endsWith("/chat/completions")
    ? trimmed
    : `${trimmed}/chat/completions`;
}

function integerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }

  return value;
}

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a number.`);
  }

  return value;
}

function rootMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  let current: Error = error;
  while (current.cause instanceof Error) {
    current = current.cause;
  }

  return current.message === "" ? current.name : current.message;
}

await main();
