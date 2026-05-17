/**
 * nebo.chat — mount the full Nebo chat UI inside an app via iframe.
 *
 * The iframe loads a dedicated SvelteKit page that renders the existing
 * ChatPane with all features (streaming, slash commands, tool viz, voice, etc.).
 * Communication happens via postMessage.
 */
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
    displayedDoc?: {
        filename: string;
        documentId: string;
    };
    /** Documents the user explicitly attached/selected this turn */
    attachedDocuments?: {
        filename: string;
        documentId: string;
    }[];
    /** Current route/page path in the app */
    route?: string;
    /** Arbitrary app-specific key-value pairs */
    [key: string]: unknown;
}
type MessageHandler = (msg: ChatMessage) => void;
export declare const chat: {
    mount(element: HTMLElement, options?: ChatOptions): void;
    unmount(): void;
    send(message: string): void;
    onMessage(handler: MessageHandler): () => void;
    /**
     * Set app context that gets injected into every agent request from the chat.
     * The agent sees this as invisible context — not rendered in the chat UI.
     *
     * Call this whenever the user navigates or the displayed data changes.
     * Pass null to clear context.
     */
    setContext(context: ChatContext | null): void;
    newThread(): void;
};
export {};
