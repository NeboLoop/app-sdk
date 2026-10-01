/**
 * nebo.storage — mirrors localStorage API with server-persisted async KV.
 *
 * The same store the app's employee reads and writes with its `app_data`
 * tool: same keys, same values. `onChange` hears every write to it, the
 * employee's and other open views'.
 */

import { getAppId, getBaseUrl } from './config';
import { NeboWebSocket } from './websocket';

/** One change to the app's store (the `app_data_changed` event). */
export interface StorageChange {
  appId: string;
  keys: string[];
  action: 'set' | 'delete';
  /** `employee`: the app's employee wrote it; `page`: an open view did. */
  source: 'employee' | 'page';
}

type ChangeHandler = (change: StorageChange) => void;

const changeHandlers = new Set<ChangeHandler>();
let changeSocket: NeboWebSocket | null = null;

function listenForChanges(): void {
  if (changeSocket) return;
  changeSocket = new NeboWebSocket();
  changeSocket.onmessage = (msg) => {
    let parsed: { type?: string; data?: StorageChange };
    try {
      parsed = JSON.parse(msg.data);
    } catch {
      return;
    }
    if (parsed.type !== 'app_data_changed' || !parsed.data) return;
    if (parsed.data.appId && parsed.data.appId !== getAppId()) return;
    changeHandlers.forEach((h) => h(parsed.data as StorageChange));
  };
}

/** The value the server holds: the text setItem sent, then that text parsed. */
function decode(stored: unknown): unknown {
  if (typeof stored !== 'string') return stored;
  let text: unknown;
  try {
    text = JSON.parse(stored);
  } catch {
    return stored;
  }
  if (typeof text !== 'string') return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function storageUrl(key?: string): string {
  const appId = getAppId();
  const base = getBaseUrl();
  if (key) {
    return `${base}/api/v1/apps/${appId}/storage/${encodeURIComponent(key)}`;
  }
  return `${base}/api/v1/apps/${appId}/storage`;
}

export const storage = {
  async getItem(key: string): Promise<unknown | null> {
    const resp = await fetch(storageUrl(key));
    if (resp.status === 404) return null;
    const data = await resp.json();
    return decode(data.value);
  },

  async setItem(key: string, value: unknown): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await fetch(storageUrl(key), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: serialized })
    });
  },

  async removeItem(key: string): Promise<void> {
    await fetch(storageUrl(key), { method: 'DELETE' });
  },

  async clear(): Promise<void> {
    const items = await this.keys();
    await Promise.all(items.map((key) => this.removeItem(key)));
  },

  async keys(): Promise<string[]> {
    const resp = await fetch(storageUrl());
    const data = await resp.json();
    return (data.items || []).map((item: [string, string]) => item[0]);
  },

  /**
   * Call `handler` after every change to the store: the employee's writes
   * and other open views'. Returns a function that stops listening.
   */
  onChange(handler: ChangeHandler): () => void {
    changeHandlers.add(handler);
    listenForChanges();
    return () => {
      changeHandlers.delete(handler);
    };
  }
};
