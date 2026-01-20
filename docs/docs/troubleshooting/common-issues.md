# Common Issues

Solutions to frequently encountered problems in Agent Cowork.

## Installation & Setup

### "API key not found" Error

**Symptom**: Error message when starting a session

**Cause**: Anthropic API key not configured

**Solutions:**

1. **Set environment variable:**
   ```bash
   export ANTHROPIC_API_KEY="your-api-key-here"
   bun run dev
   ```

2. **Configure in Settings UI:**
   - Open Agent Cowork
   - Click Settings icon
   - Enter API key
   - Click Save

3. **Verify the key is set:**
   ```bash
   echo $ANTHROPIC_API_KEY
   ```

**Permanent fix** (macOS/Linux):
```bash
# Add to ~/.bashrc or ~/.zshrc
echo 'export ANTHROPIC_API_KEY="your-api-key"' >> ~/.zshrc
source ~/.zshrc
```

---

### App Won't Start

**Symptom**: Electron window doesn't open or crashes immediately

**Cause**: Build cache corruption or dependency issues

**Solutions:**

1. **Clear build cache:**
   ```bash
   rm -rf node_modules bun.lock dist
   bun install
   bun run dev
   ```

2. **Check Node.js version:**
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

3. **Rebuild Electron:**
   ```bash
   bun run electron-rebuild
   ```

4. **Check console for errors:**
   - Open DevTools: `Cmd/Ctrl + Shift + I`
   - Check Console tab for error messages

---

### Port Already in Use

**Symptom**: "Port 5173 is already in use"

**Cause**: Another process is using the dev server port

**Solutions:**

**macOS/Linux:**
```bash
# Find process using port 5173
lsof -ti:5173

# Kill the process
lsof -ti:5173 | xargs kill -9
```

**Windows:**
```bash
# Find process
netstat -ano | findstr :5173

# Kill by PID
taskkill /PID <PID> /F
```

**Or change the port:**
```bash
# Edit vite.config.ts
server: {
  port: 5174  // Use different port
}
```

---

## Session Management

### Sessions Not Persisting

**Symptom**: Sessions disappear after restarting the app

**Cause**: Database file not being written or corrupted

**Solutions:**

1. **Check database location:**
   ```bash
   # macOS
   ls -la ~/Library/Application\ Support/AgentCowork/

   # Linux
   ls -la ~/.config/AgentCowork/

   # Should see: sessions.db
   ```

2. **Verify database permissions:**
   ```bash
   chmod 644 ~/Library/Application\ Support/AgentCowork/sessions.db
   ```

3. **Test database directly:**
   ```bash
   sqlite3 ~/Library/Application\ Support/AgentCowork/sessions.db "SELECT * FROM sessions;"
   ```

4. **Reset database (WARNING: Deletes all sessions):**
   ```bash
   rm ~/Library/Application\ Support/AgentCowork/sessions.db
   ```

---

### "Permission denied" Errors

**Symptom**: Cannot read/write files in working directory

**Cause**: Insufficient file system permissions

**Solutions:**

1. **Check directory permissions:**
   ```bash
   ls -la /path/to/working/directory
   ```

2. **Grant permissions:**
   ```bash
   chmod u+rw /path/to/working/directory
   ```

3. **Try a different directory:**
   - Use a directory you own (e.g., `~/Projects`)
   - Avoid system directories (`/usr`, `/etc`)

4. **macOS: Grant Full Disk Access:**
   - System Preferences → Security & Privacy
   - Privacy → Full Disk Access
   - Add Agent Cowork

---

## UI Issues

### UI Not Updating

**Symptom**: Changes not reflected in the UI

**Cause**: Stale state or React re-render issue

**Solutions:**

1. **Force reload:**
   - `Cmd/Ctrl + R` (soft reload)
   - `Cmd/Ctrl + Shift + R` (hard reload)

2. **Clear Zustand state:**
   ```typescript
   // In browser console (DevTools)
   useAppStore.setState({ sessions: [] })
   ```

3. **Check for React errors:**
   - Open DevTools
   - Look for red error messages

---

### Styles Not Applying

**Symptom**: Components look unstyled

**Cause**: Tailwind CSS not loaded or build issue

**Solutions:**

1. **Verify Tailwind CSS is installed:**
   ```bash
   bun list | grep tailwindcss
   ```

