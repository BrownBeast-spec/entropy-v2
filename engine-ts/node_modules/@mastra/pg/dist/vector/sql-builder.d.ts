import type { PGVectorFilter } from './filter.js';
interface FilterResult {
    sql: string;
    values: any[];
}
/**
 * Build a filter query for DELETE operations (no minScore/topK parameters)
 */
export declare function buildDeleteFilterQuery(filter: PGVectorFilter): FilterResult;
export declare function buildFilterQuery(filter: PGVectorFilter, minScore: number, topK: number): FilterResult;
export {};
//# sourceMappingURL=sql-builder.d.ts.map