package com.adinsight.agent.tools;

import java.util.Map;

public record ToolResult(
        boolean ok,
        Object data,
        String error,
        Map<String, Object> metadata
) {
    public ToolResult {
        metadata = metadata == null ? Map.of() : Map.copyOf(metadata);
    }

    public static ToolResult success(Object data) {
        return new ToolResult(true, data, null, Map.of());
    }

    public static ToolResult success(Object data, Map<String, Object> metadata) {
        return new ToolResult(true, data, null, metadata);
    }

    public static ToolResult failure(String error) {
        return new ToolResult(false, null, error, Map.of());
    }

    public static ToolResult failure(String error, Map<String, Object> metadata) {
        return new ToolResult(false, null, error, metadata);
    }
}
