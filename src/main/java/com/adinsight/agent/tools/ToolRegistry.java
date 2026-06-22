package com.adinsight.agent.tools;

import com.adinsight.agent.session.AgentSession;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ToolRegistry {
    private final List<AgentTool<?>> tools;

    public ToolRegistry(List<AgentTool<?>> tools) {
        this.tools = List.copyOf(tools);
    }

    public Map<String, AgentTool<?>> getTools(AgentSession session) {
        Map<String, AgentTool<?>> enabledTools = new LinkedHashMap<>();
        for (AgentTool<?> tool : tools) {
            if (tool.isEnabled(session)) {
                enabledTools.put(tool.name(), tool);
            }
        }
        return enabledTools;
    }
}
