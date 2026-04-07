/**
 * Citation types for strategist dossiers
 */

export type ConfidenceLevel = "verified" | "inferred" | "flagged";

export interface CitationSource {
  name: string; // e.g., "FDA Orange Book"
  url: string; // Live hyperlink to government record
  accessedAt: Date;
  recordId?: string; // e.g., NDA number, patent number
}

export interface CitedFact {
  claim: string; // Description of the claim
  value: string | number; // The actual value/finding
  source: CitationSource;
  confidence: ConfidenceLevel;
}

/**
 * Build a standardized citation for a fact
 */
export function buildCitation(
  claim: string,
  value: string | number,
  sourceName: string,
  sourceUrl: string,
  recordId?: string,
  confidence: ConfidenceLevel = "verified",
): CitedFact {
  return {
    claim,
    value: String(value),
    source: {
      name: sourceName,
      url: sourceUrl,
      accessedAt: new Date(),
      recordId,
    },
    confidence,
  };
}

/**
 * Build multiple citations for cross-source corroboration
 */
export function buildMultiSourceCitation(
  claim: string,
  value: string | number,
  sources: Array<{ name: string; url: string; recordId?: string }>,
): CitedFact[] {
  return sources.map((source) =>
    buildCitation(claim, value, source.name, source.url, source.recordId),
  );
}

/**
 * Flag a citation as needing verification (for conflicting sources)
 */
export function flagForVerification(
  citation: CitedFact,
  reason: string,
): CitedFact {
  return {
    ...citation,
    confidence: "flagged",
    claim: `${citation.claim} (${reason})`,
  };
}

/**
 * Merge citations from multiple sources, flagging conflicts
 */
export function mergeCitations(citations: CitedFact[]): {
  primary: CitedFact;
  conflicts?: CitedFact[];
} {
  if (citations.length === 0) {
    throw new Error("Cannot merge empty citations array");
  }

  if (citations.length === 1) {
    return { primary: citations[0] };
  }

  // Check if all citations agree on the value
  const values = citations.map((c) => String(c.value));
  const uniqueValues = new Set(values);

  if (uniqueValues.size === 1) {
    // All sources agree - return first with verified confidence
    return {
      primary: { ...citations[0], confidence: "verified" },
    };
  }

  // Sources conflict - flag for verification
  const primary = flagForVerification(
    citations[0],
    "Verify - source inconsistency detected",
  );

  return {
    primary,
    conflicts: citations.slice(1),
  };
}
