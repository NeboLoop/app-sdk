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

// Redraw when the app's employee (or another open window) changes the data
nebo.storage.onChange(() => render());
```

## API Reference

### `nebo.fetch(input, init?)`
Auto-routed fetch. Relative URLs go to your sidecar. Absolute URLs go through Nebo's CORS-free proxy.

### `new nebo.WebSocket()`
Auto-reconnecting WebSocket to the app's own channel, with exponential backoff (1 s up to 30 s). It takes no path: any argument is ignored. To reach your own server (a game server, for example), open a plain `new WebSocket('wss://...')` from the page.

### `nebo.storage`
Server-persisted async key-value store for your app. It is the same store your app's employee reads and changes, so a record the owner adds by talking to the employee shows on the page, and one typed into the page is one the employee can find.

| Call | Behavior |
|------|----------|
| `getItem(key)` | The value `setItem` stored (object, list, number, string), or `null` if the key is absent. |
| `setItem(key, value)` | Stores any JSON value. |
| `removeItem(key)` | Removes the key. It no longer appears in `keys()`. |
| `keys()` | Every key, in sorted order. |
| `clear()` | Removes every key. Each removal is reported to `onChange`. |
| `onChange(handler)` | Calls `handler({ appId, keys, action, source })` after every write to the store. Returns a function that stops listening. |

`action` is `"set"` or `"delete"`. `source` is `"employee"` when the app's employee made the change and `"page"` when a page did. Your own page's writes are reported too, so the simplest handler just reloads what it shows:

```typescript
async function render() {
  const contacts = (await nebo.storage.getItem('contacts')) ?? [];
  list.replaceChildren(...contacts.map((c) => row(c)));
}

render();
const stop = nebo.storage.onChange((change) => {
  if (change.keys.includes('contacts')) render();
});
// later: stop();
```

Tips:
- Pick keys both the page and the employee can find: one key holding a list (`contacts`), or one key per record under a prefix (`contact:42`). The employee can search inside a list item by item.
- A string that is itself valid JSON, such as `"42"` or `"true"`, comes back parsed (`42`, `true`). If the exact type matters, store it inside an object: `{ "code": "42" }`.
- Keep each value well under 2 MB. For large or relational data, use a sidecar.
- `setItem` and `removeItem` do not throw when the server refuses a write. If a save matters, read it back.

### `nebo.agents`
- `invoke(message, options?)`: one-shot agent call, returns `{ text, tools? }`
- `stream(message, options?)`: streaming agent call, yields `{ text, done }`

### `nebo.janus`
- `complete(options)`: Direct LLM completion
- `stream(options)`: Streaming LLM completion

### `nebo.decide({ state, questions })`
Typed decisions through the bot, no text generated: one call answers every
named question about `state` (text or any JSON) with probabilities and a
confidence. Billed to the bot owner's NeboAI account, like `nebo.janus`. The
app's employee asks the same way with its `decide` tool.

```js
const { answers } = await nebo.decide({
  state: { company: 'Example Co', status: 'asked for a quote today' },
  questions: {
    tier:  { type: 'choice', instructions: 'How warm is this lead, by `status`?',
             criteria: { hot: 'ready to buy', warm: 'interested', cold: 'not now', other: "can't tell" } },
    fit:   { type: 'score', instructions: 'How well does `company` fit?', criteria: ['poor', 'fair', 'good'] },
    reply: { type: 'noul', instructions: '`status` asks us for a reply.' },
  },
});
// answers.tier  → { type: 'choice', choice: 'hot', confidence: 0.91, probabilities: {...} }
// answers.fit   → { type: 'score', score: 1.6, confidence: 0.8, probabilities: {...} }  (0.0 = first level)
// answers.reply → { type: 'noul', noul: 0.97, probabilities: {...} }  (probability it holds)
```

- `choice`: 2–255 named options; add an escape option when the set is not exhaustive.
- `score`: 2–10 ordered levels, lowest first.
- `noul`: one statement; no criteria.
- The whole question lives in `instructions`; the key only names the answer.
- Resolves to `{ model, answers, usage }`; each answer comes back under its
  question's name. `noul` answers carry no separate `confidence`.
- Keep `state` to the fields the questions need and name them in backticks
  inside `instructions`. Very long state is shortened in the middle before it
  is sent.
- Throws an `Error` whose message is the reason. The error carries only the
  message, not a status code. The reasons, with the status the bot's route
  answers:
  - 400: a malformed question (a choice with one option, a `noul` with
    `criteria`, empty `instructions`), with what is wrong.
  - 429: "You've used all the work included in your account. Choose a plan
    or add credits to continue." Retrying does not help until the owner adds
    a plan or credits.
  - 429: "Too many decisions at once. Try again in a moment." The bot has
    already retried once.
  - 503: "Decisions need NeboAI connected. Sign in to NeboAI and try again."
  - 502: the decision service failed; try again later.
- Keep counting, dates and thresholds in your own code; ask only what needs
  judgment.
- Billed like any model call; see pricing at https://neboai.com/pricing.
- Types: `DecideQuestion`, `DecideRequest`, `DecideAnswer`, `Decision`.

### `nebo.chat`
- `mount(element, options?)`: Embed chat UI
- `unmount()`: Remove chat UI
- `send(message)`: Programmatically send a message
- `onMessage(handler)`: Listen for chat events
- `setContext(context)`: Update app context for the agent
- `newThread()`: Start a new conversation

### `nebo.surfaces`
The app's live channel. Call `connect()` before using `nebo.a2ui`: it is the socket that carries interactive cards from the employee to the page.

> Today Nebo sends app pages interactive cards (see `nebo.a2ui`) and storage changes (see `storage.onChange`). The typed events listed below are defined in the SDK, but Nebo does not send them to app pages yet, and nothing answers `send()` or `requestState()`. Build live updates on `storage.onChange` and cards on `nebo.a2ui`.

The API:
- `connect()` / `disconnect()`
- `on(type, handler)`: Subscribe to events (returns unsubscribe fn)
- `send(name, payload?)`: Send action to agent
- `requestState()`: Request full state snapshot

Events: `run_started`, `run_finished`, `run_error`, `text_start`, `text_content`, `text_end`, `tool_call_start`, `tool_call_end`, `state_snapshot`, `state_delta`, `surface_create`, `surface_update`, `surface_delete`, `data_update`, `custom`.

### `nebo.identity`
- `get()`: Returns agent metadata (id, name, skills, model, etc.)
- `invalidate()`: Clear cached identity

### `nebo.a2ui`
A2UI v0.9 message bridge for agent-driven UI components. The app's employee can show a card on your page (a contact, a form, a set of buttons); a click goes back to that same employee.
- `init(processor)`: Initialize with an `@a2ui/web_core` MessageProcessor. The SDK does not include a renderer; bundle one with your page.
- `sendAction(surfaceId, action)`: Send UI action to agent
- `sendError(surfaceId, code, message)`: Report error to agent

Call `nebo.surfaces.connect()` so cards arrive. Cards reach only the app they were made for. A page opened after a card was sent does not receive it, so keep anything the page must always show in `nebo.storage`.

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
