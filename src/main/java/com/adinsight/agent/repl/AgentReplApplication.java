package com.adinsight.agent.repl;

import com.adinsight.agent.context.ContextBuilder;
import com.adinsight.agent.loop.AgentLoop;
import com.adinsight.agent.loop.AgentLoopResult;
import com.adinsight.agent.model.OpenAiChatModel;
import com.adinsight.agent.prompt.DefaultPromptProvider;
import com.adinsight.agent.session.AgentSession;
import com.adinsight.agent.session.AgentTurn;
import com.adinsight.agent.session.InMemorySessionStore;
import com.adinsight.agent.tools.AgentTool;
import com.adinsight.agent.tools.ToolContext;
import com.adinsight.agent.tools.ToolResult;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

public class AgentReplApplication {
    private static final String BOLD = "\033[1m";
    private static final String DIM = "\033[2m";
    private static final String RESET = "\033[0m";
    private static final String GREEN = "\033[32m";
    private static final String YELLOW = "\033[33m";
    private static final String BLUE = "\033[34m";
    private static final String CYAN = "\033[36m";
    private static final String MAGENTA = "\033[35m";
    private static final String RED = "\033[31m";

    public static void main(String[] args) throws IOException {
        ReplConfig config = ReplConfig.fromEnv();
        if (config.apiKey() == null || config.apiKey().isBlank()) {
            System.out.println(RED + "Missing OPENAI_API_KEY." + RESET);
            System.out.println(DIM + "Set OPENAI_API_KEY, then run: mvn exec:java" + RESET);
            return;
        }

        System.out.println(DIM + "Initializing Agent REPL..." + RESET);
        OpenAiChatModel model = new OpenAiChatModel(
                HttpClient.newHttpClient(),
                URI.create(config.endpoint()),
                config.apiKey(),
                config.model(),
                config.temperature()
        );
        AgentLoop loop = new AgentLoop(
                model,
                defaultReplTools(),
                new DefaultPromptProvider(config.systemPrompt()),
                new ContextBuilder(config.maxContextTurns()),
                config.maxSteps()
        );
        Repl repl = new Repl(new InMemorySessionStore(), loop);
        System.out.println(GREEN + "Service ready." + RESET);
        repl.run();
    }

    private static Map<String, AgentTool<?>> defaultReplTools() {
        AgentTool<?> echoTool = new ReplEchoTool();
        return Map.of(echoTool.name(), echoTool);
    }

    private record ReplConfig(
            String apiKey,
            String endpoint,
            String model,
            Double temperature,
            String systemPrompt,
            int maxContextTurns,
            int maxSteps
    ) {
        static ReplConfig fromEnv() {
            return new ReplConfig(
                    System.getenv("OPENAI_API_KEY"),
                    normalizeChatCompletionsEndpoint(envOrDefault("OPENAI_BASE_URL", "https://api.openai.com/v1")),
                    envOrDefault("OPENAI_MODEL", "gpt-4o-mini"),
                    Double.parseDouble(envOrDefault("OPENAI_TEMPERATURE", "0.2")),
                    envOrDefault(
                            "AGENT_SYSTEM_PROMPT",
                            "You are a helpful agent. Answer clearly. Use tools only when they are available and needed."
                    ),
                    Integer.parseInt(envOrDefault("AGENT_CONTEXT_TURNS", "12")),
                    Integer.parseInt(envOrDefault("AGENT_MAX_STEPS", "8"))
            );
        }

        private static String envOrDefault(String name, String fallback) {
            String value = System.getenv(name);
            return value == null || value.isBlank() ? fallback : value;
        }

        private static String normalizeChatCompletionsEndpoint(String value) {
            String endpoint = value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
            if (endpoint.endsWith("/chat/completions")) {
                return endpoint;
            }
            return endpoint + "/chat/completions";
        }
    }

    private static final class Repl {
        private static final String HELP_TEXT = """

                Agent REPL

                Commands:
                  /help          Show this message
                  /quit, /exit   Exit the REPL
                  /clear         Start a fresh session
                  /history       Show the current session's turn history
                  /turns         Show detailed turn listing
                  /info          Show current session info

                Tips:
                  - The session is preserved across turns.
                  - Send an empty line to re-send the previous message.
                  - Type your message and press Enter to send.
                """;

