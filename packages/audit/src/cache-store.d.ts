import pg from "pg";
/** Default TTLs per tool/data source (in seconds) */
export declare const DEFAULT_TTL: Record<string, number>;
export interface CacheEntry {
    id: string;
    cache_key: string;
    tool_name: string;
    parameters_hash: string;
    response: unknown;
    ttl_seconds: number;
    created_at: Date;
    expires_at: Date;
}
export interface CacheMetrics {
    hits: number;
    misses: number;
    evictions: number;
}
export declare class CacheStore {
    private pool;
    private ownsPool;
    private metrics;
    constructor(config: {
        connectionString: string;
    } | pg.Pool);
    /** Generate a deterministic cache key from tool name + parameters */
    static generateKey(toolName: string, parameters: Record<string, unknown>): string;
    /** Get cached response if not expired */
    get(toolName: string, parameters: Record<string, unknown>): Promise<unknown | null>;
    /** Store response in cache with TTL */
    set(toolName: string, parameters: Record<string, unknown>, response: unknown, ttlSeconds?: number): Promise<void>;
    /** Invalidate cache for a specific tool + parameters */
    invalidate(toolName: string, parameters: Record<string, unknown>): Promise<void>;
    /** Invalidate all cache entries for a specific tool */
    invalidateByTool(toolName: string): Promise<number>;
    /** Flush all cached entries */
    flush(): Promise<number>;
    /** Remove expired entries */
    evictExpired(): Promise<number>;
    /** Get cache metrics */
    getMetrics(): CacheMetrics;
    /** Reset cache metrics */
    resetMetrics(): void;
    close(): Promise<void>;
}
//# sourceMappingURL=cache-store.d.ts.map