package com.adinsight.agent.loop;

import com.adinsight.agent.context.ContextBuilder;
import com.adinsight.agent.model.AgentModel;
import com.adinsight.agent.model.AssistantMessage;
import com.adinsight.agent.model.ModelRequest;
import com.adinsight.agent.model.ModelResponse;
import com.adinsight.agent.model.ToolCall;
import com.adinsight.agent.prompt.DefaultPromptProvider;
import com.adinsight.agent.session.AgentSession;
import com.adinsight.agent.session.TurnRole;
import com.adinsight.agent.tools.AgentTool;
import com.adinsight.agent.tools.EchoTool;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AgentLoopTest {
    @Test
    void runsToolCallThenFinalAnswer() {
        AgentSession session = AgentSession.create("42", "100");
        AgentModel model = new ScriptedModel();
        AgentTool<?> echo = new EchoTool();

        AgentLoop loop = new AgentLoop(
                model,
                Map.of(echo.name(), echo),
                new DefaultPromptProvider("Use tools when needed."),
                new ContextBuilder(12),
                4
        );

        AgentLoopResult result = loop.runTurn(session, "say hello").join();

        assertEquals(FinishReason.COMPLETED, result.finishReason());
        assertEquals("final answer", result.content());
        assertEquals(List.of(TurnRole.USER, TurnRole.ASSISTANT, TurnRole.TOOL, TurnRole.ASSISTANT),
                session.turns().stream().map(turn -> turn.role()).toList());
        assertTrue(session.turns().get(2).content().contains("hello"));
    }

    private static class ScriptedModel implements AgentModel {
        private final AtomicInteger calls = new AtomicInteger();

        @Override
        public CompletableFuture<ModelResponse> complete(ModelRequest request) {
            if (calls.getAndIncrement() == 0) {
                return CompletableFuture.completedFuture(new ModelResponse(
                        new AssistantMessage("", List.of(new ToolCall("call_1", "echo", "{\"text\":\"hello\"}"))),
                        "test-model",
                        Map.of("prompt_tokens", 1)
                ));
            }
            return CompletableFuture.completedFuture(new ModelResponse(
                    new AssistantMessage("final answer", List.of()),
                    "test-model",
                    Map.of("completion_tokens", 1)
            ));
        }
    }
}
