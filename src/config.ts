/**
 * Auto-detect the app ID and base URL.
 *
 * Production: URL path is /apps/{id}/ui/... → extract id from path.
 * Dev (Vite): <meta name="nebo-app-id" content="my-app"> in index.html.
 */

let _appId: string | null = null;
let _baseUrl: string | null = null;

export function getAppId(): string {
  if (_appId) return _appId;

  // Custom protocol: neboapp://{agent_id}/
  if (window.location.protocol === 'neboapp:') {
    _appId = window.location.hostname;
    return _appId;
  }

  // Try URL path first: /apps/{id}/ui/..., under the tunnel's /t/<bot>
  // and the page's pass, /k/<pass>, when it has them.
  const match = window.location.pathname.match(/^(?:\/t\/[^/]+)?(?:\/k\/[^/]+)?\/apps\/([^/]+)\/ui(?:\/|$)/);
  if (match) {
    _appId = decodeURIComponent(match[1]);
    return _appId;
  }

  // Try meta tag (dev mode)
  const meta = document.querySelector('meta[name="nebo-app-id"]');
  if (meta) {
    _appId = meta.getAttribute('content') || '';
    return _appId;
  }

  throw new Error(
    '[nebo-sdk] Cannot detect app ID. In production, serve from /apps/{id}/ui/. ' +
    'In dev, add <meta name="nebo-app-id" content="your-id"> to index.html.'
  );
}

export function getBaseUrl(): string {
  if (_baseUrl) return _baseUrl;

  // What Nebo told the page: its server's address with the page's own pass
  // (`/k/<pass>`, the one credential an app's page carries), and the
  // tunnel's prefix when it has one. Nebo writes it into every page it
  // serves, on the desktop and over HTTP; in dev, write it yourself.
  const meta = document.querySelector('meta[name="nebo-base-url"]');
  if (meta) {
    _baseUrl = meta.getAttribute('content') || '';
    return _baseUrl;
  }

  // Custom protocol: API calls go to the local Nebo server
  if (window.location.protocol === 'neboapp:') {
    _baseUrl = 'http://localhost:27895';
    return _baseUrl;
  }

  _baseUrl = window.location.origin;
  return _baseUrl;
}

export function setAppId(id: string): void {
  _appId = id;
}

export function setBaseUrl(url: string): void {
  _baseUrl = url;
}
