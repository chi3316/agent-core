package com.adinsight.agent.model;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

public class OpenAiChatModel implements AgentModel {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final HttpClient httpClient;
    private final URI endpoint;
    private final String apiKey;
    private final String model;
    private final Double temperature;

    public OpenAiChatModel(String apiKey, String model) {
        this(HttpClient.newHttpClient(), URI.create("https://api.openai.com/v1/chat/completions"), apiKey, model, 0.2);
    }

    public OpenAiChatModel(HttpClient httpClient, URI endpoint, String apiKey, String model, Double temperature) {
        this.httpClient = httpClient;
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.model = model;
        this.temperature = temperature;
    }

    @Override
    public CompletableFuture<ModelResponse> complete(ModelRequest request) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", model);
        payload.put("messages", request.messages());
        if (temperature != null && !model.toLowerCase().startsWith("gpt-5")) {
            payload.put("temperature", temperature);
        }
        if (!request.tools().isEmpty()) {
            payload.put("tools", request.tools());
            payload.put("tool_choice", request.toolChoice());
        }

        HttpRequest httpRequest;
        try {
            httpRequest = HttpRequest.newBuilder(endpoint)
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(MAPPER.writeValueAsString(payload)))
                    .build();
        } catch (IOException e) {
            return CompletableFuture.failedFuture(e);
        }

        return httpClient.sendAsync(httpRequest, HttpResponse.BodyHandlers.ofString())
                .thenApply(response -> {
                    if (response.statusCode() < 200 || response.statusCode() >= 300) {
                        throw new IllegalStateException("Model call failed: HTTP " + response.statusCode() + " " + response.body());
                    }
                    try {
                        return parseResponse(response.body());
                    } catch (IOException e) {
                        throw new IllegalStateException("Failed to parse model response", e);
                    }
                });
    }

    private ModelResponse parseResponse(String body) throws IOException {
        JsonNode root = MAPPER.readTree(body);
        JsonNode choice = root.path("choices").path(0);
        JsonNode message = choice.path("message");
        List<ToolCall> toolCalls = new ArrayList<>();

        for (JsonNode item : message.path("tool_calls")) {
            JsonNode function = item.path("function");
            toolCalls.add(new ToolCall(
                    item.path("id").asText(),
                    function.path("name").asText(),
                    function.path("arguments").asText("{}")
            ));
        }

        Map<String, Object> usage = MAPPER.convertValue(root.path("usage"), Map.class);
        return new ModelResponse(
                new AssistantMessage(message.path("content").asText(""), toolCalls),
                root.path("model").asText(model),
                usage
        );
    }
}
