# @neboai/app-sdk

SDK for building [Nebo](https://neboai.com) apps. Mirrors native browser APIs (`fetch`, `WebSocket`, `localStorage`) while adding agent invocation, LLM completions, and real-time state management.

## Install

```bash
pnpm add @neboai/app-sdk
```

Or, for a page without a build step, load the copy Nebo serves to every app page:

```html
<script src="/sdk/nebo.global.js"></script>
<script>
  const { nebo } = window.NeboAppSDK; // the one global; there is no bare `nebo`
</script>
```

An unbundled page cannot `import` a bare package name; use the served global.

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

### `new nebo.WebSocket()`
Auto-reconnecting WebSocket to the app's own channel, with exponential backoff (1 s up to 30 s). It takes no path: any argument is ignored. To reach your own server (a game server, for example), open a plain `new WebSocket('wss://...')` from the page.

### `nebo.storage`
Server-persisted async key-value store: `getItem`, `setItem`, `removeItem`, `clear`, `keys`.

### `nebo.agents`
- `invoke(message, options?)`: one-shot agent call, returns `{ text, tools? }`
- `stream(message, options?)`: streaming agent call, yields `{ text, done }`

### `nebo.janus`
- `complete(options)`: Direct LLM completion
- `stream(options)`: Streaming LLM completion

### `nebo.chat`
- `mount(element, options?)`: Embed chat UI
- `unmount()`: Remove chat UI
- `send(message)`: Programmatically send a message
- `onMessage(handler)`: Listen for chat events
- `setContext(context)`: Update app context for the agent
- `newThread()`: Start a new conversation

### `nebo.surfaces`
Real-time agent-to-app event system with typed events:
- `connect()` / `disconnect()`
- `on(type, handler)`: Subscribe to events (returns unsubscribe fn)
- `send(name, payload?)`: Send action to agent
- `requestState()`: Request full state snapshot

Events: `run_started`, `run_finished`, `run_error`, `text_start`, `text_content`, `text_end`, `tool_call_start`, `tool_call_end`, `state_snapshot`, `state_delta`, `surface_create`, `surface_update`, `surface_delete`, `data_update`, `custom`.

### `nebo.identity`
- `get()`: Returns agent metadata (id, name, skills, model, etc.)
- `invalidate()`: Clear cached identity

### `nebo.a2ui`
A2UI v0.9 message bridge for agent-driven UI components.
- `init(processor)`: Initialize with `@a2ui/web_core` MessageProcessor
- `sendAction(surfaceId, action)`: Send UI action to agent
- `sendError(surfaceId, code, message)`: Report error to agent

### `nebo.configure(options)`
Set `appId` and `baseUrl` manually (auto-detected by default).

## What the page gets from Nebo (no SDK call needed)

Some app features come from the app's `manifest.json` and standard browser APIs rather than from the SDK:

| Want | How |
|------|-----|
| Full screen, landscape | `"window": { "fullscreen": true, "orientation": "landscape" }` (`orientation`: `portrait` default, `landscape`, `any`). Pad with `env(safe-area-inset-*)` and `viewport-fit=cover`. |
| Tilt (gyroscope, accelerometer) | Add `"device:motion"` to `permissions`, then listen for `devicemotion` / `deviceorientation`. On iPhone call `DeviceMotionEvent.requestPermission()` from a tap. |
| Video and sound | Ship the files in `ui/`. They are served with their real content types and answer range requests, so `<video muted playsinline>` plays inline on the phone and seeking works. |
| Fast reloads | Build with content-hashed names (`main-0a8ksftt.js`): those are cached for a year, every other file is checked on each open. |

Each page file may be at most 10 MB, and a published app at most 50 MB. See the app docs at https://neboai.com/docs/apps.

## Formats

| Format | File | Use |
|--------|------|-----|
| ESM | `dist/index.js` | `import { nebo } from '@neboai/app-sdk'` |
| CJS | `dist/index.cjs` | `const { nebo } = require('@neboai/app-sdk')` |
| IIFE | `dist/nebo.global.js` | `<script>` tag, exposes `window.NeboAppSDK` (Nebo serves it at `/sdk/nebo.global.js`) |

## License

MIT
