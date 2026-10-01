export interface AgentResponse {
    text: string;
    tools?: Array<{
        name: string;
        result: unknown;
    }>;
}
export interface InvokeOptions {
    agent?: string;
    data?: Record<string, unknown>;
}
export interface JanusMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export interface JanusOptions {
    messages: JanusMessage[];
    model?: string;
    max_tokens?: number;
}
export interface StreamChunk {
    text: string;
    done: boolean;
}
/** One typed question; its answer comes back under the name it was asked by. */
export type DecideQuestion = 
/** One of the named options (2–255): `{ option: description }`. Add an escape option (`other`) when the set is not exhaustive. */
{
    type: 'choice';
    instructions: string;
    criteria: Record<string, string>;
}
/** A position on 2–10 ordered levels, lowest first. */
 | {
    type: 'score';
    instructions: string;
    criteria: string[];
}
/** A statement to judge true or false. */
 | {
    type: 'noul';
    instructions: string;
};
export interface DecideRequest {
    /** What the questions are about: text or any JSON (a record, a list of records). */
    state: unknown;
    questions: Record<string, DecideQuestion>;
}
export interface DecideAnswer {
    type: 'choice' | 'score' | 'noul';
    /** choice: the option picked. */
    choice?: string;
    /** score: fractional position, 0.0 = the first level. */
    score?: number;
    /** noul: the probability the statement holds. */
    noul?: number;
    /** choice and score: 0 to 1. */
    confidence?: number;
    probabilities: Record<string, number>;
}
export interface Decision {
    /** The versioned model that answered. */
    model: string;
    answers: Record<string, DecideAnswer>;
    usage: {
        input_tokens: number;
        output_tokens: number;
        cost_micro: number;
    };
}
