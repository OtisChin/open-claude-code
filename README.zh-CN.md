# Claude Code 源代码快照 - 安全研究用途

> 本仓库是基于**公开暴露的 Claude Code 源代码快照**还原的可运行版本。本仓库仅用于**教育目的、防御性安全研究和软件供应链分析**。


## 公开快照是如何被获取的

[Chaofan Shou (@Fried_rice)](https://x.com/Fried_rice) 公开指出 Claude Code 源代码可以通过 npm 包中暴露的 `.map` 文件访问：

> **"Claude Code 源代码通过其 npm 注册表中的 map 文件泄露了！"**
>
> — [@Fried_rice，2026 年 3 月 31 日](https://x.com/Fried_rice/status/2038894956459290963)

发布的 source map 引用了托管在 Anthropic R2 存储桶中的未混淆 TypeScript 源码，使得 `src/` 快照可以被公开下载。

---

## 仓库范围

Claude Code 是 Anthropic 的 CLI 工具，用于在终端中与 Claude 交互，执行软件工程任务，如编辑文件、运行命令、搜索代码库和协调工作流。

本仓库包含用于研究和分析的镜像 `src/` 快照。

- **公开暴露发现日期**：2026-03-31
- **语言**：TypeScript
- **运行时**：Bun
- **终端 UI**：React + [Ink](https://github.com/vadimdemedes/ink)
- **规模**：约 1,900 个文件，512,000+ 行代码

---

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 以交互式 TUI 模式启动源码入口

```bash
bun run dev
```

或者直接运行 CLI 入口：

```bash
bun run ./src/entrypoints/cli.tsx
```

### 3. 构建并运行打包后的 snapshot

```bash
bun run build
bun run snapshot -- --help
```

在 Windows 上，snapshot 包装脚本会把 HOME 和配置目录指向仓库内的 `.codex-home/`。

### 4. 配置模型

常见有两种方式可以配置运行模型。

通过 `settings.json` 配置：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:8317/v1",
    "ANTHROPIC_API_KEY": "your-key",
    "ANTHROPIC_MODEL": "gpt-5.4",
    "CLAUDE_CODE_USE_OPENAI_COMPAT": "1"
  }
}
```

默认配置位置：

- 用户设置：`~/.claude/settings.json`
- 全局配置：`~/.claude.json`

如果你希望 exe 启动时读取指定配置目录，可以在启动前设置 `CLAUDE_CONFIG_DIR`：

```powershell
$env:CLAUDE_CONFIG_DIR="D:\code\my\open-claude-code\.codex-home\.claude"
.\dist\OpenClaudeCode.exe
```

也可以只针对单次启动直接设置环境变量：

```powershell
$env:ANTHROPIC_BASE_URL="http://127.0.0.1:8317/v1"
$env:ANTHROPIC_API_KEY="your-key"
$env:ANTHROPIC_MODEL="gpt-5.4"
$env:CLAUDE_CODE_USE_OPENAI_COMPAT="1"
.\dist\OpenClaudeCode.exe
```

### 5. 在 TUI 中唤出伙伴宠物（`/buddy`）

以交互模式启动 CLI 后，在界面里输入：

```text
/buddy
/buddy status
```

说明：

- 伙伴宠物会显示在 TUI 的输入区域旁边，而不是显示在命令的文本输出里。
- 如果你使用 `-p`、`--bare` 这类一次性模式，只会看到命令输出，看不到宠物精灵。
- 想看到完整 sprite，终端宽度最好至少有 100 列。

---

## 目录结构

```text
src/
├── main.tsx                 # 入口点编排（基于 Commander.js 的 CLI 路径）
├── commands.ts              # 命令注册表
├── tools.ts                 # 工具注册表
├── Tool.ts                  # 工具类型定义
├── QueryEngine.ts           # LLM 查询引擎
├── context.ts               # 系统/用户上下文收集
├── cost-tracker.ts          # Token 费用追踪
│
├── commands/                # 斜杠命令实现（约 50 个）
├── tools/                   # 智能体工具实现（约 40 个）
├── components/              # Ink UI 组件（约 140 个）
├── hooks/                   # React Hooks
├── services/                # 外部服务集成
├── screens/                 # 全屏 UI（Doctor、REPL、Resume）
├── types/                   # TypeScript 类型定义
├── utils/                   # 工具函数
│
├── bridge/                  # IDE 和远程控制桥接
├── coordinator/             # 多智能体协调器
├── plugins/                 # 插件系统
├── skills/                  # 技能系统
├── keybindings/             # 快捷键配置
├── vim/                     # Vim 模式
├── voice/                   # 语音输入
├── remote/                  # 远程会话
├── server/                  # 服务器模式
├── memdir/                  # 持久化内存目录
├── tasks/                   # 任务管理
├── state/                   # 状态管理
├── migrations/              # 配置迁移
├── schemas/                 # 配置模式（Zod）
├── entrypoints/             # 初始化逻辑
├── ink/                     # Ink 渲染器包装器
├── buddy/                   # 伙伴精灵
├── native-ts/               # 原生 TypeScript 工具
├── outputStyles/            # 输出样式
├── query/                   # 查询管道
└── upstreamproxy/           # 代理配置
```

---

## 架构概述

### 1. 工具系统 (`src/tools/`)

Claude Code 可调用的每个工具都实现为自包含模块。每个工具定义其输入模式、权限模型和执行逻辑。

| 工具 | 描述 |
|---|---|
| `BashTool` | Shell 命令执行 |
| `FileReadTool` | 文件读取（图片、PDF、笔记本） |
| `FileWriteTool` | 文件创建/覆盖 |
| `FileEditTool` | 部分文件修改（字符串替换） |
| `GlobTool` | 文件模式匹配搜索 |
| `GrepTool` | 基于 ripgrep 的内容搜索 |
| `WebFetchTool` | 获取 URL 内容 |
| `WebSearchTool` | 网页搜索 |
| `AgentTool` | 子智能体生成 |
| `SkillTool` | 技能执行 |
| `MCPTool` | MCP 服务器工具调用 |
| `LSPTool` | 语言服务器协议集成 |
| `NotebookEditTool` | Jupyter 笔记本编辑 |
| `TaskCreateTool` / `TaskUpdateTool` | 任务创建和管理 |
| `SendMessageTool` | 智能体间消息传递 |
| `TeamCreateTool` / `TeamDeleteTool` | 团队智能体管理 |
| `EnterPlanModeTool` / `ExitPlanModeTool` | 计划模式切换 |
| `EnterWorktreeTool` / `ExitWorktreeTool` | Git worktree 隔离 |
| `ToolSearchTool` | 延迟工具发现 |
| `CronCreateTool` | 定时触发器创建 |
| `RemoteTriggerTool` | 远程触发器 |
| `SleepTool` | 主动模式等待 |
| `SyntheticOutputTool` | 结构化输出生成 |

### 2. 命令系统 (`src/commands/`)

用户使用的斜杠命令，以 `/` 前缀调用。

| 命令 | 描述 |
|---|---|
| `/commit` | 创建 git 提交 |
| `/review` | 代码审查 |
| `/compact` | 上下文压缩 |
| `/mcp` | MCP 服务器管理 |
| `/config` | 设置管理 |
| `/doctor` | 环境诊断 |
| `/login` / `/logout` | 身份验证 |
| `/memory` | 持久化内存管理 |
| `/skills` | 技能管理 |
| `/tasks` | 任务管理 |
| `/vim` | Vim 模式切换 |
| `/diff` | 查看更改 |
| `/cost` | 查看使用费用 |
| `/theme` | 更改主题 |
| `/context` | 上下文可视化 |
| `/pr_comments` | 查看 PR 评论 |
| `/resume` | 恢复之前的会话 |
| `/share` | 分享会话 |
| `/desktop` | 桌面应用切换 |
| `/mobile` | 移动应用切换 |

### 3. 服务层 (`src/services/`)

| 服务 | 描述 |
|---|---|
| `api/` | Anthropic API 客户端、文件 API、引导程序 |
| `mcp/` | Model Context Protocol 服务器连接和管理 |
| `oauth/` | OAuth 2.0 认证流程 |
| `lsp/` | 语言服务器协议管理器 |
| `analytics/` | 基于 GrowthBook 的功能开关和分析 |
| `plugins/` | 插件加载器 |
| `compact/` | 对话上下文压缩 |
| `policyLimits/` | 组织策略限制 |
| `remoteManagedSettings/` | 远程托管设置 |
| `extractMemories/` | 自动记忆提取 |
| `tokenEstimation.ts` | Token 数量估算 |
| `teamMemorySync/` | 团队记忆同步 |

### 4. 桥接系统 (`src/bridge/`)

连接 IDE 扩展（VS Code、JetBrains）与 Claude Code CLI 的双向通信层。

- `bridgeMain.ts` — 桥接主循环
- `bridgeMessaging.ts` — 消息协议
- `bridgePermissionCallbacks.ts` — 权限回调
- `replBridge.ts` — REPL 会话桥接
- `jwtUtils.ts` — 基于 JWT 的认证
- `sessionRunner.ts` — 会话执行管理

### 5. 权限系统 (`src/hooks/toolPermission/`)

在每次工具调用时检查权限。根据配置的权限模式（`default`、`plan`、`bypassPermissions`、`auto` 等）提示用户批准/拒绝或自动解析。

### 6. 功能开关

通过 Bun 的 `bun:bundle` 功能开关进行死代码消除：

```typescript
import { feature } from 'bun:bundle'

// 非活动代码在构建时会被完全剥离
const voiceCommand = feature('VOICE_MODE')
  ? require('./commands/voice/index.js').default
  : null
```

值得注意的开关：`PROACTIVE`、`KAIROS`、`BRIDGE_MODE`、`DAEMON`、`VOICE_MODE`、`AGENT_TRIGGERS`、`MONITOR_TOOL`

---

## 关键文件详解

### `QueryEngine.ts`（约 46K 行）

用于 LLM API 调用的核心引擎。处理流式响应、工具调用循环、思考模式、重试逻辑和 Token 计数。

### `Tool.ts`（约 29K 行）

定义所有工具的基础类型和接口 — 输入模式、权限模型和进度状态类型。

### `commands.ts`（约 25K 行）

管理所有斜杠命令的注册和执行。使用条件导入来按环境加载不同的命令集。

### `main.tsx`

基于 Commander.js 的 CLI 解析器和 React/Ink 渲染器初始化。启动时，它会并行加载 MDM 设置、Keychain 预取和 GrowthBook 初始化，以加快启动速度。

---

## 技术栈

| 类别 | 技术 |
|---|---|
| 运行时 | [Bun](https://bun.sh) |
| 语言 | TypeScript（严格模式） |
| 终端 UI | [React](https://react.dev) + [Ink](https://github.com/vadimdemedes/ink) |
| CLI 解析 | [Commander.js](https://github.com/tj/commander.js)（extra-typings） |
| 模式验证 | [Zod v4](https://zod.dev) |
| 代码搜索 | [ripgrep](https://github.com/BurntSushi/ripgrep) |
| 协议 | [MCP SDK](https://modelcontextprotocol.io)、LSP |
| API | [Anthropic SDK](https://docs.anthropic.com) |
| 遥测 | OpenTelemetry + gRPC |
| 功能开关 | GrowthBook |
| 认证 | OAuth 2.0、JWT、macOS Keychain |

---

## 值得注意的设计模式

### 并行预取

通过在重型模块评估开始之前并行预取 MDM 设置、Keychain 读取和 API 预连接来优化启动时间。

```typescript
// main.tsx — 在其他导入之前作为副作用触发
startMdmRawRead()
startKeychainPrefetch()
```

### 延迟加载

重型模块（OpenTelemetry、gRPC、分析和一些功能门控子系统）通过动态 `import()` 延迟到实际需要时才加载。

### 智能体群

子智能体通过 `AgentTool` 生成，由 `coordinator/` 处理多智能体编排。`TeamCreateTool` 支持团队级并行工作。

### 技能系统

在 `skills/` 中定义的可重用工作流通过 `SkillTool` 执行。用户可以添加自定义技能。

### 插件架构

内置和第三方插件通过 `plugins/` 子系统加载。

---

## 研究/所有权声明

- 本仓库是一个由大学生维护的**教育和防御性安全研究档案**。
- 它旨在研究源代码暴露、打包失败以及现代智能体 CLI 系统的架构。
- 原始 Claude Code 源代码仍然是 **Anthropic** 的财产。
- 本仓库**与 Anthropic 没有关联、未经其认可或由其维护**。
