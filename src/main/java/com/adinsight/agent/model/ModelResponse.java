package com.adinsight.agent.model;

import java.util.Map;

public record ModelResponse(
        AssistantMessage message,
        String model,
        Map<String, Object> usage
) {
    public ModelResponse {
        usage = usage == null ? Map.of() : Map.copyOf(usage);
    }
}
