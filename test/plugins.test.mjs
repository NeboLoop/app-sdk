// nebo.plugins.run calls the app's own plugin route, and with onProgress
// follows the job's event stream to its result. Run: pnpm test (after pnpm build).
import { test } from 'node:test';
import assert from 'node:assert/strict';

/** A page on the bot, and a Nebo that answers `answer(url, init)`. */
async function sdkWith(answer) {
  globalThis.window = { location: { protocol: 'http:', hostname: 'localhost', pathname: '/apps/app-1/ui/', origin: 'http://localhost:27895' } };
  globalThis.document = { querySelector: () => null };
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, init });
    return answer(url, init);
  };
  const fresh = await import(`../dist/index.js?${Math.random()}`);
  return { nebo: fresh.nebo, calls };
}

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

test('a command runs through the app\'s own route and its result comes back', async () => {
  const result = { ok: true, output: 'Result: /x/strip.jpg', files: ['/x/strip.jpg'] };
  const { nebo, calls } = await sdkWith(() => json(200, result));
  assert.deepEqual(await nebo.plugins.run('nebo-media', 'strip', { every: 2 }), result);
  assert.equal(calls[0].url, 'http://localhost:27895/api/v1/apps/app-1/plugins/nebo-media/run');
  assert.deepEqual(JSON.parse(calls[0].init.body), { command: 'strip', args: { every: 2 }, background: false });
});

test('a refusal throws with Nebo\'s reason', async () => {
  const { nebo } = await sdkWith(() => new Response('Media Studio wants to use Nebo Media, and the owner has not allowed it.', { status: 403 }));
  await assert.rejects(nebo.plugins.run('nebo-media', 'strip'), /wants to use Nebo Media/);
});

test('long work reports each line, then resolves with the result', async () => {
  const events = 'event: progress\ndata: frame 1 of 2\n\nevent: progress\ndata: frame 2 of 2\n\nevent: result\ndata: {"ok":true,"output":"done","files":[]}\n\n';
  const { nebo, calls } = await sdkWith((url) =>
    url.endsWith('/run') ? json(202, { job: 'j1' }) : new Response(events, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
  );
  const lines = [];
  const result = await nebo.plugins.run('nebo-media', 'preview', {}, { timeout: 600, onProgress: (l) => lines.push(l) });
  assert.deepEqual(lines, ['frame 1 of 2', 'frame 2 of 2']);
  assert.deepEqual(result, { ok: true, output: 'done', files: [] });
  assert.deepEqual(JSON.parse(calls[0].init.body), { command: 'preview', args: {}, timeout: 600, background: true });
  assert.equal(calls[1].url, 'http://localhost:27895/api/v1/apps/app-1/plugins/jobs/j1');
  assert.equal(calls[1].init.headers.Accept, 'text/event-stream');
});
