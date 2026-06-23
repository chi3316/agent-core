import { userTurn, type AgentTurn } from "./agent-turn.js";
import { randomUUID } from "node:crypto";

export type SessionState = Record<string, unknown>;

export class AgentSession {
  readonly sessionId: string;
  readonly userId: string;

  private readonly turnList: AgentTurn[];
  private readonly sessionState: SessionState;
  private persistedTurnCountValue: number;

  constructor(input: {
    sessionId: string;
    userId: string;
    turns?: readonly AgentTurn[];
    state?: SessionState;
    persistedTurnCount?: number;
  }) {
    this.sessionId = input.sessionId;
    this.userId = input.userId;
    this.turnList = [...(input.turns ?? [])];
    this.sessionState = { ...(input.state ?? {}) };
    this.persistedTurnCountValue = input.persistedTurnCount ?? 0;
  }

  static create(userId: string, sessionId = createSessionId()): AgentSession {
    return new AgentSession({ sessionId, userId });
  }

  append(turn: AgentTurn): void {
    this.turnList.push(turn);
  }

  appendUser(content: string): void {
    this.append(userTurn(content));
  }

  turns(): readonly AgentTurn[] {
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
