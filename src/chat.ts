/**
 * nebo.chat — the page's conversation with its own employee.
 *
 * The page talks to the app's employee alone, with the page's own pass:
 * `GET/POST /api/v1/apps/{id}/chat`, and the reply streams on the app's
 * socket. What the page sends is the app's words, never the owner's: no
 * install codes, slash commands or @mentions of other employees, and the
 * employee works as it does for any app request. The conversation is the
 * employee's too: the owner reads it among its chats in Nebo.
 *
 * Use the primitives (`history`, `send`, `stop`, `onMessage`) to draw your
 * own chat, or `mount(element)` for a ready one.
 */

import { getAppId, getBaseUrl } from './config';
import { NeboWebSocket } from './websocket';

export interface ChatOptions {
  placeholder?: string;
  theme?: 'auto' | 'light' | 'dark';
  height?: string;
  borderless?: boolean;
  /** A conversation of its own per context (a document, a deal): each
   *  `contextId` keeps its own history. Letters, digits, `-`, `_`, `.`. */
  contextId?: string;
  /** A tool scope declared in the app's agent.json: only its tools are on. */
  scope?: string;
  /** What the mounted chat calls the employee (the placeholder's default). */
  name?: string;
}

/** One message of the conversation. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface ChatHistory {
  messages: ChatMessage[];
  /** A turn is running: its reply is on the way. */
  running: boolean;
  hasMore: boolean;
}

/** What the conversation hears, live. */
export type ChatEvent =
  | { type: 'message'; thread?: string; message: ChatMessage }
  | { type: 'stream'; thread?: string; text: string }
  /** The turn ended; `notice` says why when it stopped early. */
  | { type: 'complete'; thread?: string; notice?: string }
  | { type: 'error'; thread?: string; error: string }
  | { type: 'stopped'; thread?: string };

/**
 * What the app says about what is on its page, read beside every message
 * (not shown in the chat). Call `setContext` whenever it changes.
 */
export interface ChatContext {
  projectId?: string;
  displayedDoc?: { filename: string; documentId: string };
  attachedDocuments?: { filename: string; documentId: string }[];
  route?: string;
  [key: string]: unknown;
}

export interface SendOptions {
  /** The conversation (`contextId`); the app's main one when absent. */
  thread?: string;
  scope?: string;
}

type Handler = (event: ChatEvent) => void;

const handlers = new Set<Handler>();
let socket: NeboWebSocket | null = null;
let context: ChatContext | null = null;

function chatUrl(rest = ''): string {
  return `${getBaseUrl()}/api/v1/apps/${encodeURIComponent(getAppId())}/chat${rest}`;
}

/** The thread a conversation key names: `agent:<id>:app[:<thread>]`. */
function threadOf(key: unknown): string | undefined | null {
  if (typeof key !== 'string') return null;
  const base = `agent:${getAppId()}:app`;
  if (key === base) return undefined;
  if (key.startsWith(base + ':')) return key.slice(base.length + 1);
  return null;
}

function emit(event: ChatEvent): void {
  handlers.forEach((h) => h(event));
}

function listen(): void {
  if (socket) return;
  socket = new NeboWebSocket();
  socket.onmessage = (msg) => {
    let parsed: { type?: string; data?: Record<string, unknown> };
    try {
      parsed = JSON.parse(msg.data);
    } catch {
      return;
    }
    const data = parsed.data ?? {};
    const thread = threadOf(data.session_id);
    if (thread === null) return;
    switch (parsed.type) {
      case 'chat_user_message':
        emit({
          type: 'message',
          thread,
          message: {
            id: String(data.id ?? ''),
            role: 'user',
            content: String(data.content ?? ''),
            createdAt: Number(data.createdAt ?? Date.now())
          }
        });
        break;
      case 'chat_stream':
        if (typeof data.content === 'string' && data.content) emit({ type: 'stream', thread, text: data.content });
        break;
      case 'chat_complete':
        // A message sent while a turn ran was taken into that turn: the
        // turn goes on, and its own end comes later.
        if (data.stop_reason === 'queued_into_running_turn') break;
        emit({ type: 'complete', thread, notice: typeof data.stop_notice === 'string' ? data.stop_notice : undefined });
        break;
      case 'chat_error':
        emit({ type: 'error', thread, error: String(data.error ?? 'Something went wrong. Try again.') });
        break;
      case 'chat_cancelled':
        emit({ type: 'stopped', thread });
        break;
    }
  };
}

