import pg from "pg";
import { createHash } from "node:crypto";
const { Pool } = pg;
/** Default TTLs per tool/data source (in seconds) */
export const DEFAULT_TTL = {
    // Biology tools - data changes infrequently
    search_targets: 86400, // 24h
    get_target_info: 86400,
    get_drug_info: 86400,
    get_associations: 86400,
    search_genes: 86400,
    get_gene_info: 86400,
    get_variants: 86400,
    get_homology: 86400,
    get_regulatory_features: 86400,
    get_sequence: 86400,
    search_proteins: 86400,
    get_protein_info: 86400,
    get_protein_function: 86400,
    // Clinical tools - moderate update frequency
    search_studies: 43200, // 12h
    get_study_details: 43200,
    get_eligibility_criteria: 43200,
    search_literature: 43200,
    search_preprints: 21600, // 6h (preprints update faster)
    get_abstract: 86400,
    get_paper_metadata: 86400,
    // Safety tools - FDA data updates weekly
    search_adverse_events: 3600, // 1h (conservative for safety)
    get_drug_labels: 86400,
    search_recalls: 3600,
    get_enforcement_details: 3600,
    search_drug_interactions: 43200,
    get_interaction_details: 43200,
    check_interaction_pair: 43200,
};
export class CacheStore {
    pool;
    ownsPool;
    metrics = { hits: 0, misses: 0, evictions: 0 };
    constructor(config) {
        if (config instanceof Pool) {
            this.pool = config;
            this.ownsPool = false;
        }
        else {
            this.pool = new Pool({ connectionString: config.connectionString });
            this.ownsPool = true;
        }
    }
    /** Generate a deterministic cache key from tool name + parameters */
    static generateKey(toolName, parameters) {
        const sortedParams = JSON.stringify(parameters, Object.keys(parameters).sort());
        const hash = createHash("sha256").update(sortedParams).digest("hex");
        return `${toolName}:${hash}`;
    }
    /** Get cached response if not expired */
    async get(toolName, parameters) {
        const key = CacheStore.generateKey(toolName, parameters);
        const result = await this.pool.query(`SELECT * FROM tool_response_cache WHERE cache_key = $1 AND expires_at > NOW()`, [key]);
        if (result.rows.length > 0) {
            this.metrics.hits++;
            return result.rows[0].response;
        }
        this.metrics.misses++;
        return null;
    }
    /** Store response in cache with TTL */
    async set(toolName, parameters, response, ttlSeconds) {
        const key = CacheStore.generateKey(toolName, parameters);
        const ttl = ttlSeconds ?? DEFAULT_TTL[toolName] ?? 3600;
        const paramsHash = createHash("sha256")
            .update(JSON.stringify(parameters, Object.keys(parameters).sort()))
            .digest("hex");
        await this.pool.query(`INSERT INTO tool_response_cache (cache_key, tool_name, parameters_hash, response, ttl_seconds, expires_at)
       VALUES ($1, $2, $3, $4, $5::integer, NOW() + ($5::integer * INTERVAL '1 second'))
       ON CONFLICT (cache_key) DO UPDATE SET
         response = $4,
         ttl_seconds = $5::integer,
         expires_at = NOW() + ($5::integer * INTERVAL '1 second'),
         created_at = NOW()`, [key, toolName, paramsHash, JSON.stringify(response), ttl]);
    }
    /** Invalidate cache for a specific tool + parameters */
    async invalidate(toolName, parameters) {
        const key = CacheStore.generateKey(toolName, parameters);
        await this.pool.query(`DELETE FROM tool_response_cache WHERE cache_key = $1`, [key]);
        this.metrics.evictions++;
    }
    /** Invalidate all cache entries for a specific tool */
    async invalidateByTool(toolName) {
        const result = await this.pool.query(`DELETE FROM tool_response_cache WHERE tool_name = $1`, [toolName]);
        const count = result.rowCount ?? 0;
        this.metrics.evictions += count;
        return count;
    }
    /** Flush all cached entries */
    async flush() {
        const result = await this.pool.query(`DELETE FROM tool_response_cache`);
        const count = result.rowCount ?? 0;
        this.metrics.evictions += count;
        return count;
    }
    /** Remove expired entries */
    async evictExpired() {
        const result = await this.pool.query(`DELETE FROM tool_response_cache WHERE expires_at <= NOW()`);
        const count = result.rowCount ?? 0;
        this.metrics.evictions += count;
        return count;
    }
    /** Get cache metrics */
    getMetrics() {
        return { ...this.metrics };
    }
    /** Reset cache metrics */
    resetMetrics() {
        this.metrics = { hits: 0, misses: 0, evictions: 0 };
    }
    async close() {
        if (this.ownsPool) {
            await this.pool.end();
        }
    }
}
//# sourceMappingURL=cache-store.js.map