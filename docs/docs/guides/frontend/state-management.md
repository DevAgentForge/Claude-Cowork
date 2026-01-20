# State Management with Zustand

Learn how to manage application state in Agent Cowork using Zustand.

## Why Zustand?

**Benefits:**
- Minimal boilerplate (no providers, no actions/reducers)
- Fast and scalable
- TypeScript-first design
- DevTools integration
- Simple API

**Comparison to Redux:**
```typescript
// Redux: ~50 lines of boilerplate
// Zustand: ~10 lines

import { create } from 'zustand'

export const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}))
```

## Store Structure

### Main App Store

**Path**: `src/ui/store/useAppStore.ts`

**Full Interface:**
```typescript
interface AppState {
  // Session management
  sessions: Session[]
  activeSessionId: string | null

  // Message management
  messages: Record<string, Message[]>  // sessionId → messages[]

  // UI state
  settingsOpen: boolean
  startSessionModalOpen: boolean

  // Actions - Session
  setSessions: (sessions: Session[]) => void
  addSession: (session: Session) => void
  setActiveSession: (id: string) => void
  deleteSession: (id: string) => void

  // Actions - Messages
  addMessage: (sessionId: string, message: Message) => void
  updateMessage: (sessionId: string, messageId: string, update: Partial<Message>) => void
  deleteMessage: (sessionId: string, messageId: string) => void

  // Actions - UI
  setSettingsOpen: (open: boolean) => void
  setStartSessionModalOpen: (open: boolean) => void
}
```

**Implementation:**
```typescript
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      sessions: [],
      activeSessionId: null,
      messages: {},
      settingsOpen: false,
      startSessionModalOpen: false,

      // Session actions
      setSessions: (sessions) => set({ sessions }),

      addSession: (session) => set((state) => ({
        sessions: [...state.sessions, session],
        activeSessionId: session.id
      })),

      setActiveSession: (id) => set({ activeSessionId: id }),

      deleteSession: (id) => set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
        activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        messages: Object.fromEntries(
          Object.entries(state.messages).filter(([sessionId]) => sessionId !== id)
        )
      })),

      // Message actions
      addMessage: (sessionId, message) => set((state) => ({
        messages: {
          ...state.messages,
          [sessionId]: [...(state.messages[sessionId] || []), message]
        }
      })),

      updateMessage: (sessionId, messageId, update) => set((state) => ({
        messages: {
          ...state.messages,
          [sessionId]: state.messages[sessionId]?.map((msg) =>
            msg.id === messageId ? { ...msg, ...update } : msg
          ) || []
        }
      })),

      deleteMessage: (sessionId, messageId) => set((state) => ({
        messages: {
          ...state.messages,
          [sessionId]: state.messages[sessionId]?.filter((msg) => msg.id !== messageId) || []
        }
      })),

      // UI actions
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setStartSessionModalOpen: (open) => set({ startSessionModalOpen: open })
    }),
    { name: 'AppStore' }
  )
)
```

## Usage Patterns

### 1. Reading State

**Read Multiple Values:**
```typescript
function MyComponent() {
  const { sessions, activeSessionId } = useAppStore()

  return (
    <div>
      <p>Total sessions: {sessions.length}</p>
      <p>Active: {activeSessionId}</p>
    </div>
  )
}
```

**Read Single Value (Optimized):**
```typescript
function MyComponent() {
  // Only re-renders when activeSessionId changes
  const activeSessionId = useAppStore((state) => state.activeSessionId)

  return <div>Active: {activeSessionId}</div>
}
```

**Derived State:**
```typescript
function MyComponent() {
  const activeSession = useAppStore((state) =>
    state.sessions.find((s) => s.id === state.activeSessionId)
  )

  if (!activeSession) return <div>No active session</div>

  return <div>{activeSession.cwd}</div>
}
```

### 2. Updating State

**Call Action:**
```typescript
function NewSessionButton() {
  const setStartSessionModalOpen = useAppStore(
    (state) => state.setStartSessionModalOpen
  )

  return (
    <button onClick={() => setStartSessionModalOpen(true)}>
      New Session
    </button>
  )
}
```

**Call Multiple Actions:**
```typescript
function SessionItem({ session }: { session: Session }) {
  const { setActiveSession, deleteSession } = useAppStore()

  return (
    <div>
      <button onClick={() => setActiveSession(session.id)}>
        Open
      </button>
      <button onClick={() => deleteSession(session.id)}>
        Delete
      </button>
    </div>
  )
}
```

