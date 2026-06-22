package com.adinsight.agent.tools;

public record ToolPermission(Behavior behavior, String message) {
    public enum Behavior {
        ALLOW,
        DENY
    }

    public static ToolPermission allow() {
        return new ToolPermission(Behavior.ALLOW, null);
    }

    public static ToolPermission deny(String message) {
        return new ToolPermission(Behavior.DENY, message);
    }

    public boolean denied() {
        return behavior == Behavior.DENY;
    }
}
