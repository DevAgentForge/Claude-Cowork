# Tools Overview

Understanding and configuring tools in Agent Cowork.

## What are Tools?

**Tools** are capabilities that the AI assistant can use to interact with the system:
- **Read**: Read file contents
- **Edit**: Modify existing files
- **Write**: Create new files
- **Bash**: Execute shell commands
- **Grep**: Search file contents
- **Glob**: Find files by pattern
- **Task**: Launch specialized agents
- And more...

Tools are provided by the [Anthropic Agent SDK](/agents_sdk).

## Built-in Tools

### File Operations

**Read** - Read file contents
```typescript
{
  name: "Read",
  description: "Read a file from the filesystem",
  parameters: {
    file_path: "string",
    offset: "number (optional)",
    limit: "number (optional)"
  }
}
```

**Edit** - Modify existing files
```typescript
{
  name: "Edit",
  description: "Edit file contents with exact string replacement",
  parameters: {
    file_path: "string",
    old_string: "string",
    new_string: "string"
  }
}
```

**Write** - Create new files
```typescript
{
  name: "Write",
  description: "Write content to a file",
  parameters: {
    file_path: "string",
    content: "string"
  }
}
```

### Search Operations

**Grep** - Search file contents
```typescript
{
  name: "Grep",
  description: "Search for patterns in files using ripgrep",
  parameters: {
    pattern: "string",
    path: "string (optional)",
    glob: "string (optional)",
    output_mode: "'content' | 'files_with_matches' | 'count'"
  }
}
```

**Glob** - Find files by pattern
```typescript
{
  name: "Glob",
  description: "Find files matching a glob pattern",
  parameters: {
    pattern: "string",
    path: "string (optional)"
  }
}
```

### Execution

**Bash** - Execute shell commands
```typescript
{
  name: "Bash",
  description: "Execute bash commands",
  parameters: {
    command: "string",
    timeout: "number (optional)"
  }
}
```

## Configuring Tools

### Default Configuration

**File**: `src/electron/libs/runner.ts:63`

```typescript
const DEFAULT_TOOLS = [
  'Read',
  'Edit',
  'Write',
  'Bash',
  'Grep',
  'Glob',
  'Task'
]

export async function query(messages: Message[], options: QueryOptions) {
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    tools: DEFAULT_TOOLS,
    messages
  })
}
```

### Restricting Tools

**Via Personality System:**

```yaml
# personalities/read-only.yaml
tools:
  allowed:
    - "Read"
    - "Grep"
    - "Glob"
  denied:
    - "Bash"
    - "Edit"
    - "Write"
```

**Via Code:**

```typescript
export async function query(messages: Message[], options: QueryOptions) {
  // Apply personality tool restrictions
  let tools = DEFAULT_TOOLS

  if (options.personality?.tools) {
    if (options.personality.tools.allowed) {
      tools = tools.filter((t) =>
        options.personality.tools.allowed.includes(t)
      )
    }

    if (options.personality.tools.denied) {
      tools = tools.filter((t) =>
        !options.personality.tools.denied.includes(t)
      )
    }
  }

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    tools,
    messages
  })
}
```

## Custom Tools

### Adding a Custom Tool

**Not currently supported**, but can be added via MCP servers.

See [MCP Servers](/sdk-integration/mcp-servers/overview) for adding custom tool capabilities.

## Tool Permissions

### Runtime Permission Checking

```typescript
interface QueryOptions {
  onEvent: (event: Event) => void
  personality?: PersonalityConfig

  // NEW: Tool permission callback
  canUseTool?: (toolName: string, toolInput: any) => Promise<boolean>
}

export async function query(messages: Message[], options: QueryOptions) {
  // Check permissions before tool use
  if (options.canUseTool) {
    const allowed = await options.canUseTool(toolName, toolInput)
    if (!allowed) {
      return { error: 'Tool usage denied by permission policy' }
    }
  }

  // ... execute tool
}
```

### Permission Patterns

**File Path Whitelist:**
```typescript
canUseTool: async (toolName, toolInput) => {
  if (['Read', 'Edit', 'Write'].includes(toolName)) {
    const allowedPaths = ['/home/user/safe-directory']
    return allowedPaths.some((p) => toolInput.file_path.startsWith(p))
  }
  return true
}
```

**Command Whitelist:**
```typescript
canUseTool: async (toolName, toolInput) => {
  if (toolName === 'Bash') {
    const allowedCommands = ['ls', 'cat', 'grep']
    const command = toolInput.command.split(' ')[0]
    return allowedCommands.includes(command)
  }
  return true
}
```

## Tool Usage Logging

### Via Hooks

```typescript
// hooks/tool-logger.js
module.exports = {
  preToolUse: async (toolName, toolInput, context) => {
    console.log(`[Tool] ${toolName}`, toolInput)
    return { allowed: true }
  },

  postToolUse: async (toolName, toolInput, toolOutput, context) => {
    console.log(`[Tool Complete] ${toolName}`, {
      success: !toolOutput.error
    })
  }
}
```

Add to personality:

```yaml
hooks:
  preToolUse: "./hooks/tool-logger.js"
  postToolUse: "./hooks/tool-logger.js"
```

## Best Practices

### 1. Principle of Least Privilege

Only enable tools that are necessary:

```yaml
# Good: Minimal tools for code review
tools:
  allowed: ["Read", "Grep", "Glob"]

# Avoid: All tools enabled by default
tools:
  allowed: ["Read", "Edit", "Write", "Bash", "Grep", "Glob"]
```

### 2. Dangerous Tool Combinations

Avoid combinations that enable unintended behavior:

```yaml
# Risky: Edit + Bash allows code injection
tools:
  allowed: ["Edit", "Bash"]

# Better: Choose one or the other
tools:
  allowed: ["Edit"]  # OR ["Bash"] but not both
```

### 3. Tool-Specific Constraints

Use hooks to add fine-grained control:

```javascript
// hooks/bash-restrictions.js
module.exports = {
  preToolUse: async (toolName, toolInput) => {
    if (toolName === 'Bash') {
      // Block dangerous commands
      const dangerous = ['rm -rf', 'dd', 'mkfs', ':(){:|:&};:']
      if (dangerous.some((cmd) => toolInput.command.includes(cmd))) {
        return { allowed: false, reason: 'Dangerous command blocked' }
      }
    }
    return { allowed: true }
  }
}
```

## SDK Reference

For complete tool documentation, see:
- **[Anthropic Agent SDK](/agents_sdk)** - Full SDK documentation
- **[Hooks](/sdk-integration/hooks/overview)** - Tool execution hooks
- **[Personality System](/personality-system/overview)** - Tool configuration via personalities

## Next Steps

- **[MCP Servers](/sdk-integration/mcp-servers/overview)** - Add external tool capabilities
- **[Hooks](/sdk-integration/hooks/overview)** - Tool execution lifecycle
- **[Personality System](/personality-system/creating-personalities)** - Configure tools per personality
