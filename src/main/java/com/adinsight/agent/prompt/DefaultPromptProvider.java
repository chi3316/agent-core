package com.adinsight.agent.prompt;

public class DefaultPromptProvider implements PromptProvider {
    private final String systemPrompt;

    public DefaultPromptProvider() {
        this("You are a helpful agent. Use tools when they are needed, and do not fabricate tool results.");
    }

    public DefaultPromptProvider(String systemPrompt) {
        this.systemPrompt = systemPrompt;
    }

    @Override
    public String systemPrompt() {
        return systemPrompt;
    }
}
