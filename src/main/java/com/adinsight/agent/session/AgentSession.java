package com.adinsight.agent.session;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalLong;
import java.util.UUID;

public class AgentSession {
    private final String sessionId;
    private final String userId;
    private final List<AgentTurn> turns;
    private final Map<String, Object> state;
    private int persistedTurnCount;

    public AgentSession(String sessionId, String userId) {
        this(sessionId, userId, new ArrayList<>(), new HashMap<>(), 0);
    }

    public AgentSession(
            String sessionId,
            String userId,
            List<AgentTurn> turns,
            Map<String, Object> state,
            int persistedTurnCount
    ) {
        this.sessionId = sessionId;
        this.userId = userId;
        this.turns = new ArrayList<>(turns);
        this.state = new HashMap<>(state);
        this.persistedTurnCount = persistedTurnCount;
    }

    public static AgentSession create(String userId) {
        return create(userId, null);
    }

    public static AgentSession create(String userId, String sessionId) {
        String id = sessionId == null || sessionId.isBlank()
                ? "sess_" + UUID.randomUUID().toString().replace("-", "")
                : sessionId;
        return new AgentSession(id, userId);
    }

    public void append(AgentTurn turn) {
        turns.add(turn);
    }

    public String sessionId() {
        return sessionId;
    }

    public String userId() {
        return userId;
    }

    public List<AgentTurn> turns() {
        return turns;
    }

    public Map<String, Object> state() {
        return state;
    }

    public int persistedTurnCount() {
        return persistedTurnCount;
    }

    public void markPersisted() {
        this.persistedTurnCount = turns.size();
    }

    public OptionalLong numericSessionId() {
        return parseLong(sessionId);
    }

    public OptionalLong numericUserId() {
        return parseLong(userId);
    }

    private static OptionalLong parseLong(String value) {
        try {
            return OptionalLong.of(Long.parseLong(value));
        } catch (NumberFormatException ignored) {
            return OptionalLong.empty();
        }
    }
}
