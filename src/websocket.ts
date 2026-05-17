/**
 * nebo.WebSocket — mirrors native WebSocket, auto-connects to /ws/app/{id}.
 *
 * Includes automatic reconnection with exponential backoff.
 */

import { getAppId, getBaseUrl } from './config';

export class NeboWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private _closed = false;

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(_path?: string) {
    const appId = getAppId();
    const base = getBaseUrl();
    const wsBase = base.replace(/^http/, 'ws');
    this.url = `${wsBase}/ws/app/${appId}`;
    this.connect();
  }

  private connect(): void {
    if (this._closed) return;

    this.ws = new WebSocket(this.url);

    this.ws.onopen = (e) => {
      this.reconnectDelay = 1000;
      this.onopen?.(e);
    };

    this.ws.onmessage = (e) => this.onmessage?.(e);
    this.ws.onerror = (e) => this.onerror?.(e);

    this.ws.onclose = (e) => {
      this.onclose?.(e);
      if (!this._closed) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this._closed) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  send(data: string | ArrayBuffer | Blob): void {
    this.ws?.send(data);
  }

  close(code?: number, reason?: string): void {
    this._closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close(code, reason);
  }
}
