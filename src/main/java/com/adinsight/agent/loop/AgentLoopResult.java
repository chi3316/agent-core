package com.adinsight.agent.loop;

import java.util.Map;

public record AgentLoopResult(
        String content,
        String model,
        Map<String, Object> usage,
        FinishReason finishReason,
        int turnCount
) {
    public AgentLoopResult {
        usage = usage == null ? Map.of() : Map.copyOf(usage);
    }
}
