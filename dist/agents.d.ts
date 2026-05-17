/**
 * nebo.agents — invoke and stream agent responses.
 */
import type { AgentResponse, InvokeOptions, StreamChunk } from './types';
export declare const agents: {
    invoke(message: string, options?: InvokeOptions): Promise<AgentResponse>;
    stream(message: string, options?: InvokeOptions): AsyncGenerator<StreamChunk>;
};
