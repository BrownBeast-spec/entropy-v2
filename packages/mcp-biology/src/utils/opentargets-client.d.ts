export interface GraphQLResponse {
    data?: Record<string, unknown>;
    errors?: Array<{
        message: string;
    }>;
}
export declare function otQuery(query: string, variables?: Record<string, unknown>): Promise<Record<string, unknown>>;
export declare function resolveTargetId(symbol: string): Promise<string | null>;
//# sourceMappingURL=opentargets-client.d.ts.map