/**
 * NeboSDK class — orchestrates init + routing for all SDK modules.
 */
import { neboFetch } from './fetch';
import { NeboWebSocket } from './websocket';
export declare class NeboSDK {
    fetch: typeof neboFetch;
    WebSocket: typeof NeboWebSocket;
    storage: {
        getItem(key: string): Promise<unknown | null>;
        setItem(key: string, value: unknown): Promise<void>;
        removeItem(key: string): Promise<void>;
        clear(): Promise<void>;
        keys(): Promise<string[]>;
        onChange(handler: (change: import("./storage").StorageChange) => void): () => void;
    };
    agents: {
        invoke(message: string, options?: import("./types").InvokeOptions): Promise<import("./types").AgentResponse>;
        stream(message: string, options?: import("./types").InvokeOptions): AsyncGenerator<import("./types").StreamChunk>;
    };
    janus: {
        complete(options: import("./types").JanusOptions): Promise<string>;
        stream(options: import("./types").JanusOptions): AsyncGenerator<string>;
    };
    surfaces: import("./surfaces").NeboSurfaces;
    a2ui: import("./a2ui").NeboA2UI;
    identity: {
        get(): Promise<import("./identity").AgentIdentity>;
        invalidate(): void;
    };
    chat: {
        mount(element: HTMLElement, options?: import("./chat").ChatOptions): void;
        unmount(): void;
        send(message: string): void;
        onMessage(handler: (msg: import("./chat").ChatMessage) => void): () => void;
        setContext(context: import("./chat").ChatContext | null): void;
        newThread(): void;
    };
    constructor();
    /**
     * Manually configure the SDK (optional — auto-detection works in most cases).
     */
    configure(options: {
        appId?: string;
        baseUrl?: string;
    }): void;
}
