# Add UI Component

Complete guide to adding a "Clear All Sessions" button to the sidebar.

## Goal

Add a button that allows users to delete all sessions at once.

**Time**: ~30 minutes

## Complete Implementation

### Step 1: Add State Action

**File**: `src/ui/store/useAppStore.ts`

**Add this method:**
```typescript
clearAllSessions: () => set((state) => {
  // Send IPC event to delete all sessions
  state.sessions.forEach((session) => {
    window.ipc.send('session.delete', { id: session.id })
  })

  return {
    sessions: [],
    activeSessionId: null,
    messages: {}
  }
}),
```

**Full context** (add after other actions):
```typescript
export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // ... existing state

      deleteSession: (id) => set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
        activeSessionId: state.activeSessionId === id ? null : state.activeSessionId
      })),

      // NEW: Clear all sessions
      clearAllSessions: () => set((state) => {
        state.sessions.forEach((session) => {
          window.ipc.send('session.delete', { id: session.id })
        })

        return {
          sessions: [],
          activeSessionId: null,
          messages: {}
        }
      }),

      // ... other actions
    }),
    { name: 'AppStore' }
  )
)
```

### Step 2: Create Button Component

**File**: `src/ui/components/ClearAllButton.tsx` (NEW FILE)

```typescript
import { FC, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

export const ClearAllButton: FC = () => {
  const { sessions, clearAllSessions } = useAppStore()
  const [showConfirm, setShowConfirm] = useState(false)

  const handleClear = () => {
    clearAllSessions()
    setShowConfirm(false)
  }

  if (sessions.length === 0) {
    return null // Don't show button if no sessions
  }

  return (
    <div>
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full px-3 py-2 text-sm text-sage-600 hover:text-sage-900 hover:bg-sage-100 rounded-md transition-colors flex items-center gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Clear All Sessions
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowConfirm(false)}
          />

          {/* Modal */}
          <div className="relative z-10 bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-sage-900 mb-2">
              Clear All Sessions?
            </h3>
            <p className="text-sm text-sage-600 mb-4">
              This will delete all {sessions.length} session(s) and their message history.
              This action cannot be undone.
            </p>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm text-sage-600 hover:bg-sage-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-md"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

### Step 3: Add to Sidebar

**File**: `src/ui/components/Sidebar.tsx`

**Import the component:**
```typescript
import { ClearAllButton } from './ClearAllButton'
```

**Add to footer section:**
```typescript
export const Sidebar: FC = () => {
  const { sessions, activeSessionId, setActiveSession } = useAppStore()

  return (
    <div className="w-64 bg-cream-100 border-r border-sage-200 flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-sage-200">
        <h1 className="text-lg font-semibold text-sage-900">Sessions</h1>
      </header>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            active={session.id === activeSessionId}
            onClick={() => setActiveSession(session.id)}
          />
        ))}
      </div>

      {/* Footer Actions */}
      <footer className="p-4 border-t border-sage-200 space-y-2">
        <NewSessionButton />
        <ClearAllButton /> {/* NEW */}
        <SettingsButton />
      </footer>
    </div>
  )
}
```

### Step 4: Update IPC Handler (Backend)

**File**: `src/electron/ipc-handlers.ts`

**Ensure delete handler exists:**
```typescript
ipcMain.on('session.delete', async (event, payload) => {
  const { id } = payload

  try {
    // Delete from database
    sessionStore.deleteSession(id)

    // Notify renderer
    event.sender.send('session.deleted', { id })

    console.log(`[IPC] Session deleted: ${id}`)
  } catch (error) {
    console.error(`[IPC] Failed to delete session ${id}:`, error)
    event.sender.send('session.delete-failed', { id, error: error.message })
  }
})
```

## Testing

### Manual Testing

1. **Start the app:**
   ```bash
   bun run dev
   ```

2. **Create multiple sessions:**
   - Create 3-4 test sessions

3. **Test the button:**
   - Click "Clear All Sessions"
   - Verify confirmation modal appears
   - Click "Cancel" → modal closes, sessions remain
   - Click "Clear All Sessions" again
   - Click "Clear All" → all sessions deleted

4. **Verify persistence:**
   - Restart the app
   - Sessions should still be cleared (not restored from database)

### Edge Cases

Test these scenarios:

- [ ] No sessions: Button should not appear
- [ ] One session: Button appears, deletes single session
- [ ] Many sessions: Deletes all correctly
- [ ] Click outside modal: Modal closes without deleting
- [ ] Active session deleted: No session remains active

## Variations

### Variation 1: Archive Instead of Delete

```typescript
// src/ui/store/useAppStore.ts
archiveAllSessions: () => set((state) => {
  state.sessions.forEach((session) => {
    window.ipc.send('session.archive', { id: session.id })
  })

  return { sessions: [], activeSessionId: null }
}),
```

### Variation 2: Add Keyboard Shortcut

```typescript
// src/ui/App.tsx
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Cmd+Shift+Delete or Ctrl+Shift+Delete
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Backspace') {
      const { clearAllSessions } = useAppStore.getState()
      clearAllSessions()
    }
  }

  window.addEventListener('keydown', handleKeyPress)
  return () => window.removeEventListener('keydown', handleKeyPress)
}, [])
```

### Variation 3: Export Before Clear

```typescript
export const ClearAllButton: FC = () => {
  const { sessions, clearAllSessions } = useAppStore()

  const handleExportAndClear = async () => {
    // Export sessions to JSON
    const data = JSON.stringify(sessions, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `sessions-backup-${Date.now()}.json`
    a.click()

    URL.revokeObjectURL(url)

    // Then clear
    clearAllSessions()
  }

  return (
    <button onClick={handleExportAndClear}>
      Export & Clear All
    </button>
  )
}
```

## Common Issues

### Issue: Button Doesn't Appear

**Cause**: Sessions array is empty or component not imported

**Fix:**
1. Check that sessions exist: `console.log(useAppStore.getState().sessions)`
2. Verify import in Sidebar.tsx
3. Check conditional rendering logic

### Issue: Confirmation Modal Styling Broken

**Cause**: Tailwind classes not applied

**Fix:**
1. Verify Tailwind CSS is installed
2. Check `src/ui/index.css` has `@tailwind` directives
3. Restart dev server

### Issue: Sessions Not Actually Deleted

**Cause**: IPC handler not called or database delete failed

**Fix:**
1. Check console for IPC errors
2. Verify `session.delete` handler exists
3. Test database connection: `sessionStore.listSessions()`

## Next Steps

- **[Add Modal](/cookbook/add-modal)** - Create custom modal dialogs
- **[State Updates](/cookbook/state-updates)** - Advanced state management patterns
- **[IPC Events](/cookbook/ipc-events)** - Frontend ↔ Backend communication
