import type { IndexConfig, IndexType } from './types.js';
import type { PgVector } from '.';
export interface TestResult {
    distribution: string;
    dimension: number;
    type: IndexType;
    size: number;
    k?: number;
    metrics: {
        recall?: number;
        minRecall?: number;
        maxRecall?: number;
        latency?: {
            p50: number;
            p95: number;
            lists?: number;
            vectorsPerList?: number;
            m?: number;
            ef?: number;
        };
        clustering?: {
            numLists?: number;
            avgVectorsPerList?: number;
            recommendedLists?: number;
            distribution?: string;
        };
    };
}
export declare const generateRandomVectors: (count: number, dim: number) => number[][];
export declare const generateClusteredVectors: (count: number, dim: number, numClusters?: number) => number[][];
export declare const generateSkewedVectors: (count: number, dim: number) => number[][];
export declare const findNearestBruteForce: (query: number[], vectors: number[][], k: number) => number[];
export declare const calculateRecall: (actual: number[], expected: number[], k: number) => number;
export declare function cosineSimilarity(a: number[], b: number[]): number;
export declare const formatTable: (data: any[], columns: string[]) => string;
export declare const groupBy: <T, K extends keyof T>(array: T[], key: K | ((item: T) => string), reducer?: (group: T[]) => any) => Record<string, any>;
export declare const calculateTimeout: (dimension: number, size: number, k: number) => number;
export declare const baseTestConfigs: {
    smokeTests: {
        dimension: number;
        size: number;
        k: number;
        queryCount: number;
    }[];
    '64': {
        dimension: number;
        size: number;
        k: number;
        queryCount: number;
    }[];
    '384': {
        dimension: number;
        size: number;
        k: number;
        queryCount: number;
    }[];
    '1024': {
        dimension: number;
        size: number;
        k: number;
        queryCount: number;
    }[];
    stressTests: {
        dimension: number;
        size: number;
        k: number;
        queryCount: number;
    }[];
};
export interface TestConfig {
    dimension: number;
    size: number;
    k: number;
    queryCount: number;
}
export declare function warmupQuery(vectorDB: PgVector, indexName: string, dimension: number, k: number): Promise<void>;
export declare function measureLatency<T>(fn: () => Promise<T>): Promise<[number, T]>;
export declare const getListCount: (indexConfig: IndexConfig, size: number) => number | undefined;
export declare const getHNSWConfig: (indexConfig: IndexConfig) => {
    m: number;
    efConstruction: number;
};
export declare function getSearchEf(k: number, m: number): {
    default: number;
    lower: number;
    higher: number;
};
export declare function getIndexDescription({ type, hnsw, }: {
    type: IndexType;
    hnsw: {
        m: number;
        efConstruction: number;
    };
}): string;
//# sourceMappingURL=performance.helpers.d.ts.map