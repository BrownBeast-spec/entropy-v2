import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ensemblFetch } from "../utils/ensembl-client.js";

export function registerEnsemblTools(server: McpServer): void {
  // ─── 1. Get Gene Info ───────────────────────────────────────────────
  server.tool(
    "get_gene_info",
    "Lookup gene information by symbol in Ensembl (ID, biotype, coordinates).",
    {
      symbol: z.string().describe("Gene Symbol (e.g. 'BRCA1')"),
    },
    async ({ symbol }) => {
      try {
        const data = (await ensemblFetch(
          `/lookup/symbol/homo_sapiens/${symbol}`,
        )) as Record<string, unknown> | null;

        if (!data) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Gene '${symbol}' not found in Ensembl (Human).`,
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
                agent: "Ensembl",
                source: "Ensembl",
                id: (data.id as string) ?? null,
                display_name: (data.display_name as string) ?? null,
                description: (data.description as string) ?? null,
                biotype: (data.biotype as string) ?? null,
                start: (data.start as number) ?? null,
                end: (data.end as number) ?? null,
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
                error: `Failed to get gene info: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 2. Get Sequence ────────────────────────────────────────────────
  server.tool(
    "get_sequence",
    "Retrieve genomic sequence by Ensembl ID (truncated to 500bp).",
    {
      geneId: z.string().describe("Ensembl Gene ID (e.g. 'ENSG00000139618')"),
    },
    async ({ geneId }) => {
      try {
        const data = (await ensemblFetch(`/sequence/id/${geneId}`)) as Record<
          string,
          unknown
        > | null;

        if (!data) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Sequence not found for ID: ${geneId}`,
                }),
              },
            ],
          };
        }

        const seq = data.seq as string | undefined;
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                id: geneId,
                sequence: seq ? `${seq.substring(0, 500)}...` : "No Sequence",
                desc: (data.desc as string) ?? null,
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
                error: `Failed to get sequence: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 3. Get Variation ───────────────────────────────────────────────
  server.tool(
    "get_variation",
    "Get variation information by variant ID (e.g., rs ID) including consequence and allele frequency.",
    {
      variantId: z.string().describe("Variant identifier (e.g., 'rs56116432')"),
      species: z.string().optional().default("human").describe("Species name"),
    },
    async ({ variantId, species }) => {
      try {
        const sp = species || "human";
        const data = (await ensemblFetch(
          `/variation/${sp}/${variantId}`,
        )) as Record<string, unknown> | null;

        if (!data) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Variant ${variantId} not found`,
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
                agent: "Ensembl",
                variant_id: variantId,
                name: (data.name as string) ?? null,
                most_severe_consequence:
                  (data.most_severe_consequence as string) ?? null,
                minor_allele: (data.minor_allele as string) ?? null,
                minor_allele_freq: (data.minor_allele_freq as number) ?? null,
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
                error: `Failed to get variation: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 4. Get Homology ────────────────────────────────────────────────
  server.tool(
    "get_homology",
    "Get orthologs/paralogs (homology information) for a gene.",
    {
      geneId: z.string().describe("Ensembl gene ID (e.g. 'ENSG00000139618')"),
      species: z
        .string()
        .optional()
        .default("human")
        .describe("Source species"),
      targetSpecies: z
        .string()
        .optional()
        .describe("Filter for specific target species"),
    },
    async ({ geneId, species, targetSpecies }) => {
      try {
        const sp = species || "human";
        const params: Record<string, string> = {};
        if (targetSpecies) params.target_species = targetSpecies;

        const data = (await ensemblFetch(
          `/homology/id/${sp}/${geneId}`,
          params,
        )) as { data?: Array<{ homologies?: unknown[] }> } | null;

        if (!data?.data?.length) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  agent: "Ensembl",
                  gene_id: geneId,
                  total_homologs: 0,
                  homologs: [],
                }),
              },
            ],
          };
        }

        const homologies = (
          (data.data[0].homologies as Array<{
            type?: string;
            target?: { species?: string; perc_id?: number };
          }>) ?? []
        ).slice(0, 10);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                agent: "Ensembl",
                gene_id: geneId,
                total_homologs: homologies.length,
                homologs: homologies.map((h) => ({
                  type: h.type ?? null,
                  species: h.target?.species ?? null,
                  identity: h.target?.perc_id ?? null,
                })),
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
                error: `Failed to get homology: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 5. Get Xrefs ──────────────────────────────────────────────────
  server.tool(
    "get_xrefs",
    "Get cross-references for a gene (links to other databases).",
    {
      geneId: z.string().describe("Ensembl gene ID"),
    },
    async ({ geneId }) => {
      try {
        const data = await ensemblFetch(`/xrefs/id/${geneId}`);

        if (!data || !Array.isArray(data)) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Gene ${geneId} not found for xref lookup`,
                }),
              },
            ],
          };
        }

        const dbs = new Set<string>();
        for (const xref of data as Array<{ dbname?: string }>) {
          if (xref.dbname) dbs.add(xref.dbname);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                agent: "Ensembl",
                gene_id: geneId,
                total_xrefs: data.length,
                databases: Array.from(dbs),
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
                error: `Failed to get xrefs: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
