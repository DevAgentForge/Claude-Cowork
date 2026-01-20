# Creating Personalities

Step-by-step guide to creating your own personality profiles for Agent Cowork.

## Goal

By the end of this guide, you'll have created a custom personality that:
- Restricts available tools
- Adds domain-specific instructions
- Integrates external MCP servers (optional)
- Includes compliance hooks (optional)

**Time**: ~4 hours (basic personality in 30 minutes, full-featured in 4 hours)

## Prerequisites

- Agent Cowork installed and running
- Basic YAML knowledge
- (Optional) Node.js for MCP servers and hooks

## Step 1: Create Config File

### 1.1 Create Personalities Directory

```bash
cd agent-cowork
mkdir -p personalities
```

### 1.2 Create Your First Personality

Create `personalities/code-reviewer.yaml`:

```yaml
name: "Code Reviewer"
description: "Security-focused code review assistant"
version: "1.0.0"
author: "Your Name"

# Restrict to read-only tools
tools:
  allowed:
    - "Read"
    - "Grep"
    - "Glob"
  denied:
    - "Bash"
    - "Edit"
    - "Write"

# Custom system prompt
systemPrompt: |
  You are a security-focused code review assistant.

  Your role is to:
  - Review code for security vulnerabilities
  - Identify OWASP Top 10 issues
  - Suggest secure coding practices
  - Check for dependency vulnerabilities

  IMPORTANT CONSTRAINTS:
  - You can ONLY read and search files (no editing or execution)
  - Focus on security issues, not style or formatting
  - Provide actionable recommendations
  - Cite specific line numbers and file paths

  Common vulnerabilities to check:
  - SQL Injection
  - XSS (Cross-Site Scripting)
  - CSRF (Cross-Site Request Forgery)
  - Authentication/Authorization issues
  - Insecure dependencies
  - Hardcoded secrets
  - Path traversal

model: "claude-sonnet-4-5-20250929"
```

**What we did:**
- ✅ Set metadata (name, description, version)
- ✅ Restricted tools to read-only (Read, Grep, Glob)
- ✅ Denied editing and execution tools (Bash, Edit, Write)
- ✅ Wrote domain-specific system prompt
- ✅ Selected the model

## Step 2: Test the Personality

### 2.1 Start Agent Cowork

```bash
bun run dev
```

### 2.2 Create a New Session

1. Click "New Session"
2. Select "Code Reviewer" from the personality dropdown
3. Choose a working directory (a codebase to review)
4. Click "Start Session"

### 2.3 Test Tool Restrictions

Try these commands:

```
✅ Works: "Read the main.ts file"
✅ Works: "Search for all TODO comments"
❌ Blocked: "Edit main.ts to fix the bug"
❌ Blocked: "Run npm test"
```

The assistant should respond:
- For allowed tools: Execute normally
- For denied tools: "I don't have access to the Edit/Bash tool in this personality"

## Step 3: Add MCP Server (Optional)

MCP (Model Context Protocol) servers provide external tools and data sources.

### 3.1 Create a Simple MCP Server

Create `mcp-servers/security-scanner/index.js`:

```javascript
#!/usr/bin/env node

import { Server } from '@anthropic-ai/mcp-sdk'

const server = new Server({
  name: 'security-scanner',
  version: '1.0.0'
})

// Register a tool to check for hardcoded secrets
server.tool({
  name: 'scan_for_secrets',
  description: 'Scan a file for potential hardcoded secrets (API keys, passwords, tokens)',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Path to the file to scan'
      }
    },
    required: ['file_path']
  },
  handler: async ({ file_path }) => {
    const fs = require('fs')
    const content = fs.readFileSync(file_path, 'utf-8')

    const patterns = [
      { name: 'API Key', regex: /api[_-]?key\s*=\s*['"]([^'"]+)['"]/gi },
      { name: 'Password', regex: /password\s*=\s*['"]([^'"]+)['"]/gi },
      { name: 'Token', regex: /token\s*=\s*['"]([^'"]+)['"]/gi },
      { name: 'Secret', regex: /secret\s*=\s*['"]([^'"]+)['"]/gi }
    ]

    const findings = []
    for (const pattern of patterns) {
      const matches = [...content.matchAll(pattern.regex)]
      for (const match of matches) {
        findings.push({
          type: pattern.name,
          value: match[1],
          line: content.substring(0, match.index).split('\n').length
        })
      }
    }

    return {
      file: file_path,
      findings,
      summary: `Found ${findings.length} potential secret(s)`
    }
  }
})

server.start()
```

### 3.2 Update Personality Config

Update `personalities/code-reviewer.yaml`:

```yaml
name: "Code Reviewer"
description: "Security-focused code review assistant"
version: "1.0.0"

tools:
  allowed: ["Read", "Grep", "Glob"]
  denied: ["Bash", "Edit", "Write"]

# Add MCP server
mcpServers:
  - name: "security-scanner"
    type: "stdio"
    command: "node"
    args: ["./mcp-servers/security-scanner/index.js"]

systemPrompt: |
  You are a security-focused code review assistant.

  You have access to:
  - File reading tools (Read, Grep, Glob)
  - Security scanner tool (scan_for_secrets)

  Use the scan_for_secrets tool to check files for hardcoded secrets.

model: "claude-sonnet-4-5-20250929"
```

