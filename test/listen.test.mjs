// nebo.listen asks Nebo to open the microphone on the screen the page is
// open on, and passes on the words Nebo sends. Run: pnpm test (after pnpm build).
import { test } from 'node:test';
import assert from 'node:assert/strict';

/** A page on the bot, with a socket the test can speak through. */
async function sdk() {
  globalThis.window = { location: { protocol: 'http:', hostname: 'localhost', pathname: '/apps/app-1/ui/', origin: 'http://localhost:27895', search: '?client=desktop-a' } };
  globalThis.document = { querySelector: () => null };
  const calls = [];
  let status = 200;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return new Response(status === 200 ? '{"ok":true}' : 'app lacks permission: voice:listen', { status });
  };
  const sockets = [];
  globalThis.WebSocket = class {
    static CLOSED = 3;
    constructor(url) { this.url = url; sockets.push(this); queueMicrotask(() => this.onopen?.({})); }
    close() { this.closed = true; }
  };
  const fresh = await import(`../dist/index.js?${Math.random()}`);
  const say = (data) => sockets.at(-1).onmessage({ data: JSON.stringify({ type: 'app_heard', data: { appId: 'app-1', ...data } }) });
  return { nebo: fresh.nebo, calls, sockets, say, refuse: () => { status = 403; } };
}

test('start asks the screen the page is open on, and the words arrive', async () => {
  const { nebo, calls, sockets, say } = await sdk();
  const states = [];
  const words = [];
  await nebo.listen.start({ onWords: (h) => words.push(h), onState: (s) => states.push(s) });
  assert.equal(calls[0].url, 'http://localhost:27895/api/v1/apps/app-1/listen');
  assert.deepEqual(calls[0].body, { on: true, client: 'desktop-a' });
  assert.equal(sockets[0].url, 'ws://localhost:27895/ws/app/app-1');
  say({ type: 'ready' });
  say({ type: 'text', text: 'good', start: 0, end: 0.4, final: false });
  say({ type: 'text', text: 'Good evening.', start: 0, end: 1.1, final: true });
  assert.deepEqual(states, ['starting', 'listening']);
  assert.deepEqual(words.at(-1), { text: 'Good evening.', start: 0, end: 1.1, final: true });
  await nebo.listen.stop();
  assert.deepEqual(states.at(-1), 'stopped');
  assert.deepEqual(calls.at(-1).body, { on: false, client: 'desktop-a' });
  assert.ok(sockets[0].closed);
});

test('the microphone closing, or failing, stops with the reason', async () => {
  const { nebo, say } = await sdk();
  const seen = [];
  await nebo.listen.start({ onWords: () => {}, onState: (s, reason) => seen.push([s, reason]) });
  say({ type: 'error', message: 'Dictation needs a NeboAI account. Sign in to NeboAI and try again.' });
  assert.deepEqual(seen.at(-1), ['stopped', 'Dictation needs a NeboAI account. Sign in to NeboAI and try again.']);
  await nebo.listen.start({ onWords: () => {}, onState: (s, reason) => seen.push([s, reason]) });
  say({ type: 'ended' });
  assert.deepEqual(seen.at(-1), ['stopped', undefined]);
  await nebo.listen.stop();
});

test('an app that may not listen is told so', async () => {
  const { nebo, refuse } = await sdk();
  refuse();
  const seen = [];
  await assert.rejects(nebo.listen.start({ onWords: () => {}, onState: (s) => seen.push(s) }), /voice:listen/);
  assert.equal(seen.at(-1), 'stopped');
});
