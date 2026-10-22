// nebo.chat talks to the app's own employee through the page's pass, and
// hears only the app's own conversations on its socket.
// Run: pnpm test (after pnpm build).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const sockets = [];
const requests = [];

function page() {
  globalThis.window = { location: { protocol: 'http:', hostname: '127.0.0.1', pathname: '/k/av9/apps/app-1/ui/index.html', origin: 'null' } };
  const meta = { 'nebo-base-url': 'http://127.0.0.1:27895/k/av9' };
  globalThis.document = {
    querySelector: (sel) => {
      const name = /name="([^"]+)"/.exec(sel)?.[1];
      return name in meta ? { getAttribute: () => meta[name] } : null;
    }
  };
  globalThis.WebSocket = class {
    constructor(url) {
      this.url = url;
      sockets.push(this);
    }
    close() {}
  };
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init });
    return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'm1', role: 'user', content: 'hi', createdAt: 1 }], running: true }), text: async () => '' };
  };
}

page();
const { nebo } = await import('../dist/index.js');

test('send goes to the app own chat with the pass, the thread and the context', async () => {
  nebo.chat.setContext({ deal: 'd-7' });
  await nebo.chat.send('hello', { thread: 'deal-7' });
  const r = requests.at(-1);
  assert.equal(r.url, 'http://127.0.0.1:27895/k/av9/api/v1/apps/app-1/chat');
  assert.equal(r.init.method, 'POST');
  assert.deepEqual(JSON.parse(r.init.body), { message: 'hello', thread: 'deal-7', context: { deal: 'd-7' } });
  assert.equal(sockets[0].url, 'ws://127.0.0.1:27895/k/av9/ws/app/app-1');
});

test('history reads the thread', async () => {
  const h = await nebo.chat.history({ thread: 'deal-7' });
  assert.equal(requests.at(-1).url, 'http://127.0.0.1:27895/k/av9/api/v1/apps/app-1/chat?thread=deal-7');
  assert.equal(h.running, true);
  assert.equal(h.messages[0].content, 'hi');
});

test('stop and newThread go to their routes', async () => {
  await nebo.chat.stop();
  assert.equal(requests.at(-1).url, 'http://127.0.0.1:27895/k/av9/api/v1/apps/app-1/chat/stop');
  await nebo.chat.newThread({ thread: 'deal-7' });
  assert.equal(requests.at(-1).url, 'http://127.0.0.1:27895/k/av9/api/v1/apps/app-1/chat/new');
});

test('the socket events of the app own conversations, and nothing else', () => {
  const heard = [];
  const off = nebo.chat.onMessage((e) => heard.push(e));
  const say = (type, data) => sockets[0].onmessage({ data: JSON.stringify({ type, data }) });
  say('chat_stream', { session_id: 'agent:app-1:app', content: 'He' });
  say('chat_stream', { session_id: 'agent:app-1:app:deal-7', content: 'llo' });
  say('chat_stream', { session_id: 'agent:app-1:web', content: 'the owner' });
  say('chat_stream', { session_id: 'agent:app-2:app', content: 'another app' });
  say('chat_complete', { session_id: 'agent:app-1:app', stop_reason: 'queued_into_running_turn' });
  say('chat_complete', { session_id: 'agent:app-1:app' });
  say('chat_cancelled', { session_id: 'agent:app-1:app:deal-7' });
  off();
  say('chat_stream', { session_id: 'agent:app-1:app', content: 'after' });
  assert.deepEqual(heard, [
    { type: 'stream', thread: undefined, text: 'He' },
    { type: 'stream', thread: 'deal-7', text: 'llo' },
    { type: 'complete', thread: undefined, notice: undefined },
    { type: 'stopped', thread: 'deal-7' }
  ]);
});
