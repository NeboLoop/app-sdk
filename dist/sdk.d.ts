/**
 * NeboSDK class — orchestrates init + routing for all SDK modules.
 */
import { neboFetch } from './fetch';
import { NeboWebSocket } from './websocket';
import { decide } from './decide';
import { share } from './share';
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
    decide: typeof decide;
    share: typeof share;
    files: {
        url(path: string): string;
    };
    plugins: {
        run(slug: string, command: string, args?: Record<string, unknown>, options?: import("./plugins").PluginRunOptions): Promise<import("./plugins").PluginResult>;
    };
    surfaces: import("./surfaces").NeboSurfaces;
    a2ui: import("./a2ui").NeboA2UI;
    identity: {
        get(): Promise<import("./identity").AgentIdentity>;
        invalidate(): void;
    };
    chat: {
        history(options?: {
            thread?: string;
            before?: string;
            limit?: number;
        }): Promise<import("./chat").ChatHistory>;
        send(message: string, options?: import("./chat").SendOptions): Promise<void>;
        stop(options?: {
            thread?: string;
        }): Promise<void>;
        newThread(options?: {
            thread?: string;
        }): Promise<void>;
        onMessage(handler: (event: import("./chat").ChatEvent) => void): () => void;
        setContext(next: import("./chat").ChatContext | null): void;
        mount(element: HTMLElement, options?: import("./chat").ChatOptions): void;
        unmount(): void;
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