### 3. Outside React Components

**Get State:**
```typescript
// Get current state
const state = useAppStore.getState()
console.log(state.sessions)
```

**Set State:**
```typescript
// Update state from IPC handler
useAppStore.getState().addSession(newSession)
```

**Subscribe to Changes:**
```typescript
// Listen to state changes
const unsubscribe = useAppStore.subscribe((state) => {
  console.log('State changed:', state)
})

// Cleanup
unsubscribe()
```

## Advanced Patterns

### 1. Slices (Organized State)

**Pattern**: Split store into logical sections

```typescript
// src/ui/store/sessionSlice.ts
export interface SessionSlice {
  sessions: Session[]
  activeSessionId: string | null
  setSessions: (sessions: Session[]) => void
  addSession: (session: Session) => void
  setActiveSession: (id: string) => void
}

export const createSessionSlice: StateCreator<AppState, [], [], SessionSlice> = (set) => ({
  sessions: [],
  activeSessionId: null,

  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((state) => ({
    sessions: [...state.sessions, session],
    activeSessionId: session.id
  })),
  setActiveSession: (id) => set({ activeSessionId: id })
})

// src/ui/store/messageSlice.ts
export interface MessageSlice {
  messages: Record<string, Message[]>
  addMessage: (sessionId: string, message: Message) => void
}

export const createMessageSlice: StateCreator<AppState, [], [], MessageSlice> = (set) => ({
  messages: {},

  addMessage: (sessionId, message) => set((state) => ({
    messages: {
      ...state.messages,
      [sessionId]: [...(state.messages[sessionId] || []), message]
    }
  }))
})

// src/ui/store/useAppStore.ts
export const useAppStore = create<AppState>()(
  devtools(
    (...a) => ({
      ...createSessionSlice(...a),
      ...createMessageSlice(...a)
    }),
    { name: 'AppStore' }
  )
)
```

### 2. Computed Values (Selectors)

**Pattern**: Derive state without storing it

```typescript
// src/ui/store/selectors.ts
export const selectActiveSession = (state: AppState) =>
  state.sessions.find((s) => s.id === state.activeSessionId)

export const selectActiveMessages = (state: AppState) =>
  state.activeSessionId ? state.messages[state.activeSessionId] || [] : []

export const selectSessionCount = (state: AppState) =>
  state.sessions.length

// Usage in components
function MyComponent() {
  const activeSession = useAppStore(selectActiveSession)
  const activeMessages = useAppStore(selectActiveMessages)

  return (
    <div>
      <h2>{activeSession?.cwd}</h2>
      <p>{activeMessages.length} messages</p>
    </div>
  )
}
```

### 3. Middleware

**Persist Middleware** (save to localStorage):
```typescript
import { persist } from 'zustand/middleware'

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // ... state
      }),
      {
        name: 'agent-cowork-storage',
        // Only persist certain fields
        partialize: (state) => ({
          settingsOpen: state.settingsOpen
        })
      }
    ),
    { name: 'AppStore' }
  )
)
```

**Immer Middleware** (immutable updates):
```typescript
import { immer } from 'zustand/middleware/immer'

export const useAppStore = create<AppState>()(
  devtools(
    immer((set) => ({
      sessions: [],

      // Mutate state directly (Immer makes it immutable)
      addSession: (session) => set((state) => {
        state.sessions.push(session)
        state.activeSessionId = session.id
      })
    })),
    { name: 'AppStore' }
  )
)
```

### 4. Async Actions

**Pattern**: Handle async operations in actions

```typescript
interface AppState {
  sessions: Session[]
  loading: boolean
  error: string | null

  loadSessions: () => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  sessions: [],
  loading: false,
  error: null,

  loadSessions: async () => {
    set({ loading: true, error: null })

    try {
      const sessions = await window.ipc.invoke('session.list')
      set({ sessions, loading: false })
    } catch (error) {
      set({ error: error.message, loading: false })
    }
  }
}))

// Usage
function SessionList() {
  const { sessions, loading, error, loadSessions } = useAppStore()

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      {sessions.map((session) => (
        <SessionItem key={session.id} session={session} />
      ))}
    </div>
  )
}
```

## Performance Optimization

### 1. Shallow Equality

**Problem**: Re-renders on any state change

```typescript
// Bad: Re-renders when ANY state changes
const { sessions, activeSessionId, messages } = useAppStore()
```

**Solution**: Select only what you need

```typescript
// Good: Only re-renders when sessions change
const sessions = useAppStore((state) => state.sessions)
```

