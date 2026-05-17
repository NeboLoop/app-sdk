/**
 * nebo.WebSocket — mirrors native WebSocket, auto-connects to /ws/app/{id}.
 *
 * Includes automatic reconnection with exponential backoff.
 */
export declare class NeboWebSocket {
    private ws;
    private url;
    private reconnectTimer;
    private reconnectDelay;
    private maxReconnectDelay;
    private _closed;
    onopen: ((event: Event) => void) | null;
    onmessage: ((event: MessageEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    onclose: ((event: CloseEvent) => void) | null;
    constructor(_path?: string);
    private connect;
    private scheduleReconnect;
    get readyState(): number;
    send(data: string | ArrayBuffer | Blob): void;
    close(code?: number, reason?: string): void;
}
