// nebo.fetch of an outside address goes through the app's http/proxy. When
// Nebo itself refuses the call, the page gets that answer as fetch() would:
// its status and its words, never a JSON parse error.
// Run: pnpm test (after pnpm build).
import { test } from 'node:test';
import assert from 'node:assert/strict';

function page() {
  globalThis.window = { location: { protocol: 'http:', hostname: 'localhost', pathname: '/k/av9/apps/app-1/ui/index.html', origin: 'http://localhost:27895' } };
  globalThis.document = { querySelector: () => null };
}

test("Nebo's refusal reaches the page with its status and words", async () => {
  page();
  globalThis.fetch = async () => new Response('app lacks permission: network:example.com', { status: 403, headers: { 'content-type': 'text/plain' } });
  const { nebo } = await import(`../dist/index.js?${Math.random()}`);
  const r = await nebo.fetch('https://example.com/');
  assert.equal(r.status, 403);
  assert.equal(await r.text(), 'app lacks permission: network:example.com');
});

test("the site's own answer comes back as the site gave it", async () => {
  page();
  globalThis.fetch = async () => new Response(JSON.stringify({ status: 404, headers: { 'content-type': 'text/html' }, body: 'not here' }), { status: 200 });
  const { nebo } = await import(`../dist/index.js?${Math.random()}`);
  const r = await nebo.fetch('https://example.com/missing');
  assert.equal(r.status, 404);
  assert.equal(await r.text(), 'not here');
});
