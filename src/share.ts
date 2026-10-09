/**
 * nebo.share — hand the owner a file to share. The file goes into his Work
 * folder (beside the chat the app is open on), and Nebo opens its own Share
 * dialog on it: he chooses who can open the link (anyone, a password, only
 * him) and when it ends. The page never makes or changes a link itself.
 */

import { getAppId, getBaseUrl } from './config';

export interface ShareFile {
  /** The file's name with its extension: `Launch deck.html`. */
  name: string;
  /** The file's text (HTML, Markdown, CSV, SVG …). */
  content: string;
}

export interface Shared {
  /** The file's place in Work (`/api/v1/files/…`). */
  artifact: string;
}

export async function share(file: ShareFile): Promise<Shared> {
  const thread = new URLSearchParams(window.location.search).get('thread') || '';
  const resp = await fetch(`${getBaseUrl()}/api/v1/apps/${getAppId()}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, content: file.content, thread })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data.error || `share failed (${resp.status})`);
  }
  return data as Shared;
}
