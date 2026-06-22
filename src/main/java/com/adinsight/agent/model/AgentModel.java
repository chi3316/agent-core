package com.adinsight.agent.model;

import java.util.concurrent.CompletableFuture;

public interface AgentModel {
    CompletableFuture<ModelResponse> complete(ModelRequest request);
}
