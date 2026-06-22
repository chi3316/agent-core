package com.adinsight.agent.session;

public interface SessionStore {
    AgentSession getOrCreate(String userId, String sessionId);

    void save(AgentSession session);
}
