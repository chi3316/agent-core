import { describe, expect, it } from "vitest";
import { ContextBuilder } from "../../src/context/context-builder.js";
import { AgentSession } from "../../src/session/agent-session.js";
import { userTurn } from "../../src/session/agent-turn.js";

describe("ContextBuilder", () => {
  it("keeps only the most recent turns", () => {
    const session = AgentSession.create("u1", "s1");
    session.append(userTurn("one"));
    session.append(userTurn("two"));
    session.append(userTurn("three"));

    const context = new ContextBuilder(2).build(session);

    expect(context.sessionId).toBe("s1");
    expect(context.userId).toBe("u1");
    expect(context.turns.map((turn) => turn.content)).toEqual(["two", "three"]);
  });

  it("copies state into the context", () => {
    const session = AgentSession.create("u1", "s1");
    session.state().topic = "demo";

    const context = new ContextBuilder().build(session);
    session.state().topic = "changed";

    expect(context.state).toEqual({ topic: "demo" });
  });
});
