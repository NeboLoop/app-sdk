/**
 * nebo.chat — mount the full Nebo chat UI inside an app via iframe.
 *
 * The iframe loads a dedicated SvelteKit page that renders the existing
 * ChatPane with all features (streaming, slash commands, tool viz, voice, etc.).
 * Communication happens via postMessage.
 */

import { getAppId, getBaseUrl } from './config';

export interface ChatOptions {
  placeholder?: string;
  theme?: 'auto' | 'light' | 'dark';
  height?: string;
  borderless?: boolean;
  /** Scope the chat session to a specific context (e.g. document ID).
   *  Each unique contextId gets its own persistent conversation. */
  contextId?: string;
  /** Tool scope name declared in agent.json. When set, only tools/skills/plugins
   *  defined in that scope are active for this chat session. */
  scope?: string;
}

export interface ChatMessage {
  type: string;
  text?: string;
  message?: string;
}

/**
 * App context injected into every agent request from the embedded chat.
 * The agent receives this as invisible context — not rendered in the chat UI.
 *
 * Apps should call `chat.setContext()` whenever the user navigates or the
 * displayed data changes (e.g. switching projects, opening a document).
 */
export interface ChatContext {
  /** Current project ID the user is viewing */
  projectId?: string;
  /** Currently displayed document in the viewer */
  displayedDoc?: { filename: string; documentId: string };
  /** Documents the user explicitly attached/selected this turn */
  attachedDocuments?: { filename: string; documentId: string }[];
  /** Current route/page path in the app */
  route?: string;
  /** Arbitrary app-specific key-value pairs */
  [key: string]: unknown;
}

type MessageHandler = (msg: ChatMessage) => void;

let _iframe: HTMLIFrameElement | null = null;
let _container: HTMLElement | null = null;
let _handlers: MessageHandler[] = [];
let _messageListener: ((e: MessageEvent) => void) | null = null;

function handlePostMessage(e: MessageEvent) {
  if (!e.data || typeof e.data.type !== 'string') return;
  if (!e.data.type.startsWith('nebo:')) return;

  if (e.data.type === 'nebo:resize' && _iframe && e.data.height) {
    _iframe.style.height = `${e.data.height}px`;
  }

  for (const handler of _handlers) {
    handler(e.data as ChatMessage);
  }
}

export const chat = {
  mount(element: HTMLElement, options?: ChatOptions): void {
    if (_iframe) this.unmount();

    const appId = getAppId();
    const base = getBaseUrl();

    const params = new URLSearchParams();
    if (options?.placeholder) params.set('placeholder', options.placeholder);
    if (options?.theme) params.set('theme', options.theme);
    if (options?.borderless) params.set('borderless', '1');
    if (options?.contextId) params.set('ctx', options.contextId);
    if (options?.scope) params.set('scope', options.scope);

    const qs = params.toString();
    const src = `${base}/chat-embed/${appId}${qs ? '?' + qs : ''}`;

    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.style.width = '100%';
    iframe.style.height = options?.height || '400px';
    iframe.style.border = options?.borderless ? 'none' : '';
    iframe.style.borderRadius = options?.borderless ? '0' : '0.5rem';
    iframe.style.colorScheme = 'normal';
    iframe.setAttribute('allow', 'microphone');

    element.appendChild(iframe);
    _iframe = iframe;
    _container = element;

    _messageListener = handlePostMessage;
    window.addEventListener('message', _messageListener);
  },

  unmount(): void {
    if (_iframe && _container) {
      _container.removeChild(_iframe);
    }
    if (_messageListener) {
      window.removeEventListener('message', _messageListener);
      _messageListener = null;
    }
    _iframe = null;
    _container = null;
    _handlers = [];
  },

  send(message: string): void {
    _iframe?.contentWindow?.postMessage(
      { type: 'nebo:send', message },
      '*'
    );
  },

  onMessage(handler: MessageHandler): () => void {
    _handlers.push(handler);
    return () => {
      _handlers = _handlers.filter(h => h !== handler);
    };
  },

  /**
   * Set app context that gets injected into every agent request from the chat.
   * The agent sees this as invisible context — not rendered in the chat UI.
   *
   * Call this whenever the user navigates or the displayed data changes.
   * Pass null to clear context.
   */
  setContext(context: ChatContext | null): void {
    _iframe?.contentWindow?.postMessage(
      { type: 'nebo:set-context', context },
      '*'
    );
  },

  newThread(): void {
    _iframe?.contentWindow?.postMessage(
      { type: 'nebo:new-thread' },
      '*'
    );
  },
};