async function post(rest: string, body: unknown): Promise<Response> {
  const resp = await fetch(chatUrl(rest), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) throw new Error((await resp.text()) || `chat: ${resp.status}`);
  return resp;
}

export const chat = {
  /** The conversation so far, oldest first (the last 50, or `limit`). */
  async history(options?: { thread?: string; before?: string; limit?: number }): Promise<ChatHistory> {
    const q = new URLSearchParams();
    if (options?.thread) q.set('thread', options.thread);
    if (options?.before) q.set('before', options.before);
    if (options?.limit) q.set('limit', String(options.limit));
    const qs = q.toString();
    const resp = await fetch(chatUrl(qs ? `?${qs}` : ''));
    if (!resp.ok) throw new Error((await resp.text()) || `chat: ${resp.status}`);
    const body = await resp.json();
    return { messages: body.messages ?? [], running: !!body.running, hasMore: !!body.hasMore };
  },

  /** Say something to the employee. The reply arrives through `onMessage`. */
  async send(message: string, options?: SendOptions): Promise<void> {
    listen();
    await post('', { message, thread: options?.thread, scope: options?.scope, context });
  },

  /** Stop the turn running in the conversation. */
  async stop(options?: { thread?: string }): Promise<void> {
    await post('/stop', { thread: options?.thread });
  },

  /** Start the conversation over; the one before stays with the owner. */
  async newThread(options?: { thread?: string }): Promise<void> {
    await post('/new', { thread: options?.thread });
    mounted?.reset();
  },

  /** Hear the conversation live: words sent (from any open view), the
   *  reply as it streams, and how each turn ends. Returns an unsubscribe. */
  onMessage(handler: Handler): () => void {
    listen();
    handlers.add(handler);
    return () => handlers.delete(handler);
  },

  /** What is on the page, sent beside every message. `null` clears it. */
  setContext(next: ChatContext | null): void {
    context = next;
  },

  /** A ready chat with the employee, drawn inside `element`. */
  mount(element: HTMLElement, options?: ChatOptions): void {
    mounted?.destroy();
    mounted = mountChat(element, options ?? {});
  },

  unmount(): void {
    mounted?.destroy();
    mounted = null;
  }
};

// ── The mounted chat ────────────────────────────────────────────────────

interface Mounted {
  reset(): void;
  destroy(): void;
}

let mounted: Mounted | null = null;

