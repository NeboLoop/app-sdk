/**
 * nebo.storage — mirrors localStorage API with server-persisted async KV.
 *
 * The same store the app's employee reads and writes with its `app_data`
 * tool: same keys, same values. `onChange` hears every write to it, the
 * employee's and other open views'.
 */
/** One change to the app's store (the `app_data_changed` event). */
export interface StorageChange {
    appId: string;
    keys: string[];
    action: 'set' | 'delete';
    /** `employee`: the app's employee wrote it; `page`: an open view did. */
    source: 'employee' | 'page';
}
type ChangeHandler = (change: StorageChange) => void;
export declare const storage: {
    getItem(key: string): Promise<unknown | null>;
    setItem(key: string, value: unknown): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    keys(): Promise<string[]>;
    /**
     * Call `handler` after every change to the store: the employee's writes
     * and other open views'. Returns a function that stops listening.
     */
    onChange(handler: ChangeHandler): () => void;
};
export {};
