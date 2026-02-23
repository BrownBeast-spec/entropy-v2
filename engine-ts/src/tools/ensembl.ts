import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const BASE_URL = "https://rest.ensembl.org";

async function ensemblFetch(path: string, params: Record<string, string | undefined> = {}) {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
    }

    const res = await fetch(url.toString(), {
        headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`Ensembl API error ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<any>;
}

// ─── 1. Get Gene Info ─────────────────────────────────────────────────────

export const getGeneInfo = createTool({
    id: "ensembl-get-gene-info",
    description: "Lookup gene information by symbol in Ensembl.",
    inputSchema: z.object({
        symbol: z.string().describe("Gene Symbol (e.g. 'BRCA1')"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        source: z.string(),
        id: z.string().nullable(),
        display_name: z.string().nullable(),
        description: z.string().nullable(),
        biotype: z.string().nullable(),
        start: z.number().nullable(),
        end: z.number().nullable(),
    }),
    execute: async (context: any) => {
        const data = await ensemblFetch(`/lookup/symbol/homo_sapiens/${context.symbol}`);
        if (!data) throw new Error(`Gene '${context.symbol}' not found in Ensembl (Human).`);

        return {
            agent: "Ensembl",
            source: "Ensembl",
            id: data.id ?? null,
            display_name: data.display_name ?? null,
            description: data.description ?? null,
            biotype: data.biotype ?? null,
            start: data.start ?? null,
            end: data.end ?? null,
        };
    },
});

// ─── 2. Get Sequence ──────────────────────────────────────────────────────

export const getSequence = createTool({
    id: "ensembl-get-sequence",
    description: "Retrieve genomic sequence by Ensembl ID.",
    inputSchema: z.object({
        geneId: z.string().describe("Ensembl Gene ID (e.g. 'ENSG00000139618')"),
    }),
    outputSchema: z.object({
        id: z.string(),
        sequence: z.string(),
        desc: z.string().nullable(),
    }),
    execute: async (context: any) => {
        const data = await ensemblFetch(`/sequence/id/${context.geneId}`);
        if (!data) throw new Error(`Sequence not found for ID: ${context.geneId}`);

        const seq = data.seq as string;
        return {
            id: context.geneId,
            sequence: seq ? `${seq.substring(0, 500)}...` : "No Sequence",
            desc: data.desc ?? null,
        };
    },
});

// ─── 3. Get Variation ─────────────────────────────────────────────────────

export const getVariation = createTool({
    id: "ensembl-get-variation",
    description: "Get variation information by variant ID (e.g., rs ID).",
    inputSchema: z.object({
        variantId: z.string().describe("Variant identifier (e.g., 'rs56116432')"),
        species: z.string().optional().default("human").describe("Species name"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        variant_id: z.string(),
        name: z.string().nullable(),
        most_severe_consequence: z.string().nullable(),
        minor_allele: z.string().nullable(),
        minor_allele_freq: z.number().nullable(),
    }),
    execute: async (context: any) => {
        const species = context.species || "human";
        const data = await ensemblFetch(`/variation/${species}/${context.variantId}`);

        if (!data) throw new Error(`Variant ${context.variantId} not found`);

        return {
            agent: "Ensembl",
            variant_id: context.variantId,
            name: data.name ?? null,
            most_severe_consequence: data.most_severe_consequence ?? null,
            minor_allele: data.minor_allele ?? null,
            minor_allele_freq: data.minor_allele_freq ?? null,
        };
    },
});

// ─── 4. Get Homology ──────────────────────────────────────────────────────

export const getHomology = createTool({
    id: "ensembl-get-homology",
    description: "Get homology information (orthologs/paralogs) for a gene.",
    inputSchema: z.object({
        geneId: z.string().describe("Ensembl gene ID (e.g. 'ENSG00000139618')"),
        species: z.string().optional().default("human").describe("Source species"),
        targetSpecies: z.string().optional().describe("Filter for specific target species"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        gene_id: z.string(),
        total_homologs: z.number(),
        homologs: z.array(z.object({
            type: z.string().nullable(),
            species: z.string().nullable(),
            identity: z.number().nullable(),
        })),
    }),
    execute: async (context: any) => {
        const params: Record<string, string> = {};
        if (context.targetSpecies) params.target_species = context.targetSpecies;

        const data = await ensemblFetch(`/homology/id/${context.species}/${context.geneId}`, params);
        if (!data?.data?.length) return { agent: "Ensembl", gene_id: context.geneId, total_homologs: 0, homologs: [] };

        const homologies = (data.data[0].homologies || []).slice(0, 10);

        return {
            agent: "Ensembl",
            gene_id: context.geneId,
            total_homologs: homologies.length,
            homologs: homologies.map((h: any) => ({
                type: h.type ?? null,
                species: h.target?.species ?? null,
                identity: h.target?.perc_id ?? null,
            })),
        };
    },
});

// ─── 5. Get Xrefs (Cross References) ──────────────────────────────────────

export const getXrefs = createTool({
    id: "ensembl-get-xrefs",
    description: "Get cross-references for a gene (links to other databases).",
    inputSchema: z.object({
        geneId: z.string().describe("Ensembl gene ID"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        gene_id: z.string(),
        total_xrefs: z.number(),
        databases: z.array(z.string()),
    }),
    execute: async (context: any) => {
        const data = await ensemblFetch(`/xrefs/id/${context.geneId}`);
        if (!data || !Array.isArray(data)) throw new Error(`Gene ${context.geneId} not found for xref lookup`);

        const dbs = new Set<string>();
        for (const xref of data) {
            if (xref.dbname) dbs.add(xref.dbname);
        }

        return {
            agent: "Ensembl",
            gene_id: context.geneId,
            total_xrefs: data.length,
            databases: Array.from(dbs),
        };
    },
});