const STYLE_ID = 'nebo-chat-style';
const STYLE = `
.nebo-chat{--nc-bg:#fff;--nc-fg:#16181d;--nc-muted:#6b7280;--nc-line:#e5e7eb;--nc-me:#16181d;--nc-me-fg:#fff;--nc-them:#f3f4f6;--nc-accent:#4f46e5;
  display:flex;flex-direction:column;height:100%;min-height:0;background:var(--nc-bg);color:var(--nc-fg);
  font:16px/1.6 "Geist",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;border:1px solid var(--nc-line);border-radius:12px;overflow:hidden;box-sizing:border-box}
.nebo-chat *{box-sizing:border-box}
.nebo-chat.nebo-chat--borderless{border:0;border-radius:0}
.nebo-chat.nebo-chat--dark{--nc-bg:#111318;--nc-fg:#eceef2;--nc-muted:#9aa1ad;--nc-line:#262a33;--nc-me:#eceef2;--nc-me-fg:#111318;--nc-them:#1c1f26;--nc-accent:#8b8cf8}
@media (prefers-color-scheme:dark){.nebo-chat.nebo-chat--auto{--nc-bg:#111318;--nc-fg:#eceef2;--nc-muted:#9aa1ad;--nc-line:#262a33;--nc-me:#eceef2;--nc-me-fg:#111318;--nc-them:#1c1f26;--nc-accent:#8b8cf8}}
.nebo-chat__log{flex:1;min-height:0;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;gap:12px}
.nebo-chat__empty{margin:auto;color:var(--nc-muted);text-align:center;font-size:15px}
.nebo-chat__msg{max-width:85%;padding:10px 14px;border-radius:18px;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere}
.nebo-chat__msg--user{align-self:flex-end;background:var(--nc-me);color:var(--nc-me-fg);border-bottom-right-radius:6px}
.nebo-chat__msg--assistant{align-self:flex-start;background:var(--nc-them);border-bottom-left-radius:6px}
.nebo-chat__msg--error{align-self:center;background:transparent;color:#dc2626;font-size:14px;padding:4px 8px}
.nebo-chat__msg--note{align-self:center;background:transparent;color:var(--nc-muted);font-size:14px;padding:4px 8px}
.nebo-chat__msg code{font:14px ui-monospace,SFMono-Regular,Menlo,monospace;background:rgba(127,127,127,.15);padding:1px 5px;border-radius:5px}
.nebo-chat__msg a{color:inherit;text-decoration:underline}
.nebo-chat__dots{display:inline-flex;gap:4px;align-items:center;height:1.6em}
.nebo-chat__dots i{width:6px;height:6px;border-radius:50%;background:var(--nc-muted);animation:nebo-chat-blink 1.2s infinite ease-in-out}
.nebo-chat__dots i:nth-child(2){animation-delay:.2s}.nebo-chat__dots i:nth-child(3){animation-delay:.4s}
@keyframes nebo-chat-blink{0%,80%,100%{opacity:.25}40%{opacity:1}}
.nebo-chat__composer{display:flex;gap:8px;align-items:flex-end;padding:12px;border-top:1px solid var(--nc-line)}
.nebo-chat__input{flex:1;resize:none;border:1px solid var(--nc-line);border-radius:14px;padding:10px 14px;background:var(--nc-bg);color:var(--nc-fg);font:inherit;max-height:160px;outline:none}
.nebo-chat__input:focus{border-color:var(--nc-accent)}
.nebo-chat__input::placeholder{color:var(--nc-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nebo-chat__button{flex:none;height:44px;min-width:44px;padding:0 16px;border:0;border-radius:22px;background:var(--nc-accent);color:#fff;font:600 15px/1 inherit;font-family:inherit;cursor:pointer}
.nebo-chat__button:disabled{opacity:.4;cursor:default}
.nebo-chat__button--stop{background:var(--nc-fg);color:var(--nc-bg)}
`;

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.appendChild(style);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

/** The words, with `code`, **bold** and links drawn; never as HTML. */
function render(target: HTMLElement, text: string): void {
  target.textContent = '';
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    const i = m.index ?? 0;
    if (i > last) target.appendChild(document.createTextNode(text.slice(last, i)));
    const token = m[0];
    if (token.startsWith('`')) {
      target.appendChild(document.createElement('code')).textContent = token.slice(1, -1);
    } else if (token.startsWith('**')) {
      target.appendChild(document.createElement('strong')).textContent = token.slice(2, -2);
    } else {
      const a = target.appendChild(document.createElement('a'));
      a.href = token;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = token;
    }
    last = i + token.length;
  }
  if (last < text.length) target.appendChild(document.createTextNode(text.slice(last)));
}

