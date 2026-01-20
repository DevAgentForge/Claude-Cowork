# API Reference Overview

Complete API reference for Agent Cowork.

## Available APIs

### Electron APIs
- Main process APIs
- IPC communication
- System integration

### React APIs
- Component props
- Hooks
- Context providers

### Type Definitions
- Session types
- Message types
- Configuration types

## Coming Soon

Detailed API documentation is being generated. For now, refer to:

- **Source Code**: Browse the TypeScript source files for type definitions
- **SDK Reference**: See [Anthropic Agent SDK](/agents_sdk) for SDK APIs
- **Examples**: Check the [Cookbook](/cookbook/add-ui-component) for usage examples

## Type Definitions

Key types used throughout Agent Cowork:

### Session

```typescript
interface Session {
  id: string
  cwd: string
  createdAt: number
  lastAccessedAt: number
  personalityId?: string
  metadata?: string
}
```

### Message

```typescript
interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: number
}
```

### PersonalityConfig

```typescript
interface PersonalityConfig {
  name: string
  description: string
  version: string
  tools?: {
    allowed?: string[]
    denied?: string[]
  }
  mcpServers?: MCPServerConfig[]
  systemPrompt?: string
  model?: string
  hooks?: {
    preToolUse?: string
    postToolUse?: string
  }
}
```

For more details, see the TypeScript source files in `src/electron/types.ts`.
