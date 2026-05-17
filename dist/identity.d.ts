/**
 * nebo.identity — expose agent context (name, persona, skills, inputs) to apps.
 */
export interface AgentIdentity {
    id: string;
    name: string;
    displayName: string;
    description: string;
    persona: string;
    model: string;
    skills: string[];
    inputValues: Record<string, unknown>;
}
export declare const identity: {
    get(): Promise<AgentIdentity>;
    invalidate(): void;
};
