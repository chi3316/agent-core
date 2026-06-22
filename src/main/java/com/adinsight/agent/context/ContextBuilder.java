package com.adinsight.agent.context;

import com.adinsight.agent.model.ToolCall;
import com.adinsight.agent.session.AgentSession;
import com.adinsight.agent.session.AgentTurn;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class ContextBuilder {
    private final int maxTurns;

    public ContextBuilder() {
        this(12);
    }

    public ContextBuilder(int maxTurns) {
        this.maxTurns = maxTurns;
    }

    public AgentContext build(AgentSession session) {
        List<AgentTurn> turns = session.turns();
        int fromIndex = Math.max(0, turns.size() - maxTurns);
        List<Map<String, Object>> messages = new ArrayList<>();

        for (AgentTurn turn : turns.subList(fromIndex, turns.size())) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("role", turn.role().wireName());
            item.put("content", turn.content());
            if (turn.toolCalls() != null && !turn.toolCalls().isEmpty()) {
                item.put("tool_calls", turn.toolCalls().stream().map(ToolCall::toOpenAiMap).toList());
            }
            if (turn.toolCallId() != null) {
                item.put("tool_call_id", turn.toolCallId());
            }
            if (turn.toolName() != null) {
                item.put("tool_name", turn.toolName());
            }
            messages.add(item);
        }

        return new AgentContext(
                session.sessionId(),
                session.userId(),
                Map.copyOf(session.state()),
                List.copyOf(messages)
        );
    }
}
