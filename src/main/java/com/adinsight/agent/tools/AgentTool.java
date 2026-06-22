package com.adinsight.agent.tools;

import com.adinsight.agent.session.AgentSession;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

public interface AgentTool<I> {
    ObjectMapper MAPPER = new ObjectMapper();

    String name();

    String description();

    Class<I> inputType();

    Map<String, Object> inputSchema();

    CompletableFuture<ToolResult> execute(I input, ToolContext context);

    default boolean isEnabled(AgentSession session) {
        return true;
    }

    default CompletableFuture<ToolPermission> checkPermission(I input, ToolContext context) {
        return CompletableFuture.completedFuture(ToolPermission.allow());
    }

    default CompletableFuture<Map<String, Object>> call(Map<String, Object> args, AgentSession session) {
        I input = MAPPER.convertValue(args == null ? Map.of() : args, inputType());
        ToolContext context = new ToolContext(session);
        return checkPermission(input, context)
                .thenCompose(permission -> {
                    if (permission.denied()) {
                        return CompletableFuture.completedFuture(ToolResult.failure(
                                permission.message() == null ? "permission denied" : permission.message()
                        ));
                    }
                    return execute(input, context);
                })
                .thenApply(this::shapeResult);
    }

    default Map<String, Object> toOpenAiToolDef() {
        Map<String, Object> function = new LinkedHashMap<>();
        function.put("name", name());
        function.put("description", description());
        function.put("parameters", inputSchema());

        Map<String, Object> definition = new LinkedHashMap<>();
        definition.put("type", "function");
        definition.put("function", function);
        return definition;
    }

    default Map<String, Object> shapeResult(ToolResult result) {
        Map<String, Object> shaped = new LinkedHashMap<>();
        shaped.put("ok", result.ok());
        shaped.put("data", result.data());
        shaped.put("metadata", result.metadata());
        if (result.error() != null) {
            shaped.put("error", result.error());
        }
        return shaped;
    }
}
