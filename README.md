# Agent Core

一个最小 TypeScript Agent Core，用来跑简单的模型/工具循环。

## 结构

```text
src/
  session/   AgentSession, AgentTurn
  context/   ContextBuilder, AgentContext
  loop/      AgentLoop
  model/     AgentModel, OpenAiChatModel, OpenAI adapter
  tools/     AgentTool, ToolRegistry, ToolResult
```

核心 loop 只负责通用工具调用流程：

```text
记录用户消息
-> 构造模型消息
-> 调用模型
-> 如果模型请求工具：并行执行工具，按模型返回顺序记录工具结果，继续下一轮
-> 否则记录 assistant 最终回答并结束
```

OpenAI 的 wire format 收口在 `src/model/openai-adapter.ts` 和 `src/model/openai-chat-model.ts`，业务 prompt 和业务工具应该放在 core 包之外。

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

## 使用

```ts
import {
  AgentLoop,
  AgentSession,
  ContextBuilder,
  OpenAiChatModel
} from "agent-core";

const model = new OpenAiChatModel({
  apiKey: process.env.OPENAI_API_KEY ?? "",
  model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini"
});

const loop = new AgentLoop(
  model,
  new Map(),
  "Use tools when needed.",
  new ContextBuilder(12),
  8
);

const session = AgentSession.create("user_1");
const result = await loop.runTurn(session, "hello");
```
