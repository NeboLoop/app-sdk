/**
 * nebo.storage — mirrors localStorage API with server-persisted async KV.
 */
export declare const storage: {
    getItem(key: string): Promise<unknown | null>;
    setItem(key: string, value: unknown): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
};
