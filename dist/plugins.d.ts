/**
 * nebo.plugins — run a plugin installed on the bot directly, with no AI in
 * the middle. The call is the one the app's employee makes with its
 * `plugin__<slug>` tool (a command and its flags), run by Nebo the same way
 * (the same installed version, account and billing), and its result comes
 * straight back.
 *
 * The app's manifest grants the plugin: `plugin:<slug>` for every command,
 * `plugin:<slug>:<command>` for one. An app installed from the marketplace
 * also needs the owner's OK. A call the app may not make is refused.
 */
/** What a plugin command came to. */
export interface PluginResult {
    /** The plugin succeeded. */
    ok: boolean;
    /** What it printed: the text the employee's tool gets back. */
    output: string;
    /** The files it reported making (its `Result:` lines). */
    files: string[];
}
export interface PluginRunOptions {
    /** Seconds the command may take (default 120, at most 600). */
    timeout?: number;
    /**
     * For long work: called with each line the plugin writes, as it writes
     * it. The command then runs as a job on the bot, and `run` resolves when
     * the job ends.
     */
    onProgress?: (line: string) => void;
}
export declare const plugins: {
    /**
     * Run `command` on the installed plugin `slug`, with `args` as its flags
     * (each key becomes `--key`; objects and lists go as JSON).
     */
    run(slug: string, command: string, args?: Record<string, unknown>, options?: PluginRunOptions): Promise<PluginResult>;
};
