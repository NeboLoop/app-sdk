/**
 * nebo.listen — hear the owner. Nebo opens the microphone on the screen the
 * page is open on, shows him that it is listening, and sends the page his
 * words as he speaks. The page never opens a microphone itself, and the
 * browser's own speech recognition is not used. The desktop app and a
 * browser listen today; where no screen can, `onState` ends `stopped`.
 *
 * The app's manifest asks for it with the `voice:listen` permission.
 *
 *   await nebo.listen.start({
 *     onWords: (heard) => { if (heard.final) follow(heard.text); },
 *     onState: (state) => setListening(state === 'listening'),
 *   });
 *   …
 *   await nebo.listen.stop();
 */

import { getAppId, getBaseUrl } from './config';
import { NeboWebSocket } from './websocket';

/** Words for one span of what was said. */
export interface Heard {
  text: string;
  /** Where the span starts and ends, seconds from the start of listening. */
  start: number;
  end: number;
  /** A partial (`false`) is replaced by the next one for its span; a final stays, punctuated. */
  final: boolean;
}

/** `starting` until the microphone is open, then `listening`, then `stopped`. */
export type ListenState = 'starting' | 'listening' | 'stopped';

export interface ListenOptions {
  onWords: (heard: Heard) => void;
  /** `reason` comes with `stopped` when Nebo could not listen, in plain words. */
  onState?: (state: ListenState, reason?: string) => void;
}

/** How long a start waits for a screen to open the microphone. */
const START_WAIT_MS = 10_000;

let socket: NeboWebSocket | null = null;
let current: ListenOptions | null = null;
let startTimer: ReturnType<typeof setTimeout> | null = null;

async function ask(on: boolean): Promise<void> {
  const client = new URLSearchParams(window.location.search).get('client') || '';
  const resp = await fetch(`${getBaseUrl()}/api/v1/apps/${getAppId()}/listen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ on, client })
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(text || `listen failed (${resp.status})`);
  }
}

function ended(reason?: string): void {
  if (startTimer) clearTimeout(startTimer);
  startTimer = null;
  const was = current;
  current = null;
  socket?.close();
  socket = null;
  was?.onState?.('stopped', reason);
}

function onFrame(msg: { data: string }): void {
  let parsed: { type?: string; data?: { appId?: string; type?: string; text?: string; start?: number; end?: number; final?: boolean; message?: string } };
  try {
    parsed = JSON.parse(msg.data);
  } catch {
    return;
  }
  const frame = parsed.data;
  if (parsed.type !== 'app_heard' || !frame || !current) return;
  if (frame.appId && frame.appId !== getAppId()) return;
  if (frame.type === 'ready') {
    if (startTimer) clearTimeout(startTimer);
    startTimer = null;
    current.onState?.('listening');
  } else if (frame.type === 'text') {
    current.onWords({ text: frame.text ?? '', start: frame.start ?? 0, end: frame.end ?? 0, final: !!frame.final });
  } else if (frame.type === 'error') {
    ended(frame.message || 'Nebo could not listen.');
  } else if (frame.type === 'ended') {
    ended();
  }
}

export const listen = {
  /**
   * Ask Nebo to listen. Resolves once Nebo has the request; `onState` says
   * when the microphone is open. Throws when the app may not listen.
   */
  async start(options: ListenOptions): Promise<void> {
    if (current) await listen.stop();
    current = options;
    options.onState?.('starting');
    const opened = new Promise<void>((resolve) => {
      socket = new NeboWebSocket();
      socket.onmessage = onFrame as (event: MessageEvent) => void;
      socket.onopen = () => resolve();
    });
    try {
      await opened;
      await ask(true);
    } catch (err) {
      ended(err instanceof Error ? err.message : String(err));
      throw err;
    }
    startTimer = setTimeout(() => {
      void ask(false).catch(() => {});
      ended('Nebo is not open on this device to listen.');
    }, START_WAIT_MS);
  },

  /** Stop listening. */
  async stop(): Promise<void> {
    if (!current) return;
    ended();
    await ask(false).catch(() => {});
  },
};
