import { BaseFilterTranslator } from '@mastra/core/vector/filter';
import type { VectorFilter, OperatorSupport, OperatorValueMap, LogicalOperatorValueMap, BlacklistedRootOperators, VectorFieldValue } from '@mastra/core/vector/filter';
type PGOperatorValueMap = Omit<OperatorValueMap, '$in' | '$all' | '$nin' | '$eq' | '$ne'> & {
    $size: number;
    $contains: VectorFieldValue | Record<string, unknown>;
    $all: VectorFieldValue;
    $in: VectorFieldValue;
    $nin: VectorFieldValue;
    $eq: VectorFieldValue;
    $ne: VectorFieldValue;
};
type PGBlacklisted = BlacklistedRootOperators | '$contains' | '$size';
type PGFilterValue = VectorFieldValue | RegExp;
export type PGVectorFilter = VectorFilter<keyof PGOperatorValueMap, PGOperatorValueMap, LogicalOperatorValueMap, PGBlacklisted, PGFilterValue>;
/**
 * Translates MongoDB-style filters to PG compatible filters.
 *
 * Key differences from MongoDB:
 *
 * Logical Operators ($and, $or, $nor):
 * - Can be used at the top level or nested within fields
 * - Can take either a single condition or an array of conditions
 *
 */
export declare class PGFilterTranslator extends BaseFilterTranslator<PGVectorFilter> {
    protected getSupportedOperators(): OperatorSupport;
    translate(filter?: PGVectorFilter): PGVectorFilter;
    private translateNode;
    private translateRegexPattern;
}
export {};
//# sourceMappingURL=filter.d.ts.map