2. **Check index.css imports:**
   ```css
   /* src/ui/index.css should have: */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

3. **Rebuild:**
   ```bash
   bun run build
   bun run dev
   ```

4. **Check DevTools Console:**
   - Look for CSS loading errors

---

## SDK & API Issues

### "Rate limit exceeded" Error

**Symptom**: API calls failing with rate limit error

**Cause**: Too many API requests in short time

**Solutions:**

1. **Wait a few minutes:**
   - Anthropic API has rate limits
   - Wait 1-2 minutes before retrying

2. **Check API usage:**
   - Visit [Anthropic Console](https://console.anthropic.com/)
   - Review usage and limits

3. **Upgrade API tier:**
   - Free tier: 50 requests/minute
   - Paid tiers: Higher limits

---

### Streaming Responses Slow

**Symptom**: Responses take a long time to appear

**Cause**: Network latency or large prompts

**Solutions:**

1. **Check network:**
   ```bash
   ping api.anthropic.com
   ```

2. **Reduce prompt size:**
   - Avoid sending large files in context
   - Use Read tool instead of pasting content

3. **Check API status:**
   - Visit [Anthropic Status](https://status.anthropic.com/)

---

### Tool Execution Failing

**Symptom**: Tools not executing or returning errors

**Cause**: Various tool-specific issues

**Solutions:**

**Read/Edit/Write:**
- Verify file paths are absolute
- Check file permissions
- Ensure file exists

**Bash:**
- Check command syntax
- Verify command is available: `which command-name`
- Check $PATH environment variable

**Grep:**
- Verify regex pattern syntax
- Check file glob patterns
- Ensure files exist in path

---

## Personality System

### Personality Not Loading

**Symptom**: Personality doesn't appear in dropdown

**Cause**: Invalid YAML syntax or validation error

**Solutions:**

1. **Validate YAML:**
   ```bash
   npm install -g yaml-lint
   yaml-lint personalities/my-personality.yaml
   ```

2. **Check console logs:**
   ```bash
   DEBUG=personality:* bun run dev
   ```

3. **Common YAML mistakes:**
   ```yaml
   # Bad: Tabs instead of spaces
   tools:
       allowed: ["Read"]

   # Good: 2 spaces for indentation
   tools:
     allowed: ["Read"]
   ```

4. **Verify required fields:**
   ```yaml
   # Required:
   name: "My Personality"
   description: "Description"
   version: "1.0.0"
   ```

---

### Tool Restrictions Not Working

**Symptom**: Denied tools still execute

**Cause**: Personality not applied to session

**Solutions:**

1. **Verify personality is selected:**
   - Check session creation modal
   - Ensure personality dropdown shows selection

2. **Check runner integration:**
   ```typescript
   // src/electron/libs/runner.ts
   // Verify tool filtering logic exists
   ```

3. **Test manually:**
   ```typescript
   // In session, try a denied tool
   // Should get error: "Tool X is not available"
   ```

---

### MCP Server Not Connecting

**Symptom**: MCP tools not available

**Cause**: Server startup failure or connection issue

**Solutions:**

1. **Test server independently:**
   ```bash
   node ./mcp-servers/my-server/index.js
   ```

2. **Check server logs:**
   ```bash
   # Add logging to MCP server
   console.log('[MCP Server] Starting...')
   ```

3. **Verify command path:**
   ```yaml
   mcpServers:
     - name: "my-server"
       command: "node"  # Verify node is in PATH
       args: ["./mcp-servers/my-server/index.js"]
   ```

4. **Check environment variables:**
   ```bash
   echo $MY_API_KEY  # Should be set if used in MCP config
   ```

---

## Development Issues

### Hot Reload Not Working

**Symptom**: Changes require manual restart

**Cause**: Vite HMR not triggering

**Solutions:**

1. **Check file watcher limits (Linux):**
   ```bash
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

2. **Restart dev server:**
   ```bash
   # Kill current process
   # Restart with:
   bun run dev
   ```

3. **Check vite.config.ts:**
   ```typescript
   export default defineConfig({
     server: {
       watch: {
         usePolling: true  // If file watching doesn't work
       }
     }
   })
   ```

---

### TypeScript Errors

**Symptom**: Type errors in development

**Cause**: Missing types or version mismatch

**Solutions:**

1. **Install missing types:**
   ```bash
   bun add -D @types/node @types/react
   ```

2. **Restart TypeScript server:**
   - VS Code: `Cmd/Ctrl + Shift + P` → "Restart TS Server"

3. **Check tsconfig.json:**
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "esModuleInterop": true
     }
   }
   ```

---

## Getting Help

If none of these solutions work:

1. **Check GitHub Issues:**
   - [GitHub Issues](https://github.com/selfsupervised-ai/agent-cowork/issues)
   - Search for similar problems

2. **Enable Debug Mode:**
   ```bash
   DEBUG=* bun run dev  # Full debug output
   ```

3. **Collect Logs:**
   - Electron main process logs
   - Renderer process console (DevTools)
   - Terminal output

4. **Create Issue:**
   - Include error messages
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)

## Related Docs

- **[Quick Start](/introduction/quick-start)** - Installation guide
- **[Architecture](/introduction/architecture)** - System design
- **[Frontend Guide](/guides/frontend/overview)** - UI development
- **[Personality System](/personality-system/creating-personalities)** - Configuration guide
