import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { stringFetch } from "../utils/string-client.js";

export function registerSTRINGTools(server: McpServer): void {
  // ─── 1. Get Protein-Protein Interactions ──────────────────────────
  server.tool(
    "get_protein_interactions",
    "Get protein-protein interaction network from STRING DB.",
    {
      proteinIds: z
        .string()
        .describe(
          "Protein identifiers (comma-separated, e.g. 'TP53,MDM2' or UniProt IDs)",
        ),
      species: z
        .number()
        .optional()
        .default(9606)
        .describe("NCBI taxonomy ID (default: 9606 for human)"),
      requiredScore: z
        .number()
        .optional()
        .default(400)
        .describe(
          "Minimum interaction score (0-1000, default: 400 = medium confidence)",
        ),
      networkType: z
        .string()
        .optional()
        .default("functional")
        .describe("Network type: 'functional' or 'physical'"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Max number of additional interactors to add"),
    },
    async ({ proteinIds, species, requiredScore, networkType, limit }) => {
      try {
        const response = await stringFetch("json", "network", {
          identifiers: proteinIds,
          species,
          required_score: requiredScore,
          network_type: networkType,
          add_nodes: limit,
        });

        const data = (await response.json()) as Array<{
          stringId_A: string;
          stringId_B: string;
          preferredName_A: string;
          preferredName_B: string;
          ncbiTaxonId: number;
          score: number;
          escore?: number;
          dscore?: number;
          ascore?: number;
        }>;

        const interactions = data.map((interaction) => ({
          protein_a: {
            string_id: interaction.stringId_A,
            name: interaction.preferredName_A,
          },
          protein_b: {
            string_id: interaction.stringId_B,
            name: interaction.preferredName_B,
          },
          combined_score: interaction.score,
          experimental_score: interaction.escore ?? 0,
          database_score: interaction.dscore ?? 0,
          coexpression_score: interaction.ascore ?? 0,
        }));

        // Extract unique proteins
        const proteins = new Map<string, { string_id: string; name: string }>();
        interactions.forEach((int) => {
          proteins.set(int.protein_a.string_id, int.protein_a);
          proteins.set(int.protein_b.string_id, int.protein_b);
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                query_proteins: proteinIds,
                species_id: species,
                min_score: requiredScore,
                network_type: networkType,
                total_interactions: interactions.length,
                unique_proteins: Array.from(proteins.values()),
                interactions,
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
                    : "Error fetching protein interactions",
                note: "STRING DB has rate limits (~1000 req/day). Results should be cached.",
              }),
            },
          ],
        };
      }
    },
  );

  // ─── 2. Get Enriched Functional Annotations ───────────────────────
  server.tool(
    "get_functional_enrichment",
    "Get enriched GO terms, pathways, and disease associations for a protein list.",
    {
      proteinIds: z.string().describe("Protein identifiers (comma-separated)"),
      species: z
        .number()
        .optional()
        .default(9606)
        .describe("NCBI taxonomy ID (default: 9606 for human)"),
    },
    async ({ proteinIds, species }) => {
      try {
        const response = await stringFetch("json", "enrichment", {
          identifiers: proteinIds,
          species,
        });

        const data = (await response.json()) as Array<{
          category: string;
          term: string;
          description: string;
          number_of_genes: number;
          fdr: number;
          inputGenes?: string;
        }>;

        // Group by category
        const grouped = data.reduce(
          (acc, item) => {
            if (!acc[item.category]) {
              acc[item.category] = [];
            }
            acc[item.category].push({
              term: item.term,
              description: item.description,
              gene_count: item.number_of_genes,
              fdr: item.fdr,
              significant: item.fdr < 0.05,
            });
            return acc;
          },
          {} as Record<
            string,
            Array<{
              term: string;
              description: string;
              gene_count: number;
              fdr: number;
              significant: boolean;
            }>
          >,
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                query_proteins: proteinIds,
                species_id: species,
                enrichment_categories: Object.keys(grouped),
                enrichments: grouped,
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
                    : "Error fetching enrichment data",
              }),
            },
          ],
        };
      }
    },
  );

  // ─── 3. Get Protein Information ───────────────────────────────────
  server.tool(
    "get_protein_info",
    "Get detailed information about proteins from STRING DB.",
    {
      proteinIds: z.string().describe("Protein identifiers (comma-separated)"),
      species: z
        .number()
        .optional()
        .default(9606)
        .describe("NCBI taxonomy ID (default: 9606 for human)"),
    },
    async ({ proteinIds, species }) => {
      try {
        const response = await stringFetch("json", "get_string_ids", {
          identifiers: proteinIds,
          species,
        });

        const data = (await response.json()) as Array<{
          stringId: string;
          preferredName: string;
          ncbiTaxonId: number;
          taxonName?: string;
          annotation?: string;
        }>;

        const proteins = data.map((protein) => ({
          string_id: protein.stringId,
          preferred_name: protein.preferredName,
          species_id: protein.ncbiTaxonId,
          species_name: protein.taxonName ?? "Unknown",
          annotation: protein.annotation ?? "No annotation available",
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                query: proteinIds,
                proteins_found: proteins.length,
                proteins,
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
                    : "Error fetching protein info",
              }),
            },
          ],
        };
      }
    },
  );
}