### 3.3 Test MCP Integration

Start a new session with the updated personality:

```
User: "Scan main.ts for hardcoded secrets"
Assistant: [Uses scan_for_secrets tool]
```

The assistant should use the `scan_for_secrets` MCP tool to analyze the file.

## Step 4: Add Hooks (Optional)

Hooks allow you to execute custom code before/after tool usage for logging, validation, or compliance.

### 4.1 Create Audit Logger Hook

Create `hooks/audit-logger.js`:

```javascript
#!/usr/bin/env node

/**
 * Audit Logger Hook
 * Logs all tool usage to a file for compliance/audit purposes
 */

const fs = require('fs')
const path = require('path')

const AUDIT_LOG = path.join(process.env.HOME, '.agent-cowork-audit.log')

module.exports = {
  /**
   * Called before tool execution
   */
  preToolUse: async (toolName, toolInput, context) => {
    const entry = {
      timestamp: new Date().toISOString(),
      event: 'tool_use_start',
      tool: toolName,
      input: toolInput,
      sessionId: context.sessionId,
      user: context.user || 'unknown'
    }

    fs.appendFileSync(AUDIT_LOG, JSON.stringify(entry) + '\n')

    // Return true to allow execution
    return { allowed: true }
  },

  /**
   * Called after tool execution
   */
  postToolUse: async (toolName, toolInput, toolOutput, context) => {
    const entry = {
      timestamp: new Date().toISOString(),
      event: 'tool_use_complete',
      tool: toolName,
      success: !toolOutput.error,
      sessionId: context.sessionId
    }

    fs.appendFileSync(AUDIT_LOG, JSON.stringify(entry) + '\n')
  }
}
```

### 4.2 Update Personality Config

Update `personalities/code-reviewer.yaml`:

```yaml
name: "Code Reviewer"
description: "Security-focused code review assistant"
version: "1.0.0"

tools:
  allowed: ["Read", "Grep", "Glob"]
  denied: ["Bash", "Edit", "Write"]

mcpServers:
  - name: "security-scanner"
    type: "stdio"
    command: "node"
    args: ["./mcp-servers/security-scanner/index.js"]

# Add hooks
hooks:
  preToolUse: "./hooks/audit-logger.js"
  postToolUse: "./hooks/audit-logger.js"

systemPrompt: |
  You are a security-focused code review assistant.

  All your actions are logged for audit purposes.

model: "claude-sonnet-4-5-20250929"
```

### 4.3 Test Hooks

After using the personality, check the audit log:

```bash
cat ~/.agent-cowork-audit.log
```

You should see entries like:

```json
{"timestamp":"2026-01-20T18:00:00.000Z","event":"tool_use_start","tool":"Read","input":{"file_path":"main.ts"},"sessionId":"abc123"}
{"timestamp":"2026-01-20T18:00:01.000Z","event":"tool_use_complete","tool":"Read","success":true,"sessionId":"abc123"}
```

## Step 5: Advanced Configuration

### 5.1 Environment Variables

Use environment variables in configs:

```yaml
mcpServers:
  - name: "external-api"
    type: "http"
    url: "https://api.example.com"
    apiKey: "${EXTERNAL_API_KEY}"  # Reads from env var
```

Set the variable before starting:

```bash
export EXTERNAL_API_KEY="your-api-key"
bun run dev
```

### 5.2 Multiple MCP Servers

Combine multiple data sources:

```yaml
mcpServers:
  - name: "security-scanner"
    type: "stdio"
    command: "node"
    args: ["./mcp-servers/security-scanner/index.js"]

  - name: "vulnerability-db"
    type: "http"
    url: "https://nvd.nist.gov/api"

  - name: "code-quality"
    type: "stdio"
    command: "node"
    args: ["./mcp-servers/code-quality/index.js"]
```

### 5.3 Default Settings

Set default session preferences:

```yaml
name: "Code Reviewer"
# ...

defaults:
  cwd: "~/Projects"
  autoSave: false  # Prevent accidental saves
```

## Complete Example: Medical Assistant

Here's a full-featured personality for HIPAA-compliant medical coding:

```yaml
name: "Medical Assistant"
description: "HIPAA-compliant medical coding and documentation assistant"
version: "1.0.0"
author: "Healthcare IT Team"

# Strict tool restrictions
tools:
  allowed:
    - "Read"
    - "Grep"
    - "Glob"
  denied:
    - "Bash"    # No shell access
    - "Edit"    # No file editing without approval
    - "Write"

# Medical-specific MCP servers
mcpServers:
  - name: "medical-terminology"
    type: "stdio"
    command: "node"
    args: ["./mcp-servers/medical-terminology/index.js"]
    env:
      UMLS_API_KEY: "${UMLS_API_KEY}"

  - name: "icd-10"
    type: "http"
    url: "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search"

  - name: "cpt-codes"
    type: "http"
    url: "https://api.example.com/cpt"
    apiKey: "${CPT_API_KEY}"

# HIPAA compliance hooks
hooks:
  preToolUse: "./hooks/hipaa-logger.js"
  postToolUse: "./hooks/phi-detector.js"

# Domain-specific system prompt
systemPrompt: |
  You are a medical coding and documentation assistant specialized in:
  - ICD-10-CM diagnosis coding
  - CPT procedure coding
  - Medical record review
  - Documentation improvement suggestions

  CRITICAL HIPAA COMPLIANCE REQUIREMENTS:
  - Never store or log Protected Health Information (PHI)
  - All tool usage is logged for compliance
  - You can only READ files, not modify them
  - No shell command execution allowed
  - Request explicit confirmation before any action

  You have access to:
  - Medical terminology database (UMLS)
  - ICD-10-CM code lookup
  - CPT code lookup
  - File reading and searching tools

  Workflow:
  1. Review the medical documentation
  2. Identify diagnoses and procedures
  3. Suggest appropriate ICD-10 and CPT codes
  4. Note any documentation gaps
  5. Provide coding rationale

model: "claude-sonnet-4-5-20250929"

defaults:
  cwd: "~/Medical/Patients"
  autoSave: false
```

## Validation and Testing

### Validate Config

Use a YAML validator:

```bash
# Install yamllint
npm install -g yaml-lint

# Validate your config
yaml-lint personalities/code-reviewer.yaml
```

### Test Checklist

- [ ] Personality appears in dropdown
- [ ] Tool restrictions work (allowed tools execute, denied tools blocked)
- [ ] System prompt is applied (check assistant's behavior)
- [ ] MCP servers connect successfully
- [ ] Hooks execute (check logs)
- [ ] Environment variables resolve correctly
- [ ] Default settings apply

### Debug Mode

Enable debug logging:

```bash
DEBUG=personality:* bun run dev
```

Check logs:
- Personality loading: `[PersonalityRegistry] Loaded: code-reviewer`
- Tool restrictions: `[Runner] Blocked tool: Bash (not in allowed list)`
- MCP connections: `[MCP] Connected to security-scanner`
- Hook execution: `[Hooks] Pre-tool: audit-logger`

## Best Practices

### 1. Config Organization

```yaml
# Good: Clear sections with comments
name: "Code Reviewer"
version: "1.0.0"

# Tool Configuration
tools:
  allowed: ["Read", "Grep", "Glob"]

# External Integrations
mcpServers:
  - name: "security-scanner"
    # ...

# Behavior Configuration
systemPrompt: |
  ...
```

### 2. Tool Restrictions

```yaml
# Good: Explicit allow list
tools:
  allowed: ["Read", "Grep"]  # Only what's needed

# Avoid: Deny list only (allows future tools by default)
tools:
  denied: ["Bash"]
```

### 3. System Prompts

**Good:**
- Specific role and responsibilities
- Clear constraints
- Available tools/resources
- Expected workflow

**Avoid:**
- Vague instructions
- Contradictory rules
- Overly long prompts (> 1000 words)

### 4. Versioning

Follow semantic versioning:

```yaml
version: "1.0.0"  # major.minor.patch

# 1.0.0 → 1.0.1: Bug fixes, minor tweaks
# 1.0.0 → 1.1.0: New features, backward compatible
# 1.0.0 → 2.0.0: Breaking changes
```

### 5. Security

**Never hardcode secrets:**
```yaml
# Bad
apiKey: "sk_live_abc123..."

# Good
apiKey: "${API_KEY}"
```

**Validate external URLs:**
```yaml
mcpServers:
  - name: "trusted-api"
    type: "http"
    url: "https://trusted-domain.com/api"  # HTTPS only
```

## Troubleshooting

### Personality Not Appearing

**Symptom**: Personality doesn't show in dropdown

**Fixes:**
1. Check file extension (`.yaml` or `.yml`)
2. Validate YAML syntax
3. Check console for loading errors
4. Restart the application

### Tool Restriction Not Working

**Symptom**: Denied tool still executes

**Fixes:**
1. Verify tool name spelling (case-sensitive)
2. Check that personality is applied to session
3. Clear session cache and restart

### MCP Server Not Connecting

**Symptom**: MCP tool not available

**Fixes:**
1. Verify command/path is correct
2. Check environment variables are set
3. Test MCP server independently
4. Check MCP server logs

### Hook Not Executing

**Symptom**: Hook script not called

**Fixes:**
1. Verify file path is correct (relative to project root)
2. Check file permissions (must be executable)
3. Validate hook exports (preToolUse/postToolUse functions)
4. Check hook logs for errors

## Next Steps

- **[Examples](/personality-system/examples/medical)** - See more personality examples
- **[Build Variants](/personality-system/advanced/build-variants)** - Create specialty binaries
- **[MCP Servers](/sdk-integration/mcp-servers/overview)** - Learn about MCP integration
- **[Hooks](/sdk-integration/hooks/overview)** - Advanced hook patterns