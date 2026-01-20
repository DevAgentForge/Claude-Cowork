# Quick Start

Get Agent Cowork running on your machine in under 15 minutes.

## Prerequisites

- **Node.js 18+** or **Bun 1.0+**
- **Git**
- **Anthropic API Key** ([get one here](https://console.anthropic.com/))

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/selfsupervised-ai/agent-cowork.git
cd agent-cowork
```

### 2. Install Dependencies

Using Bun (recommended):
```bash
bun install
```

Using npm:
```bash
npm install
```

### 3. Configure Your API Key

Agent Cowork requires an Anthropic API key to communicate with Claude.

**Option 1: Environment Variable**
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

**Option 2: Settings UI**
- Start the app (see step 4)
- Click the Settings icon in the sidebar
- Enter your API key in the "Anthropic API Key" field
- Click Save

The API key is stored locally in your system's config directory:
- macOS: `~/Library/Application Support/AgentCowork/config.json`
- Linux: `~/.config/AgentCowork/config.json`
- Windows: `%APPDATA%\AgentCowork\config.json`

### 4. Start the Development Server

Using Bun:
```bash
bun run dev
```

Using npm:
```bash
npm run dev
```

This will:
1. Start the Vite dev server for the React frontend
2. Build the Electron main process
3. Launch the Electron app with hot reload enabled

The app should open automatically in a new window.

## First Session

### 1. Create a New Session

Click the "New Session" button in the sidebar or use the keyboard shortcut:
- macOS: `Cmd + N`
- Windows/Linux: `Ctrl + N`

### 2. Select a Working Directory

Choose a directory where the AI assistant can read and write files. This is typically your project directory.

**Important**: The assistant will have file system access within this directory.

### 3. Start Chatting

Type a message in the prompt input at the bottom of the screen and press Enter (or `Cmd/Ctrl + Enter`).

**Example prompts:**
- "List all files in this directory"
- "Read the README.md file"
- "Create a new file called example.txt with some sample content"
- "Search for all TODO comments in the codebase"

### 4. Explore the Interface

- **Sidebar**: View all sessions, create new ones, or access settings
- **Message Area**: See the conversation history with the AI
- **Prompt Input**: Type messages and use Markdown formatting
- **Event Cards**: View tool usage, thoughts, and responses

## Development Workflow

### Hot Reload

The development server supports hot reload:
- **Frontend changes**: Instant reload (React components, styles)
- **Backend changes**: Automatic restart (Electron main process)

### Project Structure

```
agent-cowork/
├── src/
│   ├── ui/              # React frontend (Vite + Tailwind)
│   ├── electron/        # Electron main process
│   └── shared/          # Shared types and utilities
├── docs/                # Documentation (this site)
├── package.json
├── vite.config.ts       # Frontend build config
└── electron-builder.json # Packaging config
```

### Key Directories

- `src/ui/`: React components, Zustand store, Tailwind CSS
- `src/electron/`: Electron main process, IPC handlers, SDK integration
- `src/electron/libs/`: Core libraries (runner, session store, config)

## Common Commands

### Development
```bash
bun run dev              # Start development server
```

### Building
```bash
bun run build           # Build production app
bun run build:mac       # Build for macOS
bun run build:win       # Build for Windows
bun run build:linux     # Build for Linux
```

### Testing
```bash
bun test                # Run tests (if configured)
```

### Linting
```bash
bun run lint            # Run ESLint
```

## Troubleshooting

### "API key not found" Error

**Solution**: Make sure you've set the `ANTHROPIC_API_KEY` environment variable or configured it in Settings.

```bash
# Check if the variable is set
echo $ANTHROPIC_API_KEY
```

### App Won't Start

**Solution**: Clear the build cache and reinstall dependencies:

```bash
rm -rf node_modules bun.lock
bun install
bun run dev
```

### "Permission denied" Errors

**Solution**: The app needs read/write access to the working directory. Make sure you've selected a directory you have permissions for.

### Port Already in Use

**Solution**: The dev server uses port 5173 by default. If it's in use, kill the process:

```bash
# macOS/Linux
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

## Next Steps

Now that you have Agent Cowork running:

1. **[Architecture Overview](/introduction/architecture)** - Understand how the system works
2. **[Frontend Guide](/guides/frontend/overview)** - Learn how to modify the UI
3. **[Cookbook](/cookbook/add-ui-component)** - Try copy-paste examples
4. **[Personality System](/personality-system/overview)** - Create domain-specialized variants

## Getting Help

- **Documentation**: Browse the guides and API reference
- **Issues**: [GitHub Issues](https://github.com/selfsupervised-ai/agent-cowork/issues)
- **Discussions**: [GitHub Discussions](https://github.com/selfsupervised-ai/agent-cowork/discussions)
