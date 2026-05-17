/**
 * nebo.surfaces — agent-to-app surface events.
 *
 * Lets apps receive structured UI updates from their agent over WebSocket.
 * The agent pushes events; the app decides how to render them using its own
 * framework (React, Svelte, Vue, etc.).
 *
 * This bridges A2UI/AG-UI concepts into the app SDK without requiring
 * apps to use Nebo's component library. Apps subscribe to events and
 * render however they want.
 *
 * Event types follow the AG-UI protocol where applicable:
 * - State events (snapshot, delta) for shared agent↔app state
 * - Text events (start, content, end) for streaming responses
 * - Tool events for visibility into agent tool execution
 * - Surface events for A2UI component updates
 * - Custom events for app-specific communication
 */
/** Base event — all events carry a type and optional timestamp. */
export interface SurfaceEvent {
    type: string;
    timestamp?: string;
    [key: string]: unknown;
}
/** Agent run lifecycle */
export interface RunStartedEvent extends SurfaceEvent {
    type: 'run_started';
    runId: string;
    threadId?: string;
}
export interface RunFinishedEvent extends SurfaceEvent {
    type: 'run_finished';
    runId: string;
}
export interface RunErrorEvent extends SurfaceEvent {
    type: 'run_error';
    runId: string;
    message: string;
    code?: string;
}
/** Streaming text from agent */
export interface TextStartEvent extends SurfaceEvent {
    type: 'text_start';
    messageId: string;
}
export interface TextContentEvent extends SurfaceEvent {
    type: 'text_content';
    messageId: string;
    delta: string;
}
export interface TextEndEvent extends SurfaceEvent {
    type: 'text_end';
    messageId: string;
}
/** Tool execution visibility */
export interface ToolCallStartEvent extends SurfaceEvent {
    type: 'tool_call_start';
    toolCallId: string;
    toolName: string;
}
export interface ToolCallEndEvent extends SurfaceEvent {
    type: 'tool_call_end';
    toolCallId: string;
    result?: unknown;
}
/** State management — shared agent↔app state */
export interface StateSnapshotEvent extends SurfaceEvent {
    type: 'state_snapshot';
    snapshot: Record<string, unknown>;
}
export interface StateDeltaEvent extends SurfaceEvent {
    type: 'state_delta';
    /** RFC 6902 JSON Patch operations */
    delta: Array<{
        op: 'add' | 'replace' | 'remove' | 'move' | 'copy' | 'test';
        path: string;
        value?: unknown;
        from?: string;
    }>;
}
/** A2UI surface updates — agent pushes component trees */
export interface SurfaceCreateEvent extends SurfaceEvent {
    type: 'surface_create';
    surfaceId: string;
    components: unknown[];
    data?: Record<string, unknown>;
}
export interface SurfaceUpdateEvent extends SurfaceEvent {
    type: 'surface_update';
    surfaceId: string;
    components?: unknown[];
    data?: Record<string, unknown>;
}
export interface SurfaceDeleteEvent extends SurfaceEvent {
    type: 'surface_delete';
    surfaceId: string;
}
/** Data model update (partial update to a surface's data) */
export interface DataUpdateEvent extends SurfaceEvent {
    type: 'data_update';
    surfaceId?: string;
    path?: string;
    value: unknown;
}
/** Custom app-specific events */
export interface CustomEvent extends SurfaceEvent {
    type: 'custom';
    name: string;
    value: unknown;
}
export type NeboSurfaceEvent = RunStartedEvent | RunFinishedEvent | RunErrorEvent | TextStartEvent | TextContentEvent | TextEndEvent | ToolCallStartEvent | ToolCallEndEvent | StateSnapshotEvent | StateDeltaEvent | SurfaceCreateEvent | SurfaceUpdateEvent | SurfaceDeleteEvent | DataUpdateEvent | CustomEvent | SurfaceEvent;
export interface SurfaceEventMap {
    run_started: RunStartedEvent;
    run_finished: RunFinishedEvent;
    run_error: RunErrorEvent;
    text_start: TextStartEvent;
    text_content: TextContentEvent;
    text_end: TextEndEvent;
    tool_call_start: ToolCallStartEvent;
    tool_call_end: ToolCallEndEvent;
    state_snapshot: StateSnapshotEvent;
    state_delta: StateDeltaEvent;
    surface_create: SurfaceCreateEvent;
    surface_update: SurfaceUpdateEvent;
    surface_delete: SurfaceDeleteEvent;
    data_update: DataUpdateEvent;
    custom: CustomEvent;
    '*': NeboSurfaceEvent;
}
type EventHandler<T> = (event: T) => void;
/**
 * Manages the WebSocket connection for agent↔app surface events.
 * Uses NeboWebSocket for connection management and auto-reconnect.
 *
 * Usage:
 * ```ts
 * const surfaces = new NeboSurfaces();
 * surfaces.connect();
 *
 * // Listen for streaming text from agent
 * surfaces.on('text_content', (e) => {
 *   output.textContent += e.delta;
 * });
 *
 * // Listen for state snapshots
 * surfaces.on('state_snapshot', (e) => {
 *   appState = e.snapshot;
 *   rerender();
 * });
 *
 * // Listen for all events
 * surfaces.on('*', (e) => console.log('event:', e));
 *
 * // Send action to agent
 * surfaces.send('button_click', { buttonId: 'analyze' });
 * ```
 */
export declare class NeboSurfaces {
    private ws;
    private listeners;
    private _connected;
    /** @internal A2UI message handler — set by NeboSDK to forward a2ui_message events */
    _a2uiHandler: ((message: unknown) => void) | null;
    /** Current shared state (updated by state_snapshot and state_delta events) */
    state: Record<string, unknown>;
    /** Whether the WebSocket is connected */
    get connected(): boolean;
    /** Connect to the app's surface WebSocket */
    connect(): void;
    /** Disconnect and stop reconnecting */
    disconnect(): void;
    /** Subscribe to a specific event type (or '*' for all) */
    on<K extends keyof SurfaceEventMap>(type: K, handler: EventHandler<SurfaceEventMap[K]>): () => void;
    /** Remove a specific listener */
    off<K extends keyof SurfaceEventMap>(type: K, handler: EventHandler<SurfaceEventMap[K]>): void;
    /** Send an action/event to the agent */
    send(name: string, payload?: Record<string, unknown>): void;
    /** Request a state snapshot from the agent */
    requestState(): void;
    /** @internal Send raw data through the WebSocket (used by a2ui module) */
    _rawSend(data: string): void;
    private handleEvent;
    private applyDelta;
    private resolveParent;
}
/** Singleton instance */
export declare const surfaces: NeboSurfaces;
export {};
