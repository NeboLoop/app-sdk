/**
 * nebo.janus — LLM completions through Nebo's Janus gateway.
 */
import type { JanusOptions } from './types';
export declare const janus: {
    complete(options: JanusOptions): Promise<string>;
    stream(options: JanusOptions): AsyncGenerator<string>;
};