### 2. Equality Function

**Custom equality check:**
```typescript
import { shallow } from 'zustand/shallow'

// Only re-renders when sessions array reference changes
const sessions = useAppStore((state) => state.sessions, shallow)

// Multiple values with shallow equality
const { sessions, activeSessionId } = useAppStore(
  (state) => ({
    sessions: state.sessions,
    activeSessionId: state.activeSessionId
  }),
  shallow
)
```

### 3. Memoized Selectors

**Use useMemo for derived state:**
```typescript
function MessageList() {
  const messages = useAppStore((state) =>
    state.activeSessionId ? state.messages[state.activeSessionId] : []
  )

  const sortedMessages = useMemo(() =>
    [...messages].sort((a, b) => a.createdAt - b.createdAt),
    [messages]
  )

  return (
    <div>
      {sortedMessages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}
    </div>
  )
}
```

## Debugging

### 1. Redux DevTools

**Enable DevTools:**
```typescript
import { devtools } from 'zustand/middleware'

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({ /* ... */ }),
    { name: 'AppStore' }
  )
)
```

**Usage:**
1. Install Redux DevTools extension
2. Open DevTools in Electron
3. Navigate to "Redux" tab
4. See all state changes with time-travel debugging

### 2. Logging Middleware

**Custom logger:**
```typescript
const logger = (config) => (set, get, api) =>
  config(
    (...args) => {
      console.log('  Previous state:', get())
      set(...args)
      console.log('  New state:', get())
    },
    get,
    api
  )

export const useAppStore = create(
  logger((set) => ({
    // ... state
  }))
)
```

### 3. State Inspector

**Log state on demand:**
```typescript
// In browser console
useAppStore.getState()

// Subscribe to changes
useAppStore.subscribe(console.log)
```

## Best Practices

### 1. Action Naming

```typescript
// Good: Verb-based, descriptive
addSession(session)
deleteSession(id)
setActiveSession(id)
updateMessage(sessionId, messageId, update)

// Avoid: Noun-based, vague
session(session)
remove(id)
active(id)
```

### 2. State Shape

```typescript
// Good: Normalized, flat structure
{
  sessions: Session[],
  messages: Record<string, Message[]>,  // sessionId → messages
  activeSessionId: string | null
}

// Avoid: Nested, denormalized
{
  sessions: [
    {
      id: '1',
      messages: [...]  // Nested
    }
  ]
}
```

### 3. Single Responsibility

```typescript
// Good: One action, one purpose
addMessage: (sessionId, message) => set((state) => ({
  messages: {
    ...state.messages,
    [sessionId]: [...(state.messages[sessionId] || []), message]
  }
}))

// Avoid: One action, multiple purposes
addMessage: (sessionId, message) => set((state) => ({
  messages: { /* ... */ },
  unreadCount: state.unreadCount + 1,  // Side effect
  notifications: [...state.notifications, { /* ... */ }]  // Side effect
}))
```

### 4. Avoid Mutations

```typescript
// Good: Immutable updates
addSession: (session) => set((state) => ({
  sessions: [...state.sessions, session]
}))

// Bad: Direct mutation
addSession: (session) => set((state) => {
  state.sessions.push(session)  // Mutation!
  return state
})

// Exception: Use Immer middleware for safe mutations
```

## Common Patterns

### Loading States

```typescript
interface AppState {
  sessions: Session[]
  sessionsLoading: boolean
  sessionsError: string | null

  loadSessions: () => Promise<void>
}

// Component
const { sessions, sessionsLoading, sessionsError } = useAppStore()

if (sessionsLoading) return <Spinner />
if (sessionsError) return <Error message={sessionsError} />
return <SessionList sessions={sessions} />
```

### Optimistic Updates

```typescript
deleteSession: (id) => {
  // Optimistically update UI
  set((state) => ({
    sessions: state.sessions.filter((s) => s.id !== id)
  }))

  // Call API
  window.ipc.send('session.delete', { id })

  // Handle errors (re-add session if delete fails)
  window.ipc.once('session.delete-failed', (failedId) => {
    if (failedId === id) {
      // Revert optimistic update
      set((state) => ({
        sessions: [...state.sessions, deletedSession]
      }))
    }
  })
}
```

## Next Steps

- **[Frontend Overview](/guides/frontend/overview)** - React architecture
- **[Components](/guides/frontend/components)** - Component patterns
- **[Cookbook](/cookbook/state-updates)** - Copy-paste examples
