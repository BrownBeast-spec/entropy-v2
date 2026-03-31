import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { europePMCFetch } from "../utils/europepmc-client.js";

export function registerEuropePMCTools(server: McpServer): void {
  // ─── 1. Search Preprints and Literature ───────────────────────────
  server.tool(
    "search_europepmc",
    "Search Europe PMC for preprints, papers, and full-text articles. Includes bioRxiv, medRxiv, and PMC content.",
    {
      query: z
        .string()
        .describe("Search query (e.g. 'alzheimer AND biomarkers')"),
      limit: z.number().optional().default(10).describe("Max results (1-100)"),
      includePreprints: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include preprints from bioRxiv/medRxiv"),
    },
    async ({ query, limit, includePreprints }) => {
      try {
        // Build query with source filters
        let searchQuery = query;
        if (includePreprints) {
          searchQuery = `${query} AND (SRC:PPR OR SRC:PMC OR SRC:MED)`;
        }

        const response = await europePMCFetch("search", {
          query: searchQuery,
          format: "json",
          resultType: "core",
          pageSize: Math.min(limit, 100),
        });

        const data = (await response.json()) as {
          resultList?: {
            result?: Array<{
              id: string;
              source: string;
              pmid?: string;
              pmcid?: string;
              doi?: string;
              title: string;
              authorString?: string;
              journalTitle?: string;
              pubYear?: string;
              abstractText?: string;
              isOpenAccess?: string;
              hasFullText?: string;
              fullTextUrlList?: {
                fullTextUrl?: Array<{
                  url: string;
                  documentStyle: string;
                }>;
              };
            }>;
          };
          hitCount?: number;
        };

        const results = data.resultList?.result ?? [];
        const total = data.hitCount ?? 0;

        const papers = results.map((article) => ({
          id: article.pmid ?? article.pmcid ?? article.id,
          source: article.source,
          title: article.title,
          authors: article.authorString ?? "Unknown",
          journal: article.journalTitle ?? "Unknown",
          year: article.pubYear ?? "Unknown",
          doi: article.doi ?? null,
          abstract: article.abstractText
            ? article.abstractText.substring(0, 500) +
              (article.abstractText.length > 500 ? "..." : "")
            : "No abstract available",
          isOpenAccess: article.isOpenAccess === "Y",
          hasFullText: article.hasFullText === "Y",
          fullTextUrls:
            article.fullTextUrlList?.fullTextUrl?.map((u) => u.url) ?? [],
          url: article.doi
            ? `https://doi.org/${article.doi}`
            : `https://europepmc.org/article/${article.source}/${article.id}`,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                query: searchQuery,
                total_found: total,
                results_returned: papers.length,
                papers,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unknown error searching Europe PMC",
              }),
            },
          ],
        };
      }
    },
  );

  // ─── 2. Get Full Text ─────────────────────────────────────────────
  server.tool(
    "get_fulltext_europepmc",
    "Retrieve full-text content from Europe PMC for open access articles.",
    {
      pmcid: z.string().describe("PMC ID (e.g. 'PMC9876543')"),
    },
    async ({ pmcid }) => {
      try {
        // Clean PMCID (remove 'PMC' prefix if included)
        const cleanId = pmcid.replace(/^PMC/, "");

        const response = await europePMCFetch(`${cleanId}/fullTextXML`, {});
        const xmlText = await response.text();

        // Return the XML content (caller can parse as needed)
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                pmcid: `PMC${cleanId}`,
                format: "xml",
                fulltext: xmlText.substring(0, 10000), // Limit to first 10KB for MCP response
                note:
                  xmlText.length > 10000
                    ? "Full text truncated. Use Europe PMC API directly for complete content."
                    : null,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Error fetching full text",
                note: "Full text may only be available for open access articles in PMC",
              }),
            },
          ],
        };
      }
    },
  );

  // ─── 3. Get Citations ─────────────────────────────────────────────
  server.tool(
    "get_citations_europepmc",
    "Get citation count and citing articles for a paper.",
    {
      pmid: z.string().optional().describe("PubMed ID"),
      pmcid: z.string().optional().describe("PMC ID"),
      doi: z.string().optional().describe("DOI"),
    },
    async ({ pmid, pmcid, doi }) => {
      try {
        // Build identifier
        let identifier: string;
        let source: string;

        if (pmid) {
          identifier = pmid;
          source = "MED";
        } else if (pmcid) {
          identifier = pmcid.replace(/^PMC/, "");
          source = "PMC";
        } else if (doi) {
          identifier = doi;
          source = "DOI";
        } else {
          throw new Error(
            "Must provide at least one identifier (pmid, pmcid, or doi)",
          );
        }

        const response = await europePMCFetch(
          `${source}/${identifier}/citations`,
          {
            format: "json",
            pageSize: 10,
          },
        );

        const data = (await response.json()) as {
          hitCount?: number;
          citationList?: {
            citation?: Array<{
              id: string;
              source: string;
              title: string;
              authorString?: string;
              pubYear?: string;
            }>;
          };
        };

        const citationCount = data.hitCount ?? 0;
        const citations = data.citationList?.citation ?? [];

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                identifier: `${source}:${identifier}`,
                citation_count: citationCount,
                recent_citations: citations.slice(0, 10).map((c) => ({
                  title: c.title,
                  authors: c.authorString ?? "Unknown",
                  year: c.pubYear ?? "Unknown",
                  id: c.id,
                })),
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Error fetching citations",
              }),
            },
          ],
        };
      }
    },
  );
}
