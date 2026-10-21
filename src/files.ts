/**
 * nebo.files — the address of one of the owner's files, for an <img>,
 * <video>, <audio> or fetch() on the page.
 *
 * The path is relative to the owner's NeboAI folder (`~/NeboAI`), and it must
 * be inside a folder the app's manifest grants it:
 * `"permissions": ["filesystem:read:Media/Projects"]`. Nebo serves it read
 * only, with byte ranges (a video plays and seeks), through the app's own
 * route, so the address works wherever the page is open: the desktop window,
 * a browser, the mobile app. The page never builds `/api/v1/...` addresses
 * itself.
 */

import { getAppId, getBaseUrl } from './config';

export const files = {
  /** `files.url('Media/Projects/reel/render.mp4')` */
  url(path: string): string {
    const appId = getAppId();
    const rel = path
      .split('/')
      .filter((part) => part !== '')
      .map(encodeURIComponent)
      .join('/');
    const route = `/api/v1/apps/${appId}/files/${rel}`;
    // The desktop window's own scheme carries the request to Nebo; a media
    // element's address is never rewritten the way fetch() is.
    if (window.location.protocol === 'neboapp:') return `neboapp://${appId}${route}`;
    return `${getBaseUrl()}${route}`;
  }
};
