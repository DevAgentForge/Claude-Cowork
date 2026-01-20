# Frontend Development Overview

Learn how to modify Agent Cowork's UI and add new features to the React frontend.

## Goal

By the end of this guide, you'll be able to:
- Understand the React component hierarchy
- Add new UI components
- Modify styles with Tailwind CSS
- Manage state with Zustand
- Communicate with the backend via IPC

**Time**: ~2 hours to make your first UI change

## Tech Stack

- **React 19**: Latest React with concurrent features
- **TypeScript**: Full type safety
- **Zustand**: Minimal, fast state management
- **Tailwind CSS 4**: Utility-first styling with custom theme
- **Vite**: Fast development and build
- **Electron IPC**: Renderer ↔ Main process communication

## Component Architecture

```
App (src/ui/App.tsx)
├── Sidebar (src/ui/components/Sidebar.tsx)
│   ├── SessionList
│   ├── NewSessionButton
│   └── SettingsButton
├── MainContent
│   ├── MessageList
│   │   └── EventCard (for each message/event)
│   └── PromptInput (src/ui/components/PromptInput.tsx)
└── Modals
    ├── StartSessionModal (src/ui/components/StartSessionModal.tsx)
    └── Settings (src/ui/components/Settings.tsx)
```

## File Structure

```
src/ui/
├── App.tsx                   # Root component, IPC setup
├── main.tsx                  # Entry point
├── index.css                 # Tailwind configuration
├── components/
│   ├── Sidebar.tsx          # Session list, navigation
│   ├── EventCard.tsx        # Message/event display
│   ├── PromptInput.tsx      # User input
│   ├── StartSessionModal.tsx # Session creation dialog
│   └── Settings.tsx         # Settings panel
├── store/
│   └── useAppStore.ts       # Zustand store
└── hooks/
    └── useIpc.ts            # IPC communication hook
```

## Key Files

### 1. App.tsx (Root Component)

**Path**: `src/ui/App.tsx`

**Responsibilities:**
- IPC event listeners setup
- Layout structure
- Modal rendering
- Routing between sessions

**Key Sections:**
```typescript
// IPC event listeners (line ~30)
useEffect(() => {
  window.ipc.on('session.created', handleSessionCreated)
  window.ipc.on('message.stream', handleMessageStream)
  // ...
}, [])

// Main layout
return (
  <div className="flex h-screen">
    <Sidebar />
    <main className="flex-1">
      <MessageList />
      <PromptInput />
    </main>
  </div>
)
```

### 2. useAppStore.ts (State Management)

**Path**: `src/ui/store/useAppStore.ts`

**Purpose**: Centralized state for the entire application

**Key State:**
```typescript
interface AppState {
  // Session management
  sessions: Session[]
  activeSessionId: string | null

  // UI state
  settingsOpen: boolean
  startSessionModalOpen: boolean

  // Message state
  messages: Record<string, Message[]>  // sessionId → messages

  // Actions
  setActiveSession: (id: string) => void
  addMessage: (sessionId: string, message: Message) => void
  updateMessage: (sessionId: string, messageId: string, update: Partial<Message>) => void
  deleteSession: (id: string) => void
  // ...
}
```

### 3. index.css (Tailwind Theme)

**Path**: `src/ui/index.css`

**Custom Theme:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --cream-50: #fefdfb;
    --cream-100: #fef9f5;
    --cream-200: #fef3e2;
    /* ... */
    --sage-500: #8a9a8f;
    --sage-600: #6b7c70;
    /* ... */
  }

  body {
    @apply bg-cream-50 text-sage-900;
  }
}
```

**Design System:**
- **Warm cream palette**: Primary background colors
- **Sage accents**: Secondary colors for UI elements
- **Typography**: System fonts with careful hierarchy
- **Spacing**: 4px base unit (Tailwind default)

### 4. EventCard.tsx (Message Display)

**Path**: `src/ui/components/EventCard.tsx:22-26`

**Purpose**: Render different event types (text, tool use, thinking)

**Event Types:**
- `text`: Assistant's text response
- `tool_use`: Tool execution (Read, Edit, Bash, etc.)
- `thinking`: Internal reasoning
- `user`: User messages

## Development Patterns

### Pattern 1: Adding a New Component

**Steps:**
1. Create component file in `src/ui/components/`
2. Import and use in parent component
3. Add types to `src/electron/types.ts` if needed
4. Style with Tailwind classes

**Example:**
```typescript
// src/ui/components/ToolbarButton.tsx
import { FC } from 'react'

interface ToolbarButtonProps {
  label: string
  onClick: () => void
  icon?: React.ReactNode
}

export const ToolbarButton: FC<ToolbarButtonProps> = ({ label, onClick, icon }) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 bg-sage-100 hover:bg-sage-200 rounded-md transition-colors"
    >
      {icon}
      <span className="text-sage-800">{label}</span>
    </button>
  )
}
```

### Pattern 2: Using Zustand State

**Read State:**
```typescript
import { useAppStore } from '../store/useAppStore'

function MyComponent() {
  const { sessions, activeSessionId } = useAppStore()

  return <div>{sessions.length} sessions</div>
}
```

**Update State:**
```typescript
import { useAppStore } from '../store/useAppStore'

