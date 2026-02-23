import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const PUBCHEM_DATA_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const PUBCHEM_VIEW_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug_view";
const CHEMBL_URL = "https://www.ebi.ac.uk/chembl/api/data";

async function pubchemFetch(url: string) {
    const res = await fetch(url);
    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`PubChem API error ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<any>;
}

// ─── Utility: Get CID Properties ─────────────────────────────────────────

async function getCidProperties(cid: number) {
    const propsUrl = `${PUBCHEM_DATA_URL}/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,IsomericSMILES,InChIKey,IUPACName/JSON`;
    const data = await pubchemFetch(propsUrl);
    if (!data?.PropertyTable?.Properties?.length) throw new Error(`Properties not found for CID ${cid}`);

    const props = data.PropertyTable.Properties[0];
    return {
        agent: "PubChem",
        cid,
        properties: {
            iupac_name: props.IUPACName ?? null,
            formula: props.MolecularFormula ?? null,
            molecular_weight: props.MolecularWeight ?? null,
            smiles: props.IsomericSMILES ?? null,
            inchikey: props.InChIKey ?? null,
        },
        pubchem_link: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
    };
}

// ─── 1. Get Compound Props (By Name) ──────────────────────────────────────

export const getCompoundProps = createTool({
    id: "pubchem-get-compound-props",
    description: "Get compound properties from PubChem by name.",
    inputSchema: z.object({
        name: z.string().describe("Compound Name (e.g. 'Aspirin')"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        cid: z.number(),
        compound_name: z.string(),
        properties: z.any(),
        pubchem_link: z.string(),
    }),
    execute: async (context: any) => {
        const searchUrl = `${PUBCHEM_DATA_URL}/compound/name/${encodeURIComponent(context.name)}/cids/JSON`;
        const data = await pubchemFetch(searchUrl);
        const cids = data?.IdentifierList?.CID || [];
        if (cids.length === 0) throw new Error(`Compound '${context.name}' not found in PubChem`);

        const cid = cids[0];
        const props = await getCidProperties(cid);
        return { ...props, compound_name: context.name };
    },
});

// ─── 2. Search ChEMBL ─────────────────────────────────────────────────────

export const searchChembl = createTool({
    id: "chembl-search",
    description: "Search for molecules in ChEMBL by name.",
    inputSchema: z.object({
        query: z.string().describe("Molecule name to search (e.g. 'imatinib')"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        source: z.string(),
        query: z.string(),
        found: z.number(),
        molecules: z.array(z.object({
            chembl_id: z.string(),
            name: z.string().nullable(),
            type: z.string().nullable(),
            structure: z.string().nullable(),
        })),
    }),
    execute: async (context: any) => {
        const url = new URL(`${CHEMBL_URL}/molecule`);
        url.searchParams.set("pref_name__icontains", context.query);
        url.searchParams.set("format", "json");
        url.searchParams.set("limit", "5");

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`ChEMBL API error: ${res.statusText}`);

        const data = await res.json() as any;
        const moles = data.molecules || [];

        return {
            agent: "PubChem",
            source: "ChEMBL",
            query: context.query,
            found: moles.length,
            molecules: moles.map((m: any) => ({
                chembl_id: m.molecule_chembl_id,
                name: m.pref_name ?? null,
                type: m.molecule_type ?? null,
                structure: m.molecule_structures?.canonical_smiles ?? null,
            })),
        };
    },
});

// ─── 3. Get Compound by CID ───────────────────────────────────────────────

export const getCompoundByCid = createTool({
    id: "pubchem-get-compound-by-cid",
    description: "Get compound properties directly by PubChem CID.",
    inputSchema: z.object({
        cid: z.number().describe("PubChem Compound ID"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        cid: z.number(),
        properties: z.any(),
        pubchem_link: z.string(),
    }),
    execute: async (context: any) => {
        return await getCidProperties(context.cid);
    },
});

// ─── 4. Get Compound by SMILES ────────────────────────────────────────────

export const getCompoundBySmiles = createTool({
    id: "pubchem-get-compound-by-smiles",
    description: "Get compound information by SMILES structure.",
    inputSchema: z.object({
        smiles: z.string().describe("SMILES string"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        cid: z.number(),
        properties: z.any(),
        pubchem_link: z.string(),
    }),
    execute: async (context: any) => {
        const url = `${PUBCHEM_DATA_URL}/compound/smiles/${encodeURIComponent(context.smiles)}/cids/JSON`;
        const data = await pubchemFetch(url);
        const cids = data?.IdentifierList?.CID || [];
        if (cids.length === 0) throw new Error("No CID found for SMILES");

        return await getCidProperties(cids[0]);
    },
});

// ─── 5. Get Compound by Formula ───────────────────────────────────────────

export const getCompoundByFormula = createTool({
    id: "pubchem-get-compound-by-formula",
    description: "Search compounds by molecular formula.",
    inputSchema: z.object({
        formula: z.string().describe("Molecular formula (e.g. 'C9H8O4')"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        formula: z.string(),
        total_found: z.number(),
        cids: z.array(z.number()),
    }),
    execute: async (context: any) => {
        const url = `${PUBCHEM_DATA_URL}/compound/formula/${context.formula}/cids/JSON`;
        const data = await pubchemFetch(url);
        const cids = data?.IdentifierList?.CID || [];
        if (cids.length === 0) throw new Error(`No compounds found with formula ${context.formula}`);

        return {
            agent: "PubChem",
            formula: context.formula,
            total_found: cids.length,
            cids: cids.slice(0, 5),
        };
    },
});

// ─── 6. Get Bioassays ─────────────────────────────────────────────────────

export const getBioassays = createTool({
    id: "pubchem-get-bioassays",
    description: "Get bioassay data for a compound (IC50, Ki, activity).",
    inputSchema: z.object({
        cid: z.number().describe("PubChem Compound ID"),
        limit: z.number().optional().default(5).describe("Max assays to return"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        cid: z.number(),
        total_assays: z.number(),
        assays: z.array(z.object({
            aid: z.number().nullable(),
            name: z.string().nullable(),
            description: z.string().nullable(),
            activity_outcome: z.string().nullable(),
        })),
    }),
    execute: async (context: any) => {
        const aidsUrl = `${PUBCHEM_DATA_URL}/compound/cid/${context.cid}/aids/JSON`;
        const data = await pubchemFetch(aidsUrl);
        const aidList = data?.InformationList?.Information?.[0]?.AID || [];

        if (aidList.length === 0) {
            return { agent: "PubChem", cid: context.cid, total_assays: 0, assays: [] };
        }

        const assays = [];
        for (const aid of aidList.slice(0, context.limit)) {
            try {
                const assayUrl = `${PUBCHEM_DATA_URL}/assay/aid/${aid}/summary/JSON`;
                const assayData = await pubchemFetch(assayUrl);
                const summary = assayData?.AssaySummaries?.[0];
                if (summary) {
                    assays.push({
                        aid,
                        name: summary.AssayName ?? null,
                        description: (summary.AssayDescription ?? "").substring(0, 200),
                        activity_outcome: summary.ActivityOutcome ?? null,
                    });
                }
            } catch (e) {
                // Ignore individual assay fetch failure
            }
        }

        return {
            agent: "PubChem",
            cid: context.cid,
            total_assays: aidList.length,
            assays,
        };
    },
});
