/**
 * nebo.share — hand the owner a file to share. The file goes into his Work
 * folder (beside the chat the app is open on), and Nebo opens its own Share
 * dialog on it: he chooses who can open the link (anyone, a password, only
 * him) and when it ends. The page never makes or changes a link itself.
 *
 * The dialog opens only on the device the page is open on: Nebo opens the
 * page with `?client=<id>` (the screen that opened it) beside `?thread=`,
 * and the share names it.
 */
export interface ShareFile {
    /** The file's name with its extension: `Launch deck.html`. */
    name: string;
    /** The file's text (HTML, Markdown, CSV, SVG …). */
    content: string;
}
export interface Shared {
    /** The file's place in Work (`/api/v1/files/…`). */
    artifact: string;
}
export declare function share(file: ShareFile): Promise<Shared>;