function MyComponent() {
  const setActiveSession = useAppStore((state) => state.setActiveSession)

  const handleClick = () => {
    setActiveSession('session-123')
  }

  return <button onClick={handleClick}>Switch Session</button>
}
```

### Pattern 3: IPC Communication

**Send Event to Backend:**
```typescript
// Send session.start event
window.ipc.send('session.start', { cwd: '/path/to/project' })
```

**Listen for Events from Backend:**
```typescript
useEffect(() => {
  const handleSessionCreated = (session: Session) => {
    useAppStore.getState().addSession(session)
  }

  window.ipc.on('session.created', handleSessionCreated)

  return () => {
    window.ipc.off('session.created', handleSessionCreated)
  }
}, [])
```

### Pattern 4: Tailwind Styling

**Component Composition:**
```typescript
<div className="flex flex-col h-screen bg-cream-50">
  <header className="border-b border-sage-200 px-4 py-3">
    <h1 className="text-2xl font-semibold text-sage-900">Agent Cowork</h1>
  </header>

  <main className="flex-1 overflow-y-auto p-4">
    {/* Content */}
  </main>

  <footer className="border-t border-sage-200 p-4">
    {/* Footer */}
  </footer>
</div>
```

**Custom Theme Colors:**
```typescript
// Use custom colors from index.css
<div className="bg-cream-100 text-sage-700">
  <button className="bg-sage-500 hover:bg-sage-600 text-white">
    Click me
  </button>
</div>
```

## Common Tasks

### Task 1: Add a Toolbar Button

**Goal**: Add a "Clear All Sessions" button to the sidebar

**Files to Modify:**
- `src/ui/components/Sidebar.tsx`
- `src/ui/store/useAppStore.ts`

**Steps:**
1. Add state action to Zustand store
2. Create button component in Sidebar
3. Wire up click handler

See [Cookbook: Add UI Component](/cookbook/add-ui-component) for complete code.

### Task 2: Add a New Modal

**Goal**: Create a custom modal dialog

**Files to Modify:**
- `src/ui/components/MyModal.tsx` (new file)
- `src/ui/App.tsx`
- `src/ui/store/useAppStore.ts`

**Steps:**
1. Create modal component
2. Add modal state to Zustand
3. Render conditionally in App.tsx

See [Cookbook: Add Modal](/cookbook/add-modal) for complete code.

### Task 3: Customize Theme Colors

**Goal**: Change the color palette

**Files to Modify:**
- `src/ui/index.css`

**Steps:**
1. Define new CSS variables in `:root`
2. Update Tailwind classes throughout components

See [Frontend Guide: Styling](/guides/frontend/styling) for details.

## Best Practices

### 1. Type Safety

Always use TypeScript types for props and state:

```typescript
interface MyComponentProps {
  title: string
  onSave: (data: FormData) => void
  optional?: boolean
}

export const MyComponent: FC<MyComponentProps> = ({ title, onSave, optional = false }) => {
  // ...
}
```

### 2. State Management

**Use Zustand for:**
- Global state (sessions, messages, UI state)
- Cross-component communication

**Use Local State for:**
- Form inputs
- UI-only state (hover, focus)
- Component-specific state

```typescript
// Global state
const sessions = useAppStore((state) => state.sessions)

// Local state
const [inputValue, setInputValue] = useState('')
```

### 3. IPC Event Naming

Follow the pattern: `<domain>.<action>`

```typescript
// Good
window.ipc.send('session.start', data)
window.ipc.send('message.send', data)
window.ipc.send('settings.update', data)

// Avoid
window.ipc.send('startSession', data)
window.ipc.send('sendMessage', data)
```

### 4. Component Organization

**Small, focused components:**
```typescript
// Good
<MessageList>
  <EventCard event={event1} />
  <EventCard event={event2} />
</MessageList>

// Avoid
<GiantComponentThatDoesEverything />
```

### 5. Styling Conventions

**Use Tailwind utilities, avoid inline styles:**
```typescript
// Good
<div className="flex items-center gap-4 p-4 bg-cream-100">

// Avoid
<div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#fef9f5' }}>
```

## Debugging Tips

### React DevTools

Install React DevTools extension:
- [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

**Usage:**
1. Open DevTools in Electron app (Cmd/Ctrl + Shift + I)
2. Navigate to "Components" tab
3. Inspect component props and state

### Zustand DevTools

View state changes in Redux DevTools:

```typescript
import { devtools } from 'zustand/middleware'

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      // ... state
    }),
    { name: 'AppStore' }
  )
)
```

### IPC Event Logging

Add logging to see all IPC events:

```typescript
// src/ui/App.tsx
useEffect(() => {
  const originalSend = window.ipc.send
  window.ipc.send = (channel, data) => {
    console.log('[IPC Send]', channel, data)
    originalSend(channel, data)
  }
}, [])
```

## Next Steps

- **[Component Patterns](/guides/frontend/components)** - Learn idiomatic React patterns
- **[State Management](/guides/frontend/state-management)** - Deep dive into Zustand
- **[Styling Guide](/guides/frontend/styling)** - Master Tailwind CSS customization
- **[IPC Communication](/guides/frontend/ipc)** - Frontend ↔ Backend integration
- **[Cookbook](/cookbook/add-ui-component)** - Try copy-paste examples
