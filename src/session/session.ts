import { randomUUID } from "node:crypto";
import type { Usage } from "../loop/run.js";
import type { ToolCall } from "../model/model.js";

export type SessionState = Record<string, unknown>;

export type TurnRole = Turn["role"];

export type ToolArgs = Readonly<Record<string, unknown>>;

export type Turn = Readonly<
  | {
      role: "user";
      content: string;
      createdAt: Date;
    }
  | {
      role: "system";
      content: string;
      createdAt: Date;
    }
  | {
      role: "assistant";
      content: string;
      toolCalls: readonly ToolCall[];
      model?: string;
      usage: Usage;
      createdAt: Date;
    }
  | {
      role: "tool";
      toolCallId: string;
      toolName: string;
      toolArgs: ToolArgs;
      content: string;
      createdAt: Date;
    }
>;

export class Session {
  readonly sessionId: string;
  readonly userId: string;

  private readonly turnList: Turn[];
  private readonly sessionState: SessionState;
  private persistedTurnCountValue: number;

  constructor(input: {
    sessionId: string;
    userId: string;
    turns?: readonly Turn[];
    state?: SessionState;
    persistedTurnCount?: number;
  }) {
    this.sessionId = input.sessionId;
    this.userId = input.userId;
    this.turnList = [...(input.turns ?? [])];
    this.sessionState = { ...(input.state ?? {}) };
    this.persistedTurnCountValue = input.persistedTurnCount ?? 0;
  }

  static create(userId: string, sessionId = createSessionId()): Session {
    return new Session({ sessionId, userId });
  }

  append(turn: Turn): void {
    this.turnList.push(turn);
  }

  appendUser(content: string): void {
    this.append(userTurn(content));
  }

  turns(): readonly Turn[] {
    return this.turnList;
  }

  state(): SessionState {
    return this.sessionState;
  }

  persistedTurnCount(): number {
    return this.persistedTurnCountValue;
  }

  markPersisted(): void {
    this.persistedTurnCountValue = this.turnList.length;
  }

  numericSessionId(): number | undefined {
    return parseSafeInteger(this.sessionId);
  }

  numericUserId(): number | undefined {
    return parseSafeInteger(this.userId);
  }
}

export function userTurn(content: string, createdAt = new Date()): Turn {
  return {
    role: "user",
    content,
    createdAt
  };
}

export function systemTurn(content: string, createdAt = new Date()): Turn {
  return {
    role: "system",
    content,
    createdAt
  };
}

export function assistantTurn(input: {
  content?: string | null;
  toolCalls?: readonly ToolCall[] | null;
  model?: string;
  usage?: Usage | null;
  createdAt?: Date;
}): Turn {
  return {
    role: "assistant",
    content: input.content ?? "",
    toolCalls: [...(input.toolCalls ?? [])],
    model: input.model,
    usage: input.usage ?? {},
    createdAt: input.createdAt ?? new Date()
  };
}

export function toolTurn(input: {
  toolCallId: string;
  toolName: string;
  toolArgs?: ToolArgs | null;
  content?: string | null;
  createdAt?: Date;
}): Turn {
  return {
    role: "tool",
    toolCallId: input.toolCallId,
    toolName: input.toolName,
    toolArgs: input.toolArgs ?? {},
    content: input.content ?? "",
    createdAt: input.createdAt ?? new Date()
  };
}

function createSessionId(): string {
  return `sess_${randomUUID().replaceAll("-", "")}`;
}

function parseSafeInteger(value: string): number | undefined {
  if (!/^-?\d+$/.test(value)) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}
