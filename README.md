# Agent Core

一个最小 Java Agent Core，用来跑简单的模型/工具循环。

## 结构

```text
src/main/java/com/adinsight/agent/
  session/   AgentSession, AgentTurn, SessionStore
  context/   ContextBuilder
  loop/      AgentLoop
  model/     AgentModel, OpenAiChatModel
  prompt/    PromptProvider
  tools/     AgentTool, ToolRegistry, ToolResult
```

核心 loop 只负责通用工具调用流程：

```text
记录用户消息
-> 构造模型消息
-> 调用模型
-> 如果模型请求工具：执行工具，记录工具结果，继续下一轮
-> 否则记录 assistant 最终回答并结束
```

业务 prompt 和业务工具应该放在 core 包之外。

## 运行测试

```bash
mvn test
```

## REPL

设置模型配置，然后启动简单调试控制台：

```bash
export OPENAI_API_KEY=...
export OPENAI_MODEL=gpt-4o-mini
mvn exec:java
```

REPL 默认带一个很小的 `echo` 示例工具，方便验证工具调用行为。

可选环境变量：

```text
OPENAI_BASE_URL          默认 https://api.openai.com/v1
OPENAI_TEMPERATURE      默认 0.2
AGENT_SYSTEM_PROMPT     覆盖默认 system prompt
AGENT_CONTEXT_TURNS     默认 12
AGENT_MAX_STEPS         默认 8
```

`OPENAI_BASE_URL` 可以填根地址，也可以填完整的 `/chat/completions` 地址。
如果缺少 `/chat/completions`，REPL 会自动补上。
