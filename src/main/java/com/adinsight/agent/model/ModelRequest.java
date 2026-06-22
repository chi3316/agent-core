package com.adinsight.agent.model;

import java.util.List;
import java.util.Map;

public record ModelRequest(
        List<Map<String, Object>> messages,
        List<Map<String, Object>> tools,
        String toolChoice,
        Long userId,
        Long sessionId
) {
    public ModelRequest {
        messages = messages == null ? List.of() : List.copyOf(messages);
        tools = tools == null ? List.of() : List.copyOf(tools);
        toolChoice = toolChoice == null ? "auto" : toolChoice;
    }
}
