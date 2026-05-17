/**
 * nebo.a2ui — bridge between Nebo's WebSocket transport and @a2ui/web_core.
 *
 * The SDK handles:
 * - Receiving A2UI v0.9 messages from the backend WebSocket
 * - Feeding them to the processor via processMessages()
 * - Sending actions back to the agent via the WebSocket
 *
 * Usage (React example):
 *
 *   import { nebo } from '@neboai/app-sdk';
 *   import { MessageProcessor } from '@a2ui/web_core/v0_9';
 *   import { basicCatalog } from '@a2ui/react/v0_9';
 *   import { A2uiSurface } from '@a2ui/react/v0_9';
 *
 *   const processor = new MessageProcessor([basicCatalog]);
 *   nebo.a2ui.init(processor);
 *   nebo.surfaces.connect();
 */
import type { A2uiMessage, A2uiMessageListWrapper } from '@a2ui/web_core/v0_9';
/** Structural type for @a2ui/web_core MessageProcessor — matches processMessages signature exactly. */
export interface A2UIMessageProcessor {
    processMessages(messages: A2uiMessage[] | A2uiMessageListWrapper): void;
}
export declare class NeboA2UI {
    private processor;
    private sendFn;
    /**
     * Initialize with a @a2ui/web_core MessageProcessor.
     * Call before nebo.surfaces.connect().
     */
    init(processor: A2UIMessageProcessor): void;
    /** Whether a processor has been initialized */
    get initialized(): boolean;
    /**
     * @internal Called by surfaces module when an a2ui_message arrives.
     */
    _handleMessage(message: unknown): void;
    /**
     * @internal Called by SDK to provide WebSocket send capability.
     */
    _setSendFn(fn: (data: string) => void): void;
    /**
     * Send a v0.9 client action back to the agent.
     */
    sendAction(surfaceId: string, action: Record<string, unknown>): void;
    /**
     * Send a v0.9 client error report back to the agent.
     */
    sendError(surfaceId: string, code: string, message: string, path?: string): void;
}
export declare const a2ui: NeboA2UI;
