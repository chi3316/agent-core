package com.adinsight.agent.model;

import java.util.List;

public record AssistantMessage(String content, List<ToolCall> toolCalls) {
    public AssistantMessage {
        content = content == null ? "" : content;
        toolCalls = toolCalls == null ? List.of() : List.copyOf(toolCalls);
    }

    public boolean needsFollowUp() {
        return !toolCalls.isEmpty();
    }
}
