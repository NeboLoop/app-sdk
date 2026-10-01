/**
 * nebo.decide — typed decisions through the bot: choose one of named
 * options, place on ordered levels, or judge a statement, each answer with
 * probabilities and a confidence, in one fast call. Nothing is generated.
 * Billed to the bot owner's NeboAI account, like nebo.janus.
 */
import type { DecideRequest, Decision } from './types';
export declare function decide(request: DecideRequest): Promise<Decision>;
