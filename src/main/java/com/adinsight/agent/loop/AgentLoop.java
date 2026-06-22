package com.adinsight.agent.loop;

import com.adinsight.agent.context.AgentContext;
import com.adinsight.agent.context.ContextBuilder;
import com.adinsight.agent.model.AgentModel;
import com.adinsight.agent.model.AssistantMessage;
import com.adinsight.agent.model.ModelRequest;
import com.adinsight.agent.model.ToolCall;
import com.adinsight.agent.prompt.PromptProvider;
import com.adinsight.agent.session.AgentSession;
import com.adinsight.agent.session.AgentTurn;
import com.adinsight.agent.tools.AgentTool;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

public class AgentLoop {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final AgentModel model;
    private final Map<String, AgentTool<?>> tools;
    private final PromptProvider promptProvider;
    private final ContextBuilder contextBuilder;
    private final int maxSteps;

    public AgentLoop(
            AgentModel model,
            Map<String, AgentTool<?>> tools,
            PromptProvider promptProvider,
            ContextBuilder contextBuilder,
            int maxSteps
    ) {
        this.model = model;
        this.tools = Map.copyOf(tools);
        this.promptProvider = promptProvider;
        this.contextBuilder = contextBuilder;
        this.maxSteps = maxSteps;
    }

    public CompletableFuture<AgentLoopResult> runTurn(AgentSession session, String userMessage) {
        session.append(AgentTurn.user(userMessage));
        return runIterations(session, 0, null, Map.of());
    }

    private CompletableFuture<AgentLoopResult> runIterations(
            AgentSession session,
            int turnCount,
            String lastModel,
            Map<String, Object> lastUsage
    ) {
        if (turnCount >= maxSteps) {
            return forceSummary(session, turnCount, lastModel, lastUsage);
        }

        ModelRequest request = prepareModelRequest(session, "auto");
        return model.complete(request)
                .thenCompose(response -> {
                    AssistantMessage message = response.message();
                    if (!message.needsFollowUp()) {
                        session.append(AgentTurn.assistant(
                                message.content(),
                                List.of(),
                                response.model(),
                                response.usage()
                        ));
                        return CompletableFuture.completedFuture(new AgentLoopResult(
                                message.content(),
                                response.model(),
                                response.usage(),
                                FinishReason.COMPLETED,
                                turnCount
                        ));
                    }

                    session.append(AgentTurn.assistant(
                            message.content(),
                            message.toolCalls(),
                            response.model(),
                            response.usage()
                    ));

                    return executeTools(session, message.toolCalls())
                            .thenCompose(ignored -> runIterations(
                                    session,
                                    turnCount + 1,
                                    response.model(),
                                    response.usage()
                            ));
                })
                .exceptionally(ex -> {
                    String content = "Model call failed: " + rootMessage(ex);
                    session.append(AgentTurn.assistant(content, List.of(), lastModel, lastUsage));
                    return new AgentLoopResult(content, lastModel, lastUsage, FinishReason.MODEL_ERROR, turnCount);
                });
    }

    private ModelRequest prepareModelRequest(AgentSession session, String toolChoice) {
        List<Map<String, Object>> messages = buildOpenAiMessages(session);
        List<Map<String, Object>> toolDefs = tools.values().stream()
                .map(AgentTool::toOpenAiToolDef)
                .toList();

        return new ModelRequest(
                messages,
                toolDefs,
                toolChoice,
                session.numericUserId().isPresent() ? session.numericUserId().getAsLong() : null,
                session.numericSessionId().isPresent() ? session.numericSessionId().getAsLong() : null
        );
    }

    private CompletableFuture<Void> executeTools(AgentSession session, List<ToolCall> toolCalls) {
        CompletableFuture<Void> chain = CompletableFuture.completedFuture(null);
        for (ToolCall toolCall : toolCalls) {
            chain = chain.thenCompose(ignored -> executeTool(session, toolCall));
        }
        return chain;
    }

    private CompletableFuture<Void> executeTool(AgentSession session, ToolCall toolCall) {
        AgentTool<?> tool = tools.get(toolCall.name());
        Map<String, Object> args = parseArgs(toolCall.argumentsJson());
        CompletableFuture<Map<String, Object>> resultFuture = tool == null
                ? CompletableFuture.completedFuture(errorResult("Unknown tool: " + toolCall.name()))
                : tool.call(args, session).exceptionally(ex -> errorResult(rootMessage(ex)));

        return resultFuture.thenAccept(result -> session.append(AgentTurn.tool(
                toolCall.id(),
                toolCall.name(),
                args,
                summarizeToolResult(result)
        )));
    }