        private final InMemorySessionStore sessionStore;
        private final AgentLoop loop;
        private final BufferedReader input;
        private final String userId = "1";
        private String sessionId;
        private String lastMessage;
        private int seenTurns;
        private boolean running = true;

        private Repl(InMemorySessionStore sessionStore, AgentLoop loop) {
            this.sessionStore = sessionStore;
            this.loop = loop;
            this.input = new BufferedReader(new InputStreamReader(System.in));
        }

        void run() throws IOException {
            printRule();
            System.out.println(BOLD + "Agent REPL" + RESET + "  " + DIM + "/help for commands, /quit to exit" + RESET);
            printRule();

            while (running) {
                String line = prompt();
                if (line == null) {
                    System.out.println();
                    break;
                }

                line = line.trim();
                if (line.isBlank()) {
                    if (lastMessage == null) {
                        continue;
                    }
                    line = lastMessage;
                    System.out.println(DIM + "(re-sending previous message)" + RESET);
                }

                if (line.startsWith("/")) {
                    dispatch(line);
                    continue;
                }

                lastMessage = line;
                sendAndDisplay(line);
            }
        }

        private String prompt() throws IOException {
            String sessionHint = "";
            if (sessionId != null) {
                String shortId = sessionId.length() > 12 ? sessionId.substring(sessionId.length() - 12) : sessionId;
                sessionHint = DIM + "[" + shortId + "] " + RESET;
            }
            System.out.print("\n" + BOLD + YELLOW + ">" + RESET + " " + sessionHint);
            return input.readLine();
        }

        private void dispatch(String raw) {
            String command = raw.toLowerCase().split("\\s+")[0];
            switch (command) {
                case "/help", "/h", "/?" -> System.out.println(HELP_TEXT);
                case "/quit", "/exit", "/q" -> {
                    System.out.println("\n" + DIM + "Goodbye." + RESET + "\n");
                    running = false;
                }
                case "/clear" -> clear();
                case "/history" -> history(false);
                case "/turns" -> history(true);
                case "/info" -> info();
                default -> System.out.println(RED + "Unknown command: " + command + RESET + "  " + DIM + "Type /help." + RESET);
            }
        }

        private void clear() {
            sessionId = null;
            lastMessage = null;
            seenTurns = 0;
            System.out.println(GREEN + "Session cleared. Next message starts a fresh conversation." + RESET);
        }

        private void info() {
            System.out.println("\n" + BOLD + "Session Info:" + RESET);
            System.out.println("  user_id:    " + userId);
            System.out.println("  session_id: " + (sessionId == null ? "(not started yet)" : sessionId));
            AgentSession session = currentSession();
            if (session != null) {
                System.out.println("  turns:      " + session.turns().size());
            }
        }

        private void history(boolean detailed) {
            AgentSession session = currentSession();
            if (session == null || session.turns().isEmpty()) {
                System.out.println(DIM + "(no turns yet)" + RESET);
                return;
            }

            System.out.println("\n" + BOLD + (detailed ? "Detailed turns" : "Turns") + " (" + session.turns().size() + " total):" + RESET);
            for (int i = 0; i < session.turns().size(); i++) {
                if (detailed) {
                    printTurnDetailed(i, session.turns().get(i));
                } else {
                    printTurn(i, session.turns().get(i));
                }
            }
        }

        private AgentSession currentSession() {
            if (sessionId == null) {
                return null;
            }
            return sessionStore.getOrCreate(userId, sessionId);
        }

        private void sendAndDisplay(String message) {
            System.out.println("\n" + BOLD + BLUE + "You:" + RESET + " " + message);
            AgentSession session = sessionStore.getOrCreate(userId, sessionId);
            AgentLoopResult result;
            try {
                result = loop.runTurn(session, message).join();
            } catch (Exception ex) {
                System.out.println(RED + "Error: " + rootMessage(ex) + RESET);
                return;
            }

            sessionStore.save(session);
            sessionId = session.sessionId();

            System.out.println(sub("turn_count=" + result.turnCount() + "  finish=" + result.finishReason()));
            if (result.model() != null) {
                System.out.println(sub("model=" + result.model()));
            }
            System.out.println("\n" + GREEN + BOLD + "Agent:" + RESET + " " + result.content());
            printNewTurns(session);
        }

