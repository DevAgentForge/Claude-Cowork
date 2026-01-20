# Component Patterns

Idiomatic React patterns used in Agent Cowork for building UI components.

## Component Structure

### Basic Component Template

```typescript
import { FC } from 'react'

interface MyComponentProps {
  title: string
  onAction: () => void
  optional?: boolean
}

export const MyComponent: FC<MyComponentProps> = ({
  title,
  onAction,
  optional = false
}) => {
  return (
    <div className="p-4 bg-cream-100 rounded-md">
      <h2 className="text-xl font-semibold text-sage-900">{title}</h2>
      {optional && <p className="text-sage-600 mt-2">Optional content</p>}
      <button
        onClick={onAction}
        className="mt-4 px-4 py-2 bg-sage-500 text-white rounded-md hover:bg-sage-600"
      >
        Action
      </button>
    </div>
  )
}
```

## Core Components

### 1. Sidebar Component

**Path**: `src/ui/components/Sidebar.tsx`

**Purpose**: Session list and navigation

**Key Features:**
- Session list with active state
- New session button
- Settings access
- Keyboard shortcuts

**Example Usage:**
```typescript
import { Sidebar } from './components/Sidebar'

function App() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1">{/* Main content */}</main>
    </div>
  )
}
```

**Internal Structure:**
```typescript
export const Sidebar: FC = () => {
  const { sessions, activeSessionId, setActiveSession } = useAppStore()

  return (
    <div className="w-64 bg-cream-100 border-r border-sage-200 flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-sage-200">
        <h1 className="text-lg font-semibold">Sessions</h1>
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
      <footer className="p-4 border-t border-sage-200">
        <NewSessionButton />
        <SettingsButton />
      </footer>
    </div>
  )
}
```

### 2. EventCard Component

**Path**: `src/ui/components/EventCard.tsx`

**Purpose**: Display messages and events from SDK

**Event Types:**
- `text`: Assistant text response
- `tool_use`: Tool execution
- `thinking`: Internal reasoning
- `user`: User message

**Example:**
```typescript
interface EventCardProps {
  event: Event
  sessionId: string
}

export const EventCard: FC<EventCardProps> = ({ event, sessionId }) => {
  if (event.type === 'text') {
    return <TextEvent content={event.content} />
  }

  if (event.type === 'tool_use') {
    return <ToolUseEvent tool={event.tool} input={event.input} output={event.output} />
  }

  if (event.type === 'thinking') {
    return <ThinkingEvent content={event.content} />
  }

  if (event.type === 'user') {
    return <UserMessage content={event.content} />
  }

  return null
}
```

**Styling Pattern:**
```typescript
// Text event styling
<div className="p-4 bg-white rounded-lg shadow-sm">
  <div className="prose prose-sm max-w-none">
    <ReactMarkdown>{content}</ReactMarkdown>
  </div>
</div>

// Tool use event styling
<div className="p-4 bg-sage-50 border border-sage-200 rounded-lg">
  <div className="flex items-center gap-2 mb-2">
    <ToolIcon className="w-4 h-4 text-sage-600" />
    <span className="font-mono text-sm text-sage-700">{tool.name}</span>
  </div>
  <pre className="text-xs text-sage-600 overflow-x-auto">
    {JSON.stringify(tool.input, null, 2)}
  </pre>
</div>
```

### 3. PromptInput Component

**Path**: `src/ui/components/PromptInput.tsx`

**Purpose**: User message input with keyboard shortcuts

**Features:**
- Auto-resize textarea
- Keyboard shortcuts (Enter to send, Shift+Enter for newline)
- Submit button
- Disabled state during streaming

**Example:**
```typescript
export const PromptInput: FC = () => {
  const [input, setInput] = useState('')
  const { activeSessionId } = useAppStore()
  const [isStreaming, setIsStreaming] = useState(false)

  const handleSubmit = () => {
    if (!input.trim() || !activeSessionId || isStreaming) return

    window.ipc.send('message.send', {
      sessionId: activeSessionId,
      content: input.trim()
    })

    setInput('')
    setIsStreaming(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-sage-200 p-4 bg-cream-50">
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isStreaming}
          className="flex-1 resize-none border border-sage-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage-500"
          rows={3}
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isStreaming}
          className="px-4 py-2 bg-sage-500 text-white rounded-md hover:bg-sage-600 disabled:bg-sage-300 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  )
}
```

### 4. Modal Components

**Base Modal Pattern:**
```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export const Modal: FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative z-10 bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-sage-200">
          <h2 className="text-lg font-semibold text-sage-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-sage-600 hover:text-sage-900"
          >
            ×
          </button>
        </header>

        {/* Body */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}
```

