import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const OPENTARGETS_BASE = "https://api.platform.opentargets.org/api/v4/graphql";
const NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

async function otQuery(query: string, variables: Record<string, any> = {}) {
    const res = await fetch(OPENTARGETS_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) throw new Error(`OpenTargets GraphQL error: ${res.statusText}`);
    const data = await res.json() as Record<string, any>;
    if (data.errors) throw new Error(`GraphQL Errors: ${JSON.stringify(data.errors)}`);
    return data.data;
}

async function ncbiFetch(endpoint: string, params: Record<string, string>) {
    const url = new URL(`${NCBI_BASE}/${endpoint}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    // Read optional email/api key from env
    const email = process.env["NCBI_EMAIL"];
    const apiKey = process.env["NCBI_API_KEY"];
    if (email) url.searchParams.set("email", email);
    if (apiKey) url.searchParams.set("api_key", apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`NCBI API error: ${res.statusText}`);
    return res.json();
}

// ─── Utility: Resolve Gene Symbol to Ensembl ID ──────────────────────────

async function resolveTargetId(symbol: string): Promise<string | null> {
    const query = `
        query Search($term: String!) {
          search(queryString: $term, entityNames: ["target"], page: {index: 0, size: 1}) {
            hits { id }
          }
        }
    `;
    const data = await otQuery(query, { term: symbol });
    const hits = data?.search?.hits;
    return hits && hits.length > 0 ? hits[0].id : null;
}

// ─── 1. Validate Target ───────────────────────────────────────────────────

export const validateTarget = createTool({
    id: "ot-validate-target",
    description: "Validates a target by resolving its symbol and fetching metadata/diseases.",
    inputSchema: z.object({
        geneSymbol: z.string().describe("Gene Symbol (e.g. 'EGFR')"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        gene_symbol: z.string(),
        target_id: z.string(),
        top_associations: z.array(z.string()),
    }),
    execute: async (context: any) => {
        const ensemblId = await resolveTargetId(context.geneSymbol);
        if (!ensemblId) throw new Error(`Gene '${context.geneSymbol}' not found in OpenTargets.`);

        const query = `
        query TargetInfo($id: String!) {
          target(ensemblId: $id) {
            id
            approvedSymbol
            associatedDiseases(page: {index: 0, size: 5}) {
              rows {
                disease { name }
                score
              }
            }
          }
        }`;

        const data = await otQuery(query, { id: ensemblId });
        const target = data?.target;
        if (!target) throw new Error(`Target data not found for ID: ${ensemblId}`);

        const rows = target.associatedDiseases?.rows || [];
        const associations = rows.map((r: any) => `${r.disease.name} (Score: ${Number(r.score).toFixed(2)})`);

        return {
            agent: "OpenTargets",
            gene_symbol: context.geneSymbol,
            target_id: ensemblId,
            top_associations: associations,
        };
    },
});

// ─── 2. Get Drug Info ─────────────────────────────────────────────────────

export const getDrugInfo = createTool({
    id: "ot-get-drug-info",
    description: "Get drug information including MoA, indications, and pharmacovigilance.",
    inputSchema: z.object({
        drugId: z.string().describe("ChEMBL Drug ID (e.g. 'CHEMBL1743081')"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        drug_id: z.string(),
        name: z.string().nullable(),
        description: z.string().nullable(),
        max_clinical_phase: z.number().nullable(),
        linked_diseases: z.array(z.string()),
    }),
    execute: async (context: any) => {
        const query = `
        query DrugInfo($id: String!) {
          drug(chemblId: $id) {
            id name description maximumClinicalTrialPhase
            linkedDiseases(page: {index: 0, size: 5}) { rows { name } }
          }
        }`;

        const data = await otQuery(query, { id: context.drugId });
        const drug = data?.drug;
        if (!drug) throw new Error(`Drug not found: ${context.drugId}`);

        const diseases = (drug.linkedDiseases?.rows || []).map((r: any) => r.name);

        return {
            agent: "OpenTargets",
            drug_id: context.drugId,
            name: drug.name ?? null,
            description: drug.description ?? null,
            max_clinical_phase: drug.maximumClinicalTrialPhase ?? null,
            linked_diseases: diseases,
        };
    },
});

// ─── 3. Get Disease Info ──────────────────────────────────────────────────

export const getDiseaseInfo = createTool({
    id: "ot-get-disease-info",
    description: "Get disease information including ontology and known drugs.",
    inputSchema: z.object({
        diseaseId: z.string().describe("Disease EFO ID (e.g. 'EFO_0000685')"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        disease_id: z.string(),
        name: z.string().nullable(),
        description: z.string().nullable(),
        therapeutic_areas: z.array(z.string()),
    }),
    execute: async (context: any) => {
        const query = `
        query DiseaseInfo($id: String!) {
          disease(efoId: $id) {
            id name description
            therapeuticAreas { name }
          }
        }`;

        const data = await otQuery(query, { id: context.diseaseId });
        const disease = data?.disease;
        if (!disease) throw new Error(`Disease not found: ${context.diseaseId}`);

        const areas = (disease.therapeuticAreas || []).map((t: any) => t.name);

        return {
            agent: "OpenTargets",
            disease_id: context.diseaseId,
            name: disease.name ?? null,
            description: disease.description ?? null,
            therapeutic_areas: areas,
        };
    },
});

// ─── 4. NCBI Gene Info ────────────────────────────────────────────────────

export const getNcbiGeneInfo = createTool({
    id: "ncbi-get-gene-info",
    description: "Get structured gene info from NCBI Gene database.",
    inputSchema: z.object({
        geneSymbol: z.string().describe("Gene Symbol (e.g. 'BRCA1')"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        gene_id: z.string(),
        symbol: z.string().nullable(),
        description: z.string().nullable(),
    }),
    execute: async (context: any) => {
        // Step 1: Esearch
        const searchData = await ncbiFetch("esearch.fcgi", {
            db: "gene",
            term: `${context.geneSymbol}[Gene Name] AND Homo sapiens[Organism]`,
            retmode: "json"
        });

        const ids = searchData?.esearchresult?.idlist || [];
        if (ids.length === 0) throw new Error(`Gene ${context.geneSymbol} not found in NCBI.`);
        const geneId = ids[0];

        // Step 2: Esummary
        const summaryData = await ncbiFetch("esummary.fcgi", {
            db: "gene",
            id: geneId,
            retmode: "json"
        });

        const result = summaryData?.result?.[geneId] || {};

        return {
            agent: "OpenTargets/NCBI",
            gene_id: geneId,
            symbol: result.name ?? null,
            description: result.description ?? null,
        };
    },
});

// ─── 5. NCBI Protein Info ─────────────────────────────────────────────────

export const getNcbiProteinInfo = createTool({
    id: "ncbi-get-protein-info",
    description: "Get protein info from NCBI Protein database.",
    inputSchema: z.object({
        proteinId: z.string().describe("Protein Accession (e.g. 'NP_000483')"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        protein_id: z.string(),
        title: z.string().nullable(),
        organism: z.string().nullable(),
    }),
    execute: async (context: any) => {
        const data = await ncbiFetch("esummary.fcgi", {
            db: "protein",
            id: context.proteinId,
            retmode: "json"
        });

        const result = data?.result?.[context.proteinId];
        if (!result) throw new Error(`Protein ${context.proteinId} not found in NCBI.`);

        return {
            agent: "OpenTargets/NCBI",
            protein_id: context.proteinId,
            title: result.title ?? null,
            organism: result.organism ?? null,
        };
    },
});
