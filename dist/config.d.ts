/**
 * Auto-detect the app ID and base URL.
 *
 * Production: URL path is /apps/{id}/ui/... → extract id from path.
 * Dev (Vite): <meta name="nebo-app-id" content="my-app"> in index.html.
 */
export declare function getAppId(): string;
export declare function getBaseUrl(): string;
export declare function setAppId(id: string): void;
export declare function setBaseUrl(url: string): void;