**StartSessionModal Example:**
```typescript
// src/ui/components/StartSessionModal.tsx
export const StartSessionModal: FC = () => {
  const { startSessionModalOpen, setStartSessionModalOpen } = useAppStore()
  const [cwd, setCwd] = useState('')

  const handleSubmit = () => {
    if (!cwd) return

    window.ipc.send('session.start', { cwd })
    setStartSessionModalOpen(false)
    setCwd('')
  }

  return (
    <Modal
      isOpen={startSessionModalOpen}
      onClose={() => setStartSessionModalOpen(false)}
      title="New Session"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-sage-700 mb-1">
            Working Directory
          </label>
          <input
            type="text"
            value={cwd}
            onChange={(e) => setCwd(e.target.value)}
            placeholder="/path/to/project"
            className="w-full border border-sage-200 rounded-md px-3 py-2"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!cwd}
          className="w-full px-4 py-2 bg-sage-500 text-white rounded-md hover:bg-sage-600 disabled:bg-sage-300"
        >
          Start Session
        </button>
      </div>
    </Modal>
  )
}
```

## Advanced Patterns

### 1. Compound Components

**Pattern**: Components that work together

```typescript
// Message component with subcomponents
export const Message = ({ children }: { children: React.ReactNode }) => {
  return <div className="p-4 bg-white rounded-lg">{children}</div>
}

Message.Header = ({ author, timestamp }: { author: string; timestamp: Date }) => {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="font-semibold text-sage-900">{author}</span>
      <span className="text-xs text-sage-500">
        {timestamp.toLocaleTimeString()}
      </span>
    </div>
  )
}

Message.Body = ({ content }: { content: string }) => {
  return <div className="prose prose-sm">{content}</div>
}

// Usage
<Message>
  <Message.Header author="Assistant" timestamp={new Date()} />
  <Message.Body content="Hello!" />
</Message>
```

### 2. Render Props

**Pattern**: Flexible component API

```typescript
interface ListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  emptyMessage?: string
}

export function List<T>({ items, renderItem, emptyMessage = 'No items' }: ListProps<T>) {
  if (items.length === 0) {
    return <div className="text-sage-500 text-center py-8">{emptyMessage}</div>
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => renderItem(item, index))}
    </div>
  )
}

// Usage
<List
  items={sessions}
  renderItem={(session) => (
    <SessionItem key={session.id} session={session} />
  )}
  emptyMessage="No sessions yet"
/>
```

### 3. Custom Hooks

**Pattern**: Reusable logic

```typescript
// useIpcEvent hook
export function useIpcEvent<T>(
  channel: string,
  handler: (data: T) => void
) {
  useEffect(() => {
    window.ipc.on(channel, handler)
    return () => window.ipc.off(channel, handler)
  }, [channel, handler])
}

// Usage
useIpcEvent('session.created', (session: Session) => {
  console.log('New session:', session)
  useAppStore.getState().addSession(session)
})
```

```typescript
// useAutoResize hook for textarea
export function useAutoResize(ref: React.RefObject<HTMLTextAreaElement>) {
  useEffect(() => {
    const textarea = ref.current
    if (!textarea) return

    const resize = () => {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }

    textarea.addEventListener('input', resize)
    resize()

    return () => textarea.removeEventListener('input', resize)
  }, [ref])
}

// Usage
const textareaRef = useRef<HTMLTextAreaElement>(null)
useAutoResize(textareaRef)

return <textarea ref={textareaRef} />
```

## Best Practices

### 1. Props Interface Naming

```typescript
// Good: ComponentNameProps
interface SidebarProps {
  collapsed?: boolean
}

// Avoid: Props, SidebarPropsType
interface Props {
  collapsed?: boolean
}
```

### 2. Default Props

```typescript
// Good: Destructure with defaults
export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children
}) => {
  // ...
}

// Avoid: Component.defaultProps (deprecated in React 19)
Button.defaultProps = {
  variant: 'primary',
  size: 'md'
}
```

### 3. Event Handlers

```typescript
// Good: handle* for internal, on* for props
interface ButtonProps {
  onClick: () => void  // Prop
}

const Button: FC<ButtonProps> = ({ onClick }) => {
  const handleClick = () => {  // Internal handler
    console.log('Button clicked')
    onClick()
  }

  return <button onClick={handleClick}>Click</button>
}
```

### 4. Conditional Rendering

```typescript
// Good: Explicit conditions
{isLoading && <Spinner />}
{error && <ErrorMessage error={error} />}
{!isLoading && !error && <Content />}

// Avoid: Ternary chains
{isLoading ? <Spinner /> : error ? <ErrorMessage /> : <Content />}
```

### 5. Component Files

```typescript
// Good: One component per file, named export
// src/ui/components/Sidebar.tsx
export const Sidebar: FC = () => { /* ... */ }

// Avoid: Multiple components in one file, default export
// src/ui/components/index.tsx
export default function Sidebar() { /* ... */ }
export function SidebarItem() { /* ... */ }
```

## Testing Components

### Unit Testing with Vitest

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders with label', () => {
    render(<Button onClick={() => {}}>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)

    fireEvent.click(screen.getByText('Click me'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button onClick={() => {}} disabled>Click me</Button>)
    expect(screen.getByText('Click me')).toBeDisabled()
  })
})
```

## Next Steps

- **[State Management](/guides/frontend/state-management)** - Learn Zustand patterns
- **[Styling Guide](/guides/frontend/styling)** - Tailwind CSS customization
- **[IPC Communication](/guides/frontend/ipc)** - Frontend ↔ Backend integration
- **[Cookbook](/cookbook/add-ui-component)** - Copy-paste examples
