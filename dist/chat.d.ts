/**
 * nebo.chat — the page's conversation with its own employee.
 *
 * The page talks to the app's employee alone, with the page's own pass:
 * `GET/POST /api/v1/apps/{id}/chat`, and the reply streams on the app's
 * socket. What the page sends is the app's words, never the owner's: no
 * install codes, slash commands or @mentions of other employees, and the
 * employee works as it does for any app request. The conversation is the
 * app's own: the owner's chats in Nebo never write into it.
 *
 * Use the primitives (`history`, `send`, `stop`, `onMessage`) to draw your
 * own chat, or `mount(element)` for a ready one.
 */
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
    /** The running turn waits on the owner (his OK, or his answer). */
    waiting: boolean;
    hasMore: boolean;
}
/** What the conversation hears, live. */
export type ChatEvent = {
    type: 'message';
    thread?: string;
    message: ChatMessage;
} | {
    type: 'stream';
    thread?: string;
    text: string;
}
/** The turn ended; `notice` says why when it stopped early. */
 | {
    type: 'complete';
    thread?: string;
    notice?: string;
} | {
    type: 'error';
    thread?: string;
    error: string;
} | {
    type: 'stopped';
    thread?: string;
}
/** The turn waits on the owner's OK: nothing more streams until he answers. */
 | {
    type: 'waiting';
    thread?: string;
}
/** The live connection came back: anything may have happened meanwhile,
 *  so read the history again. Names no thread. */
 | {
    type: 'reconnected';
};
/**
 * What the app says about what is on its page, read beside every message
 * (not shown in the chat). Call `setContext` whenever it changes.
 */
export interface ChatContext {
    projectId?: string;
    displayedDoc?: {
        filename: string;
        documentId: string;
    };
    attachedDocuments?: {
        filename: string;
        documentId: string;
    }[];
    route?: string;
    [key: string]: unknown;
}
export interface SendOptions {
    /** The conversation (`contextId`); the app's main one when absent. */
    thread?: string;
    scope?: string;
}
type Handler = (event: ChatEvent) => void;
/** A refused chat call: `status` 409 when the employee is turned off or
 *  still answering (its `message` says which, in words for the owner). */
export declare class ChatError extends Error {
    status: number;
    constructor(status: number, message: string);
}
export declare const chat: {
    /** The conversation so far, oldest first (the last 50, or `limit`). */
    history(options?: {
        thread?: string;
        before?: string;
        limit?: number;
    }): Promise<ChatHistory>;
    /** Say something to the employee. The reply arrives through `onMessage`.
     *  One message at a time: while a reply is on its way, a send is refused
     *  (stop it or wait). */
    send(message: string, options?: SendOptions): Promise<void>;
    /** Stop the turn running in the conversation. */
    stop(options?: {
        thread?: string;
    }): Promise<void>;
    /** Start the conversation over; the one before stays with the owner. */
    newThread(options?: {
        thread?: string;
    }): Promise<void>;
    /** Hear the conversation live: words sent (from any open view), the
     *  reply as it streams, and how each turn ends. Returns an unsubscribe. */
    onMessage(handler: Handler): () => void;
    /** What is on the page, sent beside every message. `null` clears it. */
    setContext(next: ChatContext | null): void;
    /** A ready chat with the employee, drawn inside `element`. */
    mount(element: HTMLElement, options?: ChatOptions): void;
    unmount(): void;
};
export {};