function mountChat(element: HTMLElement, options: ChatOptions): Mounted {
  injectStyle();
  const thread = options.contextId || undefined;
  const theme = options.theme ?? 'auto';
  const root = el('div', `nebo-chat nebo-chat--${theme}${options.borderless ? ' nebo-chat--borderless' : ''}`);
  if (options.height) root.style.height = options.height;
  const log = el('div', 'nebo-chat__log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  const composer = el('form', 'nebo-chat__composer');
  const input = el('textarea', 'nebo-chat__input');
  input.rows = 1;
  input.setAttribute('aria-label', 'Message');
  input.placeholder = options.placeholder || (options.name ? `Message ${options.name}` : 'Message');
  const button = el('button', 'nebo-chat__button');
  button.type = 'submit';
  composer.append(input, button);
  root.append(log, composer);
  element.appendChild(root);

  let running = false;
  let reply: { node: HTMLElement; text: string } | null = null;
  const empty = el('div', 'nebo-chat__empty');
  empty.textContent = options.name ? `Ask ${options.name} anything.` : 'Ask anything.';

  const atBottom = () => log.scrollHeight - log.scrollTop - log.clientHeight < 48;
  const scroll = (force = false) => {
    if (force || atBottom()) log.scrollTop = log.scrollHeight;
  };
  const showEmpty = () => {
    if (!log.querySelector('.nebo-chat__msg')) log.appendChild(empty);
    else empty.remove();
  };
  const bubble = (role: 'user' | 'assistant' | 'error' | 'note', text: string) => {
    empty.remove();
    const node = el('div', `nebo-chat__msg nebo-chat__msg--${role}`);
    render(node, text);
    log.appendChild(node);
    return node;
  };
  const dots = () => {
    const node = el('div', 'nebo-chat__msg nebo-chat__msg--assistant');
    const d = node.appendChild(el('span', 'nebo-chat__dots'));
    d.append(document.createElement('i'), document.createElement('i'), document.createElement('i'));
    empty.remove();
    log.appendChild(node);
    return node;
  };
  const setRunning = (on: boolean) => {
    running = on;
    button.textContent = on ? 'Stop' : 'Send';
    button.classList.toggle('nebo-chat__button--stop', on);
    button.disabled = !on && !input.value.trim();
    if (on && !reply) {
      reply = { node: dots(), text: '' };
      scroll(true);
    }
    if (!on) {
      if (reply && !reply.text) reply.node.remove();
      reply = null;
      showEmpty();
    }
  };
  const grow = () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
    if (!running) button.disabled = !input.value.trim();
  };

  const load = async () => {
    log.textContent = '';
    try {
      const h = await chat.history({ thread });
      for (const m of h.messages) bubble(m.role, m.content);
      showEmpty();
      setRunning(h.running);
      scroll(true);
    } catch {
      bubble('error', 'Could not load the conversation. Try again.');
    }
  };

  const off = chat.onMessage((e) => {
    if (e.thread !== thread) return;
    if (e.type === 'message') {
      // The words this view sent are drawn already; another view's arrive.
      if (!running) {
        bubble('user', e.message.content);
        setRunning(true);
      }
    } else if (e.type === 'stream') {
      if (!reply) setRunning(true);
      if (reply) {
        reply.text += e.text;
        reply.node.textContent = '';
        render(reply.node, reply.text);
        scroll();
      }
    } else if (e.type === 'error') {
      setRunning(false);
      bubble('error', e.error);
      scroll();
    } else {
      setRunning(false);
      if (e.type === 'complete' && e.notice) bubble('note', e.notice);
    }
  });

  const submit = async () => {
    if (running) {
      try {
        await chat.stop({ thread });
      } catch {
        /* the stop is heard on the socket when it lands */
      }
      return;
    }
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    grow();
    bubble('user', text);
    setRunning(true);
    try {
      await chat.send(text, { thread, scope: options.scope });
    } catch {
      setRunning(false);
      bubble('error', 'Could not send. Try again.');
    }
  };

  composer.addEventListener('submit', (e) => {
    e.preventDefault();
    void submit();
  });
  input.addEventListener('input', grow);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      void submit();
    }
  });

  setRunning(false);
  void load();

  return {
    reset() {
      log.textContent = '';
      setRunning(false);
    },
    destroy() {
      off();
      root.remove();
    }
  };
}