        private void printNewTurns(AgentSession session) {
            if (session.turns().size() <= seenTurns) {
                return;
            }

            List<AgentTurn> newTurns = session.turns().subList(seenTurns, session.turns().size());
            seenTurns = session.turns().size();
            System.out.println("\n" + DIM + "-- turns this round --" + RESET);
            for (AgentTurn turn : newTurns) {
                String label = turn.role().wireName();
                if (turn.toolName() != null) {
                    label += " :: " + YELLOW + turn.toolName() + RESET;
                }
                String preview = preview(turn.content(), 200);
                System.out.println("  " + label + (preview.isBlank() ? "" : ": " + DIM + preview + RESET));
            }
        }

        private static void printTurn(int index, AgentTurn turn) {
            String label = "[" + index + "] " + turn.role().wireName();
            if (turn.toolName() != null) {
                label += " :: " + turn.toolName();
            }
            System.out.println("  " + colorFor(turn) + label + RESET + ": " + preview(turn.content(), 300));
        }

        private static void printTurnDetailed(int index, AgentTurn turn) {
            System.out.println("\n  " + BOLD + colorFor(turn) + "[" + index + "] " + turn.role().wireName() + RESET);
            if (turn.toolName() != null) {
                System.out.println("    " + CYAN + "tool_name:" + RESET + " " + turn.toolName());
            }
            if (turn.toolCallId() != null) {
                System.out.println("    " + CYAN + "tool_call_id:" + RESET + " " + turn.toolCallId());
            }
            if (turn.toolArgs() != null) {
                System.out.println("    " + CYAN + "tool_args:" + RESET + " " + turn.toolArgs());
            }
            if (turn.toolCalls() != null && !turn.toolCalls().isEmpty()) {
                System.out.println("    " + CYAN + "tool_calls:" + RESET + " " + turn.toolCalls());
            }
            if (turn.model() != null) {
                System.out.println("    " + CYAN + "model:" + RESET + " " + turn.model());
            }
            if (!turn.content().isBlank()) {
                System.out.println("    " + CYAN + "content:" + RESET + " " + preview(turn.content(), 800));
            }
        }

        private static String preview(String value, int maxChars) {
            if (value == null) {
                return "";
            }
            if (value.length() <= maxChars) {
                return value;
            }
            return value.substring(0, maxChars) + "...[truncated]";
        }

        private static String colorFor(AgentTurn turn) {
            return switch (turn.role()) {
                case USER -> BLUE;
                case ASSISTANT -> GREEN;
                case TOOL -> YELLOW;
                case SYSTEM -> MAGENTA;
            };
        }

        private static String sub(String text) {
            return BOLD + MAGENTA + "  > " + text + RESET;
        }

        private static void printRule() {
            System.out.println(DIM + "-".repeat(80) + RESET);
        }

        private static String rootMessage(Throwable throwable) {
            Throwable current = throwable;
            while (current.getCause() != null) {
                current = current.getCause();
            }
            return current.getMessage() == null ? current.getClass().getSimpleName() : current.getMessage();
        }
    }

    private static final class ReplEchoTool implements AgentTool<ReplEchoTool.Input> {
        private record Input(String text) {
        }

        @Override
        public String name() {
            return "echo";
        }

        @Override
        public String description() {
            return "Echoes text back to the user. Use this when the user asks to call the echo tool.";
        }

        @Override
        public Class<Input> inputType() {
            return Input.class;
        }

        @Override
        public Map<String, Object> inputSchema() {
            return Map.of(
                    "type", "object",
                    "properties", Map.of(
                            "text", Map.of(
                                    "type", "string",
                                    "description", "The exact text to echo back."
                            )
                    ),
                    "required", List.of("text")
            );
        }

        @Override
        public CompletableFuture<ToolResult> execute(Input input, ToolContext context) {
            return CompletableFuture.completedFuture(ToolResult.success(Map.of("text", input.text())));
        }
    }
}
