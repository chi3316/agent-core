package com.adinsight.agent.context;

import java.util.List;
import java.util.Map;

public record AgentContext(
        String sessionId,
        String userId,
        Map<String, Object> state,
        List<Map<String, Object>> messages
) {
}
