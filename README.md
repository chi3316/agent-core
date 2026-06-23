# Agent Core

一个最小 TypeScript Agent Core，用来跑简单的模型/工具循环。

## 结构

```text
src/
  session/   Session, Turn
  context/   buildContext, Context
  loop/      createLoop
  model/     Model, OpenAiChatModel, OpenAI adapter
  tools/     Tool, toolMap, enabledTools, ToolResult
```

核心 loop 只负责通用工具调用流程：

```text
记录用户消息
-> 构造模型消息
-> 调用模型
-> 如果模型请求工具：并行执行工具，按模型返回顺序记录工具结果，继续下一轮
-> 否则记录 assistant 最终回答并结束
```

OpenAI 的 wire format 收口在 `src/model/openai-adapter.ts` 和 `src/model/openai-chat-model.ts`。工具输入用 Zod schema 解析，业务 prompt 和业务工具应该放在 core 包之外。

## 安装

```bash
npx --yes pnpm@10.34.4 install
```

## 验证

```bash
npx --yes pnpm@10.34.4 typecheck
npx --yes pnpm@10.34.4 test
npx --yes pnpm@10.34.4 build
```

## REPL

```bash
export OPENAI_API_KEY=...
export OPENAI_MODEL=gpt-4.1-mini
npx --yes pnpm@10.34.4 repl
```

REPL 默认带一个 `echo` 示例工具。

可选环境变量：

```text
OPENAI_BASE_URL          默认 https://api.openai.com/v1
OPENAI_TEMPERATURE      默认 0.2
AGENT_SYSTEM_PROMPT     覆盖默认 system prompt
AGENT_CONTEXT_TURNS     默认 12
AGENT_MAX_STEPS         默认 8
AGENT_USER_ID           默认 repl_user
```

`OPENAI_BASE_URL` 可以填根地址，也可以填完整的 `/chat/completions` 地址。

## 使用

```ts
import {
  Session,
  createLoop,
  OpenAiChatModel
} from "agent-core";

const model = new OpenAiChatModel({
  apiKey: process.env.OPENAI_API_KEY ?? "",
  model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
});

const loop = createLoop({
  model,
  tools: [],
  systemPrompt: "Use tools when needed.",
  context: { maxTurns: 12 },
  maxSteps: 8
});

const session = Session.create("user_1");
const result = await loop.runTurn(session, "hello");
```
