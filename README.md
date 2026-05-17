# @neboai/app-sdk

SDK for building [Nebo](https://neboloop.com) apps. Mirrors native browser APIs (`fetch`, `WebSocket`, `localStorage`) while adding agent invocation, LLM completions, and real-time state management.

## Install

```bash
pnpm add @neboai/app-sdk
```

Or use the global build via CDN:

```html
<script src="https://unpkg.com/@neboai/app-sdk/dist/nebo.global.js"></script>
```

## Quick Start

```typescript
import { nebo } from '@neboai/app-sdk';

// Fetch from your sidecar (relative) or external APIs (absolute, CORS-free)
const data = await nebo.fetch('/deals').then(r => r.json());
const weather = await nebo.fetch('https://api.weather.gov/points/40,-74').then(r => r.json());

// Persistent key-value storage
await nebo.storage.setItem('lastSync', Date.now());
const val = await nebo.storage.getItem('lastSync');

// Invoke the agent
const { text } = await nebo.agents.invoke('Summarize my deals');

// Stream agent responses
for await (const chunk of nebo.agents.stream('Analyze this quarter')) {
  console.log(chunk.text);
}

// Direct LLM call (no persona)
const answer = await nebo.janus.complete({
  messages: [{ role: 'user', content: 'What is 2+2?' }],
});

// Embed chat panel
nebo.chat.mount(document.getElementById('chat'), {
  placeholder: 'Ask about your deals...',
  theme: 'dark',
});

// Listen for agent-pushed state
nebo.surfaces.connect();
nebo.surfaces.on('state_snapshot', (e) => {
  appState = e.snapshot;
  render();
});
```

## API Reference

### `nebo.fetch(input, init?)`
Auto-routed fetch. Relative URLs go to your sidecar. Absolute URLs go through Nebo's CORS-free proxy.

### `nebo.WebSocket(path?)`
Auto-reconnecting WebSocket with exponential backoff (1s–30s).

### `nebo.storage`
Server-persisted async key-value store: `getItem`, `setItem`, `removeItem`, `clear`, `keys`.

### `nebo.agents`
- `invoke(message, options?)` — One-shot agent call, returns `{ text, tools? }`
- `stream(message, options?)` — Streaming agent call, yields `{ text, done }`

### `nebo.janus`
- `complete(options)` — Direct LLM completion
- `stream(options)` — Streaming LLM completion

### `nebo.chat`
- `mount(element, options?)` — Embed chat UI
- `unmount()` — Remove chat UI
- `send(message)` — Programmatically send a message
- `onMessage(handler)` — Listen for chat events
- `setContext(context)` — Update app context for the agent
- `newThread()` — Start a new conversation

### `nebo.surfaces`
Real-time agent-to-app event system with typed events:
- `connect()` / `disconnect()`
- `on(type, handler)` — Subscribe to events (returns unsubscribe fn)
- `send(name, payload?)` — Send action to agent
- `requestState()` — Request full state snapshot

Events: `run_started`, `run_finished`, `run_error`, `text_start`, `text_content`, `text_end`, `tool_call_start`, `tool_call_end`, `state_snapshot`, `state_delta`, `surface_create`, `surface_update`, `surface_delete`, `data_update`, `custom`.

### `nebo.identity`
- `get()` — Returns agent metadata (id, name, skills, model, etc.)
- `invalidate()` — Clear cached identity

### `nebo.a2ui`
A2UI v0.9 message bridge for agent-driven UI components.
- `init(processor)` — Initialize with `@a2ui/web_core` MessageProcessor
- `sendAction(surfaceId, action)` — Send UI action to agent
- `sendError(surfaceId, code, message)` — Report error to agent

### `nebo.configure(options)`
Set `appId` and `baseUrl` manually (auto-detected by default).

## Formats

| Format | File | Use |
|--------|------|-----|
| ESM | `dist/index.js` | `import { nebo } from '@neboai/app-sdk'` |
| CJS | `dist/index.cjs` | `const { nebo } = require('@neboai/app-sdk')` |
| IIFE | `dist/nebo.global.js` | `<script>` tag — exposes `window.NeboAppSDK` |

## License

MIT
