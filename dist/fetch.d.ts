/**
 * nebo.fetch() — mirrors native fetch() with auto-routing.
 *
 * Relative URLs → /apps/{id}/api/... (sidecar proxy)
 * Absolute external URLs → /apps/{id}/http/proxy (CORS-free outbound)
 */
export declare function neboFetch(input: string, init?: RequestInit): Promise<Response>;
