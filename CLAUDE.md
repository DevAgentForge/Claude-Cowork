# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Open Claude Cowork** is an Electron-based desktop application that provides a GUI interface for Claude Code. It acts as an AI collaboration partner that reuses the same configuration as Claude Code (`~/.claude/settings.json`), enabling visual feedback and session management for AI-assisted programming tasks.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Electron 39 |
| Frontend | React 19, Tailwind CSS 4 |
| State Management | Zustand |
| Database | better-sqlite3 (WAL mode) |
| AI SDK | @anthropic-ai/claude-agent-sdk |
| Build | Vite 7, electron-builder |
| Runtime | Bun (preferred) or Node.js 18+ |

## Development Commands

```bash
# Install dependencies
bun install

# Development (hot reload)
bun run dev

# Build for production
bun run build

# Build distributables
bun run dist:mac    # macOS (arm64)
bun run dist:win    # Windows (x64)
bun run dist:linux  # Linux (x64)

# Lint
bun run lint

# Transpile Electron only
bun run transpile:electron
```

**Makefile shortcuts:**
```bash
make dev          # Development mode
make build        # Production build
make run          # Build + run production
make dist_mac     # macOS distribution
make clean        # Remove dist directories
```

## Architecture

### Process Model

```
┌─────────────────────────────────────────────────┐
│                  Main Process                    │
│  src/electron/                                   │
│  ├── main.ts          → App lifecycle           │
│  ├── ipc-handlers.ts  → IPC event routing       │
│  ├── window-manager.ts → Window management      │
│  └── libs/                                       │
│      ├── runner.ts        → Claude SDK wrapper  │
│      ├── session-store.ts → SQLite persistence  │
│      ├── provider-config.ts → Custom providers  │
│      └── claude-settings.ts → ~/.claude/ loader │
└─────────────────────────────────────────────────┘
                      ↓ IPC
┌─────────────────────────────────────────────────┐
│                Renderer Process                  │
│  src/ui/                                         │
│  ├── App.tsx          → Main component          │
│  ├── store/useAppStore.ts → Zustand state       │
│  ├── hooks/useIPC.ts  → IPC communication       │
│  └── components/      → React components        │
└─────────────────────────────────────────────────┘
```

### Key Data Flow

1. **Session Management**: User creates session → `session.start` IPC → `runClaude()` calls Claude SDK → streams messages via `server-event` IPC → UI updates via Zustand store

2. **Provider Configuration**: Custom LLM providers stored in `~/Library/Application Support/Agent Cowork/providers.json` with encrypted auth tokens (Electron safeStorage)

3. **Persistence**: Sessions and messages stored in SQLite (`sessions.db`) with WAL mode for concurrent access

### IPC Event Types

**Client → Server (`ClientEvent`):**
- `session.start`, `session.continue`, `session.stop`, `session.delete`
- `session.list`, `session.history`
- `permission.response`
- `provider.list`, `provider.save`, `provider.delete`, `provider.get`

**Server → Client (`ServerEvent`):**
- `stream.message`, `stream.user_prompt`
- `session.status`, `session.list`, `session.history`, `session.deleted`
- `permission.request`
- `provider.list`, `provider.saved`, `provider.deleted`, `provider.data`

## Key Files

| File | Purpose |
|------|---------|
| `src/electron/libs/runner.ts` | Wraps Claude Agent SDK, manages streaming, handles tool permissions |
| `src/electron/libs/session-store.ts` | SQLite session/message persistence with path sanitization |
| `src/electron/libs/provider-config.ts` | Custom LLM provider storage with encryption |
| `src/ui/store/useAppStore.ts` | Central Zustand store for UI state |
| `src/electron/types.ts` | Shared TypeScript types for IPC events |

## Custom LLM Providers

The app supports custom Anthropic-compatible API providers (OpenRouter, LiteLLM, AWS Bedrock, etc.). Configuration overrides these environment variables:

- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_AUTH_TOKEN`
- `ANTHROPIC_MODEL`
- `ANTHROPIC_DEFAULT_OPUS_MODEL`
- `ANTHROPIC_DEFAULT_SONNET_MODEL`
- `ANTHROPIC_DEFAULT_HAIKU_MODEL`

See `CUSTOM_PROVIDERS.md` for detailed configuration examples.

## Security Considerations

- **Path Traversal Prevention**: `session-store.ts:sanitizePath()` validates paths
- **SQL Injection Prevention**: Parameterized queries only
- **Token Encryption**: API tokens encrypted via Electron `safeStorage` before disk storage
- **File Permissions**: Provider config file set to `0o600` (owner read/write only)

## Build Outputs

```
dist-electron/  → Transpiled Electron code
dist-react/     → Vite-built frontend
dist/           → electron-builder output (DMG, EXE, AppImage)
```

## Contributor: Alfredo Lopez

Recent commits by Alfredo Lopez (alfredolopez80@gmail.com):

| Commit | Description |
|--------|-------------|
| 5547451 | feat: add .claude/ to gitignore and default providers module |
| 01a81de | feat: add security improvements to session-store |
| 6241191 | feat: add token encryption for providers storage |
| a3f0638 | merge: feature/custom-llm-providers into fix/electron-windows |
| fd702fc | feat: add URL validation and code quality improvements |
| e30bcd8 | fix: improve Makefile and add tsconfig include section |
| 496b8f0 | feat: complete Electron stability improvements (PHASE 2-4) |
| e1fb6cb | feat: add Electron stability improvements (PHASE 1-3) |
| ce9e58d | merge: resolve conflicts with main and keep enhanced orchestrator features |
| 28aa8bc | merge: integrate main branch security fixes with custom providers feature |
| c10329d | feat: add custom LLM providers support |
| e125e1c | feat: add custom LLM providers module with tests and security fixes |
| cafd8d1 | fix: apply security vulnerability fixes (HIGH/MEDIUM/LOW) |
| 7c3b587 | fix: sanitize task config to prevent prototype pollution |
| 2d519f8 | feat: Add enhanced orchestrator with unified task runner and settings manager |
