import type { FinishReason } from "./finish-reason.js";

export type Usage = Readonly<Record<string, unknown>>;

export type AgentLoopResult = Readonly<{
  content: string;
  model?: string;
  usage: Usage;
  finishReason: FinishReason;
  turnCount: number;
}>;
