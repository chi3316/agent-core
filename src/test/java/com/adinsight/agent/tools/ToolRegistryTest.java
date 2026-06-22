package com.adinsight.agent.tools;

import com.adinsight.agent.session.AgentSession;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ToolRegistryTest {
    @Test
    void returnsEnabledToolsByName() {
        ToolRegistry registry = new ToolRegistry(List.of(new EchoTool()));

        assertTrue(registry.getTools(AgentSession.create("u1")).containsKey("echo"));
    }
}