    private CompletableFuture<AgentLoopResult> forceSummary(
            AgentSession session,
            int turnCount,
            String lastModel,
            Map<String, Object> lastUsage
    ) {
        return model.complete(prepareModelRequest(session, "none"))
                .thenApply(response -> {
                    String content = response.message().content().isBlank()
                            ? "Too many steps; stopped. Please narrow the request and try again."
                            : response.message().content();
                    session.append(AgentTurn.assistant(content, List.of(), response.model(), response.usage()));
                    return new AgentLoopResult(
                            content,
                            response.model() == null ? lastModel : response.model(),
                            response.usage().isEmpty() ? lastUsage : response.usage(),
                            FinishReason.FORCED_SUMMARY,
                            turnCount
                    );
                });
    }

    private List<Map<String, Object>> buildOpenAiMessages(AgentSession session) {
        AgentContext context = contextBuilder.build(session);
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", promptProvider.systemPrompt()));
        messages.add(Map.of("role", "system", "content", runtimeContext(context)));
        messages.addAll(toOpenAiMessages(context.messages()));
        return messages;
    }

    private String runtimeContext(AgentContext context) {
        try {
            return "Runtime context:\n" + MAPPER.writeValueAsString(Map.of(
                    "session_id", context.sessionId(),
                    "state", context.state()
            ));
        } catch (JsonProcessingException e) {
            return "Runtime context: {}";
        }
    }

    private static List<Map<String, Object>> toOpenAiMessages(List<Map<String, Object>> items) {
        List<Map<String, Object>> messages = new ArrayList<>();
        Set<String> validToolCallIds = new HashSet<>();

        for (Map<String, Object> item : items) {
            String role = String.valueOf(item.get("role"));
            if ("assistant".equals(role)) {
                Map<String, Object> message = new LinkedHashMap<>();
                message.put("role", "assistant");
                message.put("content", item.getOrDefault("content", ""));
                Object toolCalls = item.get("tool_calls");
                if (toolCalls instanceof List<?> calls && !calls.isEmpty()) {
                    message.put("tool_calls", toolCalls);
                    for (Object call : calls) {
                        if (call instanceof Map<?, ?> callMap && callMap.get("id") != null) {
                            validToolCallIds.add(String.valueOf(callMap.get("id")));
                        }
                    }
                }
                messages.add(message);
            } else if ("tool".equals(role)) {
                Object toolCallId = item.get("tool_call_id");
                if (toolCallId != null && validToolCallIds.contains(String.valueOf(toolCallId))) {
                    Map<String, Object> message = new LinkedHashMap<>();
                    message.put("role", "tool");
                    message.put("tool_call_id", toolCallId);
                    message.put("name", item.get("tool_name"));
                    message.put("content", item.getOrDefault("content", ""));
                    messages.add(message);
                }
            } else if ("user".equals(role) || "system".equals(role)) {
                messages.add(Map.of("role", role, "content", item.getOrDefault("content", "")));
            }
        }

        return messages;
    }

    private static Map<String, Object> parseArgs(String rawArgs) {
        try {
            Object value = MAPPER.readValue(rawArgs == null || rawArgs.isBlank() ? "{}" : rawArgs, Object.class);
            if (value instanceof Map<?, ?> map) {
                Map<String, Object> result = new LinkedHashMap<>();
                map.forEach((key, item) -> result.put(String.valueOf(key), item));
                return result;
            }
        } catch (Exception ignored) {
        }
        return Map.of();
    }

    private static Map<String, Object> errorResult(String error) {
        return Map.of("error", error);
    }

    private static String summarizeToolResult(Map<String, Object> result) {
        try {
            String text = MAPPER.writeValueAsString(result);
            int maxChars = 1200;
            return text.length() <= maxChars ? text : text.substring(0, maxChars) + "...[truncated]";
        } catch (JsonProcessingException e) {
            return String.valueOf(result);
        }
    }

    private static String rootMessage(Throwable throwable) {
        Throwable current = throwable;
        while (current.getCause() != null) {
            current = current.getCause();
        }
        return current.getMessage() == null ? current.getClass().getSimpleName() : current.getMessage();
    }
}
