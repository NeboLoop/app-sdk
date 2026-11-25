/**
 * nebo.listen — hear the owner. Nebo opens the microphone on the screen the
 * page is open on, shows him that it is listening, and sends the page his
 * words as he speaks. The page never opens a microphone itself, and the
 * browser's own speech recognition is not used. The desktop app and a
 * browser listen today; where no screen can, `onState` ends `stopped`.
 *
 * The app's manifest asks for it with the `voice:listen` permission.
 *
 *   await nebo.listen.start({
 *     onWords: (heard) => { if (heard.final) follow(heard.text); },
 *     onState: (state) => setListening(state === 'listening'),
 *   });
 *   …
 *   await nebo.listen.stop();
 */
/** Words for one span of what was said. */
export interface Heard {
    text: string;
    /** Where the span starts and ends, seconds from the start of listening. */
    start: number;
    end: number;
    /** A partial (`false`) is replaced by the next one for its span; a final stays, punctuated. */
    final: boolean;
}
/** `starting` until the microphone is open, then `listening`, then `stopped`. */
export type ListenState = 'starting' | 'listening' | 'stopped';
export interface ListenOptions {
    onWords: (heard: Heard) => void;
    /** `reason` comes with `stopped` when Nebo could not listen, in plain words. */
    onState?: (state: ListenState, reason?: string) => void;
}
export declare const listen: {
    /**
     * Ask Nebo to listen. Resolves once Nebo has the request; `onState` says
     * when the microphone is open. Throws when the app may not listen.
     */
    start(options: ListenOptions): Promise<void>;
    /** Stop listening. */
    stop(): Promise<void>;
};
