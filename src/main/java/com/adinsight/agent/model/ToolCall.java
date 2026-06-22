package com.adinsight.agent.model;

import java.util.LinkedHashMap;
import java.util.Map;

public record ToolCall(String id, String name, String argumentsJson) {
    public Map<String, Object> toOpenAiMap() {
        Map<String, Object> function = new LinkedHashMap<>();
        function.put("name", name);
        function.put("arguments", argumentsJson == null ? "{}" : argumentsJson);

        Map<String, Object> value = new LinkedHashMap<>();
        value.put("id", id);
        value.put("type", "function");
        value.put("function", function);
        return value;
    }
}
