package com.adinsight.agent.session;

import com.adinsight.agent.model.ToolCall;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public class AgentTurn {
    private final TurnRole role;
    private final String content;
    private final String toolCallId;
    private final String toolName;
    private final Map<String, Object> toolArgs;
    private final List<ToolCall> toolCalls;
    private final String model;
    private final Map<String, Object> usage;
    private final Instant createdAt;

    private AgentTurn(Builder builder) {
        this.role = builder.role;
        this.content = builder.content == null ? "" : builder.content;
        this.toolCallId = builder.toolCallId;
        this.toolName = builder.toolName;
        this.toolArgs = builder.toolArgs == null ? null : Map.copyOf(builder.toolArgs);
        this.toolCalls = builder.toolCalls == null ? null : List.copyOf(builder.toolCalls);
        this.model = builder.model;
        this.usage = builder.usage == null ? null : Map.copyOf(builder.usage);
        this.createdAt = builder.createdAt == null ? Instant.now() : builder.createdAt;
    }

    public static AgentTurn user(String content) {
        return builder(TurnRole.USER).content(content).build();
    }

    public static AgentTurn assistant(String content, List<ToolCall> toolCalls, String model, Map<String, Object> usage) {
        return builder(TurnRole.ASSISTANT)
                .content(content)
                .toolCalls(toolCalls)
                .model(model)
                .usage(usage)
                .build();
    }

    public static AgentTurn tool(String toolCallId, String toolName, Map<String, Object> toolArgs, String content) {
        return builder(TurnRole.TOOL)
                .toolCallId(toolCallId)
                .toolName(toolName)
                .toolArgs(toolArgs)
                .content(content)
                .build();
    }

    public static Builder builder(TurnRole role) {
        return new Builder(role);
    }

    public TurnRole role() {
        return role;
    }

    public String content() {
        return content;
    }

    public String toolCallId() {
        return toolCallId;
    }

    public String toolName() {
        return toolName;
    }

    public Map<String, Object> toolArgs() {
        return toolArgs;
    }

    public List<ToolCall> toolCalls() {
        return toolCalls;
    }

    public String model() {
        return model;
    }

    public Map<String, Object> usage() {
        return usage;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public static final class Builder {
        private final TurnRole role;
        private String content;
        private String toolCallId;
        private String toolName;
        private Map<String, Object> toolArgs;
        private List<ToolCall> toolCalls;
        private String model;
        private Map<String, Object> usage;
        private Instant createdAt;

        private Builder(TurnRole role) {
            this.role = role;
        }

        public Builder content(String content) {
            this.content = content;
            return this;
        }

        public Builder toolCallId(String toolCallId) {
            this.toolCallId = toolCallId;
            return this;
        }

        public Builder toolName(String toolName) {
            this.toolName = toolName;
            return this;
        }

        public Builder toolArgs(Map<String, Object> toolArgs) {
            this.toolArgs = toolArgs;
            return this;
        }

        public Builder toolCalls(List<ToolCall> toolCalls) {
            this.toolCalls = toolCalls;
            return this;
        }

        public Builder model(String model) {
            this.model = model;
            return this;
        }

        public Builder usage(Map<String, Object> usage) {
            this.usage = usage;
            return this;
        }

        public Builder createdAt(Instant createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public AgentTurn build() {
            return new AgentTurn(this);
        }
    }
}
