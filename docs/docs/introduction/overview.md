# Overview

**Agent Cowork** is a desktop application built with Electron that enables developers to create domain-specialized AI assistants powered by Claude. It provides a flexible architecture for building custom AI tools tailored to specific industries or use cases.

## What is Agent Cowork?

Agent Cowork is built on top of the [Anthropic Agent SDK](https://github.com/anthropics/anthropic-sdk-typescript), providing:

- **Desktop UI**: Clean, modern interface built with React 19 and Tailwind CSS 4
- **Session Management**: Persistent conversations with SQLite storage
- **Tool Integration**: SDK-powered tools (Read, Edit, Bash, Grep, Glob, etc.)
- **Extensibility**: Support for MCP servers, hooks, custom agents, and skills
- **Personality System**: Config-based framework for creating specialized AI variants (coming soon)

## Key Features

### For Users
- Desktop application for macOS, Windows, and Linux
- Persistent conversation sessions
- File system integration with read/edit capabilities
- Bash command execution
- Clean, distraction-free interface

### For Developers
- **React 19 + TypeScript** frontend with modern tooling
- **Electron** for cross-platform desktop support
- **Zustand** for state management
- **Tailwind CSS 4** with custom theme
- **Anthropic Agent SDK** integration
- **SQLite** for local data persistence
- **IPC** communication layer between UI and backend
- **Extensible architecture** for custom tools, agents, and personalities

## Use Cases

Agent Cowork can be customized for various domains:

- **Medical**: HIPAA-compliant medical coding assistant
- **Legal**: Document review and contract analysis
- **Financial**: Audit and compliance checking
- **Development**: Specialized coding assistants (e.g., security-focused, testing-focused)
- **Education**: Custom tutoring systems
- **Research**: Domain-specific research assistants

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  (src/ui/)                                              │
│  - Components: App, Sidebar, EventCard, PromptInput     │
│  - State: Zustand (useAppStore)                         │
│  - Styling: Tailwind CSS 4                              │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ IPC Events
                 │
┌────────────────▼────────────────────────────────────────┐
│              Electron Main Process                       │
│  (src/electron/)                                        │
│  - IPC Handlers: session.start, message.send           │
│  - Session Store: SQLite persistence                    │
│  - Runner: SDK query() integration                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ SDK API Calls
                 │
┌────────────────▼────────────────────────────────────────┐
│          Anthropic Agent SDK                            │
│  - Tools: Read, Edit, Bash, Grep, Glob                 │
│  - Agents: Multi-agent coordination                     │
│  - MCP: Model Context Protocol servers                  │
│  - Hooks: Pre/post tool execution                       │
└─────────────────────────────────────────────────────────┘
```

## Learning Path

We recommend following this path to learn Agent Cowork development:

1. **Quick Start** (15 min): Get the app running locally
2. **Architecture Overview** (45 min): Understand the system design
3. **Frontend Guide** (2 hours): Learn React patterns and make UI changes
4. **Personality System** (4 hours): Create custom AI personalities
5. **SDK Integration** (varies): Add tools, MCP servers, hooks, and agents
6. **Build & Deployment** (1 day): Create production builds and variants

## Documentation Structure

- **Introduction**: Overview, quick start, architecture
- **Guides**: Step-by-step tutorials for frontend, backend, and build processes
- **Personality System**: Creating domain-specialized variants
- **SDK Integration**: Tools, MCP servers, hooks, agents, and skills
- **Cookbook**: Copy-paste examples for common tasks
- **API Reference**: Type definitions and API details
- **Troubleshooting**: Common issues and debugging

## Next Steps

- [Quick Start](/introduction/quick-start) - Get up and running in 15 minutes
- [Architecture](/introduction/architecture) - Deep dive into system design
- [Frontend Guide](/guides/frontend/overview) - Start making UI changes
