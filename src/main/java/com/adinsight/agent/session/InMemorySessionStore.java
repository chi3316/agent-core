package com.adinsight.agent.session;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class InMemorySessionStore implements SessionStore {
    private final Map<String, AgentSession> sessions = new ConcurrentHashMap<>();

    @Override
    public AgentSession getOrCreate(String userId, String sessionId) {
        if (sessionId != null && sessions.containsKey(sessionId)) {
            return sessions.get(sessionId);
        }
        AgentSession session = AgentSession.create(userId, sessionId);
        sessions.put(session.sessionId(), session);
        return session;
    }

    @Override
    public void save(AgentSession session) {
        session.markPersisted();
        sessions.put(session.sessionId(), session);
    }
}
