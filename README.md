[简体中文](README_ZH.md)

# Claude Cowork

A **desktop AI assistant** that helps you with **programming, file management, and any task you can describe**.

It is **fully compatible with the exact same configuration as Claude Code**, which means you can run it with **any Anthropic-compatible large language model**.

> Not just a GUI.  
> A real AI collaboration partner.  
> No need to learn the Claude Agent SDK — just create tasks and choose execution paths.

An example of organizing a local folder:


https://github.com/user-attachments/assets/8ce58c8b-4024-4c01-82ee-f8d8ed6d4bba


---

## ✨ Why Claude Cowork?

Claude Code is powerful — but it **only runs in the terminal**.

That means:
- ❌ No visual feedback for complex tasks
- ❌ Hard to track multiple sessions
- ❌ Tool outputs are inconvenient to inspect

**Agent Cowork solves these problems:**

- 🖥️ Runs as a **native desktop application**
- 🤖 Acts as your **AI collaboration partner** for any task
- 🔁 Reuses your **existing `~/.claude/settings.json`**
- 🧠 **100% compatible** with Claude Code

If Claude Code works on your machine —  
**Agent Cowork works too.**

---

## 🚀 Quick Start

Before using Agent Cowork, make sure Claude Code is installed and properly configured.

### Option 1: Download a Release

👉 [Go to Releases](https://github.com/DevAgentForge/agent-cowork/releases)

---

### Option 2: Build from Source

#### Prerequisites

- [Bun](https://bun.sh/) or Node.js 18+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

bash
# Clone the repository
git clone https://github.com/DevAgentForge/agent-cowork.git
cd agent-cowork

# Install dependencies
bun install

# Run in development mode
bun run dev

# Or build production binaries
bun run dist:mac    # macOS
bun run dist:win    # Windows
bun run dist:linux  # Linux
`

---

## 🧠 Core Capabilities

### 🤖 AI Collaboration Partner — Not Just a GUI

Agent Cowork is your AI partner that can:

* **Write and edit code** — in any programming language
* **Manage files** — create, move, and organize
* **Run commands** — build, test, deploy
* **Answer questions** — about your codebase
* **Do anything** — as long as you can describe it in natural language

---

### 📂 Session Management

* Create sessions with **custom working directories**
* Resume any previous conversation
* Complete local session history (stored in SQLite)
* Safe deletion and automatic persistence

---

### 🎯 Real-Time Streaming Output

* **Token-by-token streaming output**
* View Claude’s reasoning process
* Markdown rendering with syntax-highlighted code
* Visualized tool calls with status indicators

---

### 🔐 Tool Permission Control

* Explicit approval required for sensitive actions
* Allow or deny per tool
* Interactive decision panels
* Full control over what Claude is allowed to do

---

## 🔁 完全兼容 Claude Code

Claude Cowork **与 Claude Code 共享配置**，同时支持 **MiniMax 大模型**。

它直接复用：

```
~/.claude/settings.json
```

这意味着：

- 相同的 API 密钥
- 相同的 Base URL
- 相同的模型配置
- 相同的行为表现

### MiniMax 支持

| 配置项 | 说明 |
|--------|------|
| API Key | MiniMax API 密钥 |
| Base URL | API 端点地址 |
| Model | 使用的模型名称 |

#### 环境变量配置

```bash
# MiniMax 配置
MINIMAX_API_KEY=your_api_key
MINIMAX_BASE_URL=https://api.minimax.chat/v1
MINIMAX_MODEL=abab6.5s-chat
```

### 图形化配置

点击侧边栏的 **齿轮图标** (⚙️) 打开设置界面，你可以：

- 配置 MiniMax 的 API 密钥、Base URL 和模型
- 一键切换不同配置
- 保存常用设置

> 配置一次，随时使用。

---

## 🧩 Architecture Overview

| Layer            | Technology                     |
| ---------------- | ------------------------------ |
| Framework        | Electron 39                    |
| Frontend         | React 19, Tailwind CSS 4       |
| State Management | Zustand                        |
| Database         | better-sqlite3 (WAL mode)      |
| AI               | @anthropic-ai/claude-agent-sdk |
| Build            | Vite, electron-builder         |

---

## 🛠 Development

bash
# Start development server (hot reload)
bun run dev

# Type checking / build
bun run build


---

## 🗺 路线图

计划中的功能：

- ✅ 图形化配置模型和 API 密钥
- ✅ MiniMax 大模型支持
- 🚧 更多功能即将推出

---

## 🤝 Contributing

Pull requests are welcome.

1. Fork this repository
2. Create your feature branch
3. Commit your changes
4. Open a Pull Request

---

## ⭐ Final Words

If you’ve ever wanted:

* A persistent desktop AI collaboration partner
* Visual insight into how Claude works
* Convenient session management across projects

This project is built for you.

👉 **If it helps you, please give it a Star.**

---

## License

MIT



