import { describe, expect, it } from "vitest";
import { buildContext } from "../../src/context/context.js";
import { Session } from "../../src/session/session.js";
import { userTurn } from "../../src/session/session.js";

describe("buildContext", () => {
  it("keeps only the most recent turns", () => {
    const session = Session.create("u1", "s1");
    session.append(userTurn("one"));
    session.append(userTurn("two"));
    session.append(userTurn("three"));

    const context = buildContext(session, { maxTurns: 2 });

    expect(context.sessionId).toBe("s1");
    expect(context.userId).toBe("u1");
    expect(context.turns.map((turn) => turn.content)).toEqual(["two", "three"]);
  });

  it("copies state into the context", () => {
    const session = Session.create("u1", "s1");
    session.state().topic = "demo";

    const context = buildContext(session);
    session.state().topic = "changed";

    expect(context.state).toEqual({ topic: "demo" });
  });
});
