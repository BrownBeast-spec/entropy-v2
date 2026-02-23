import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ncbiFetch } from "../utils/ncbi-client.js";

export function registerNcbiTools(server: McpServer): void {
  // ─── 1. NCBI Gene Info ──────────────────────────────────────────────
  server.tool(
    "get_ncbi_gene_info",
    "Search NCBI Gene database by gene symbol, returning gene ID and description.",
    {
      geneSymbol: z.string().describe("Gene Symbol (e.g. 'BRCA1')"),
    },
    async ({ geneSymbol }) => {
      try {
        // Step 1: Esearch
        const searchData = await ncbiFetch("esearch.fcgi", {
          db: "gene",
          term: `${geneSymbol}[Gene Name] AND Homo sapiens[Organism]`,
          retmode: "json",
        });

        const esearchResult = searchData.esearchresult as
          | {
              idlist?: string[];
            }
          | undefined;
        const ids = esearchResult?.idlist ?? [];

        if (ids.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Gene ${geneSymbol} not found in NCBI.`,
                }),
              },
            ],
          };
        }

        const geneId = ids[0];

        // Step 2: Esummary
        const summaryData = await ncbiFetch("esummary.fcgi", {
          db: "gene",
          id: geneId,
          retmode: "json",
        });

        const resultMap = summaryData.result as
          | Record<string, { name?: string; description?: string }>
          | undefined;
        const result = resultMap?.[geneId] ?? {};

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                agent: "NCBI",
                gene_id: geneId,
                symbol: result.name ?? null,
                description: result.description ?? null,
              }),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: `Failed to get NCBI gene info: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 2. NCBI Protein Info ──────────────────────────────────────────
  server.tool(
    "get_ncbi_protein_info",
    "Get protein information from NCBI Protein database by accession.",
    {
      proteinId: z.string().describe("Protein Accession (e.g. 'NP_000483')"),
    },
    async ({ proteinId }) => {
      try {
        const data = await ncbiFetch("esummary.fcgi", {
          db: "protein",
          id: proteinId,
          retmode: "json",
        });

        const resultMap = data.result as
          | Record<string, { title?: string; organism?: string }>
          | undefined;
        const result = resultMap?.[proteinId];

        if (!result) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Protein ${proteinId} not found in NCBI.`,
                }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                agent: "NCBI",
                protein_id: proteinId,
                title: result.title ?? null,
                organism: result.organism ?? null,
              }),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: `Failed to get NCBI protein info: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
