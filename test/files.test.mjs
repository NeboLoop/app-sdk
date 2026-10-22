// nebo.files.url builds the app's own file address in every place a page is
// open: the desktop window, a browser on the bot, the tunnel, an app-view pass.
// Run: pnpm test (after pnpm build).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const sdk = await import('../dist/index.js');

/** A page at `href`, with the meta tags Nebo's bridge adds to it. */
function page(href, meta = {}) {
  const url = new URL(href);
  globalThis.window = { location: { protocol: url.protocol, hostname: url.hostname, pathname: url.pathname, origin: url.origin } };
  globalThis.document = {
    querySelector: (sel) => {
      const name = /name="([^"]+)"/.exec(sel)?.[1];
      return name in meta ? { getAttribute: () => meta[name] } : null;
    }
  };
}

/** The SDK's address for `path` on a fresh page (no cached app or base). */
async function urlOn(href, meta, path) {
  page(href, meta);
  const fresh = await import(`../dist/index.js?${Math.random()}`);
  return fresh.nebo.files.url(path);
}

test('the desktop window goes to Nebo with its pass', async () => {
  const desktop = { 'nebo-app-id': 'app-1', 'nebo-base-url': 'http://127.0.0.1:27895/k/av9' };
  assert.equal(
    await urlOn('neboapp://app-1/index.html', desktop, 'Media/Projects/reel/render.mp4'),
    'http://127.0.0.1:27895/k/av9/api/v1/apps/app-1/files/Media/Projects/reel/render.mp4'
  );
});

test('a path that climbs out of its folder is refused', async () => {
  for (const bad of ['Media/../secret.txt', '../x', 'Media/./x', '..']) {
    page('http://localhost:27895/apps/app-1/ui/index.html');
    const fresh = await import(`../dist/index.js?${Math.random()}`);
    assert.throws(() => fresh.nebo.files.url(bad), /climbs out/, bad);
  }
});

test('the app id is encoded', async () => {
  assert.equal(
    await urlOn('http://localhost:27895/apps/a%2Fb/ui/index.html', {}, 'x.png'),
    'http://localhost:27895/api/v1/apps/a%2Fb/files/x.png'
  );
});

test('the page under its pass finds its app and base', async () => {
  assert.equal(
    await urlOn('https://neboai.com/t/bot-9/k/av1/apps/app-1/ui/index.html', { 'nebo-base-url': 'https://neboai.com/t/bot-9/k/av1' }, 'x.png'),
    'https://neboai.com/t/bot-9/k/av1/api/v1/apps/app-1/files/x.png'
  );
});

test('a browser on the bot gets its origin', async () => {
  assert.equal(
    await urlOn('http://localhost:27895/apps/app-1/ui/index.html', {}, 'Media/a b#1.mp4'),
    'http://localhost:27895/api/v1/apps/app-1/files/Media/a%20b%231.mp4'
  );
});

test('the tunnel and an app-view pass keep their prefix', async () => {
  const tunnel = { 'nebo-app-id': 'app-1', 'nebo-base-url': 'https://neboai.com/t/bot-9' };
  assert.equal(
    await urlOn('https://neboai.com/t/bot-9/apps/app-1/ui/', tunnel, '/Media//x.png'),
    'https://neboai.com/t/bot-9/api/v1/apps/app-1/files/Media/x.png'
  );
  const pass = { 'nebo-app-id': 'app-1', 'nebo-base-url': 'http://127.0.0.1:27895/k/av123' };
  assert.equal(
    await urlOn('http://127.0.0.1:27895/k/av123/apps/app-1/ui/', pass, 'Media/x.png'),
    'http://127.0.0.1:27895/k/av123/api/v1/apps/app-1/files/Media/x.png'
  );
});

test('files is on nebo and at the top level', () => {
  assert.equal(typeof sdk.files.url, 'function');
  assert.equal(sdk.nebo.files, sdk.files);
});
