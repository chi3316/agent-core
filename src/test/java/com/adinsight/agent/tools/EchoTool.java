package com.adinsight.agent.tools;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

public class EchoTool implements AgentTool<EchoTool.Input> {
    public record Input(String text) {
    }

    @Override
    public String name() {
        return "echo";
    }

    @Override
    public String description() {
        return "Echoes the provided text.";
    }

    @Override
    public Class<Input> inputType() {
        return Input.class;
    }

    @Override
    public Map<String, Object> inputSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "text", Map.of("type", "string", "description", "Text to echo")
                ),
                "required", java.util.List.of("text")
        );
    }

    @Override
    public CompletableFuture<ToolResult> execute(Input input, ToolContext context) {
        return CompletableFuture.completedFuture(ToolResult.success(Map.of("text", input.text())));
    }
}
