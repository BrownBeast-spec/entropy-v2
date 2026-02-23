import 'dotenv/config';
import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { google } from '@ai-sdk/google';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as xml2js from 'xml2js';
import { createStep, createWorkflow } from '@mastra/core/workflows';

"use strict";
const OPENTARGETS_BASE = "https://api.platform.opentargets.org/api/v4/graphql";
const NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
async function otQuery(query, variables = {}) {
  const res = await fetch(OPENTARGETS_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) throw new Error(`OpenTargets GraphQL error: ${res.statusText}`);
  const data = await res.json();
  if (data.errors) throw new Error(`GraphQL Errors: ${JSON.stringify(data.errors)}`);
  return data.data;
}
async function ncbiFetch$1(endpoint, params) {
  const url = new URL(`${NCBI_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const email = process.env["NCBI_EMAIL"];
  const apiKey = process.env["NCBI_API_KEY"];
  if (email) url.searchParams.set("email", email);
  if (apiKey) url.searchParams.set("api_key", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`NCBI API error: ${res.statusText}`);
  return res.json();
}
async function resolveTargetId(symbol) {
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
const validateTarget = createTool({
  id: "ot-validate-target",
  description: "Validates a target by resolving its symbol and fetching metadata/diseases.",
  inputSchema: z.object({
    geneSymbol: z.string().describe("Gene Symbol (e.g. 'EGFR')")
  }),
  outputSchema: z.object({
    agent: z.string(),
    gene_symbol: z.string(),
    target_id: z.string(),
    top_associations: z.array(z.string())
  }),
  execute: async (context) => {
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
    const associations = rows.map((r) => `${r.disease.name} (Score: ${Number(r.score).toFixed(2)})`);
    return {
      agent: "OpenTargets",
      gene_symbol: context.geneSymbol,
      target_id: ensemblId,
      top_associations: associations
    };
  }
});
const getDrugInfo = createTool({
  id: "ot-get-drug-info",
  description: "Get drug information including MoA, indications, and pharmacovigilance.",
  inputSchema: z.object({
    drugId: z.string().describe("ChEMBL Drug ID (e.g. 'CHEMBL1743081')")
  }),
  outputSchema: z.object({
    agent: z.string(),
    drug_id: z.string(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    max_clinical_phase: z.number().nullable(),
    linked_diseases: z.array(z.string())
  }),
  execute: async (context) => {
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
    const diseases = (drug.linkedDiseases?.rows || []).map((r) => r.name);
    return {
      agent: "OpenTargets",
      drug_id: context.drugId,
      name: drug.name ?? null,
      description: drug.description ?? null,
      max_clinical_phase: drug.maximumClinicalTrialPhase ?? null,
      linked_diseases: diseases
    };
  }
});
const getDiseaseInfo = createTool({
  id: "ot-get-disease-info",
  description: "Get disease information including ontology and known drugs.",
  inputSchema: z.object({
    diseaseId: z.string().describe("Disease EFO ID (e.g. 'EFO_0000685')")
  }),
  outputSchema: z.object({
    agent: z.string(),
    disease_id: z.string(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    therapeutic_areas: z.array(z.string())
  }),
  execute: async (context) => {
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
    const areas = (disease.therapeuticAreas || []).map((t) => t.name);
    return {
      agent: "OpenTargets",
      disease_id: context.diseaseId,
      name: disease.name ?? null,
      description: disease.description ?? null,
      therapeutic_areas: areas
    };
  }
});
const getNcbiGeneInfo = createTool({
  id: "ncbi-get-gene-info",
  description: "Get structured gene info from NCBI Gene database.",
  inputSchema: z.object({
    geneSymbol: z.string().describe("Gene Symbol (e.g. 'BRCA1')")
  }),
  outputSchema: z.object({
    agent: z.string(),
    gene_id: z.string(),
    symbol: z.string().nullable(),
    description: z.string().nullable()
  }),
  execute: async (context) => {
    const searchData = await ncbiFetch$1("esearch.fcgi", {
      db: "gene",
      term: `${context.geneSymbol}[Gene Name] AND Homo sapiens[Organism]`,
      retmode: "json"
    });
    const ids = searchData?.esearchresult?.idlist || [];
    if (ids.length === 0) throw new Error(`Gene ${context.geneSymbol} not found in NCBI.`);
    const geneId = ids[0];
    const summaryData = await ncbiFetch$1("esummary.fcgi", {
      db: "gene",
      id: geneId,
      retmode: "json"
    });
    const result = summaryData?.result?.[geneId] || {};
    return {
      agent: "OpenTargets/NCBI",
      gene_id: geneId,
      symbol: result.name ?? null,
      description: result.description ?? null
    };
  }
});
const getNcbiProteinInfo = createTool({
  id: "ncbi-get-protein-info",
  description: "Get protein info from NCBI Protein database.",
  inputSchema: z.object({
    proteinId: z.string().describe("Protein Accession (e.g. 'NP_000483')")
  }),
  outputSchema: z.object({
    agent: z.string(),
    protein_id: z.string(),
    title: z.string().nullable(),
    organism: z.string().nullable()
  }),
  execute: async (context) => {
    const data = await ncbiFetch$1("esummary.fcgi", {
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
      organism: result.organism ?? null
    };
  }
});

"use strict";
const BASE_URL$2 = "https://rest.ensembl.org";
async function ensemblFetch(path, params = {}) {
  const url = new URL(`${BASE_URL$2}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== void 0) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Ensembl API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}
const getGeneInfo = createTool({
  id: "ensembl-get-gene-info",
  description: "Lookup gene information by symbol in Ensembl.",
  inputSchema: z.object({
    symbol: z.string().describe("Gene Symbol (e.g. 'BRCA1')")
  }),
  outputSchema: z.object({
    agent: z.string(),
    source: z.string(),
    id: z.string().nullable(),
    display_name: z.string().nullable(),
    description: z.string().nullable(),
    biotype: z.string().nullable(),
    start: z.number().nullable(),
    end: z.number().nullable()
  }),
  execute: async (context) => {
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
      end: data.end ?? null
    };
  }
});
const getSequence = createTool({
  id: "ensembl-get-sequence",
  description: "Retrieve genomic sequence by Ensembl ID.",
  inputSchema: z.object({
    geneId: z.string().describe("Ensembl Gene ID (e.g. 'ENSG00000139618')")
  }),
  outputSchema: z.object({
    id: z.string(),
    sequence: z.string(),
    desc: z.string().nullable()
  }),
  execute: async (context) => {
    const data = await ensemblFetch(`/sequence/id/${context.geneId}`);
    if (!data) throw new Error(`Sequence not found for ID: ${context.geneId}`);
    const seq = data.seq;
    return {
      id: context.geneId,
      sequence: seq ? `${seq.substring(0, 500)}...` : "No Sequence",
      desc: data.desc ?? null
    };
  }
});
const getVariation = createTool({
  id: "ensembl-get-variation",
  description: "Get variation information by variant ID (e.g., rs ID).",
  inputSchema: z.object({
    variantId: z.string().describe("Variant identifier (e.g., 'rs56116432')"),
    species: z.string().optional().default("human").describe("Species name")
  }),
  outputSchema: z.object({
    agent: z.string(),
    variant_id: z.string(),
    name: z.string().nullable(),
    most_severe_consequence: z.string().nullable(),
    minor_allele: z.string().nullable(),
    minor_allele_freq: z.number().nullable()
  }),
  execute: async (context) => {
    const species = context.species || "human";
    const data = await ensemblFetch(`/variation/${species}/${context.variantId}`);
    if (!data) throw new Error(`Variant ${context.variantId} not found`);
    return {
      agent: "Ensembl",
      variant_id: context.variantId,
      name: data.name ?? null,
      most_severe_consequence: data.most_severe_consequence ?? null,
      minor_allele: data.minor_allele ?? null,
      minor_allele_freq: data.minor_allele_freq ?? null
    };
  }
});
const getHomology = createTool({
  id: "ensembl-get-homology",
  description: "Get homology information (orthologs/paralogs) for a gene.",
  inputSchema: z.object({
    geneId: z.string().describe("Ensembl gene ID (e.g. 'ENSG00000139618')"),
    species: z.string().optional().default("human").describe("Source species"),
    targetSpecies: z.string().optional().describe("Filter for specific target species")
  }),
  outputSchema: z.object({
    agent: z.string(),
    gene_id: z.string(),
    total_homologs: z.number(),
    homologs: z.array(z.object({
      type: z.string().nullable(),
      species: z.string().nullable(),
      identity: z.number().nullable()
    }))
  }),
  execute: async (context) => {
    const params = {};
    if (context.targetSpecies) params.target_species = context.targetSpecies;
    const data = await ensemblFetch(`/homology/id/${context.species}/${context.geneId}`, params);
    if (!data?.data?.length) return { agent: "Ensembl", gene_id: context.geneId, total_homologs: 0, homologs: [] };
    const homologies = (data.data[0].homologies || []).slice(0, 10);
    return {
      agent: "Ensembl",
      gene_id: context.geneId,
      total_homologs: homologies.length,
      homologs: homologies.map((h) => ({
        type: h.type ?? null,
        species: h.target?.species ?? null,
        identity: h.target?.perc_id ?? null
      }))
    };
  }
});
const getXrefs = createTool({
  id: "ensembl-get-xrefs",
  description: "Get cross-references for a gene (links to other databases).",
  inputSchema: z.object({
    geneId: z.string().describe("Ensembl gene ID")
  }),
  outputSchema: z.object({
    agent: z.string(),
    gene_id: z.string(),
    total_xrefs: z.number(),
    databases: z.array(z.string())
  }),
  execute: async (context) => {
    const data = await ensemblFetch(`/xrefs/id/${context.geneId}`);
    if (!data || !Array.isArray(data)) throw new Error(`Gene ${context.geneId} not found for xref lookup`);
    const dbs = /* @__PURE__ */ new Set();
    for (const xref of data) {
      if (xref.dbname) dbs.add(xref.dbname);
    }
    return {
      agent: "Ensembl",
      gene_id: context.geneId,
      total_xrefs: data.length,
      databases: Array.from(dbs)
    };
  }
});

"use strict";
const BASE_URL$1 = "https://api.fda.gov";
const API_KEY = process.env["OPENFDA_API_KEY"];
function buildUrl(path, params) {
  const url = new URL(`${BASE_URL$1}${path}`);
  if (API_KEY) url.searchParams.set("api_key", API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v !== void 0) url.searchParams.set(k, String(v));
  }
  return url.toString();
}
async function fdaFetch(path, params) {
  const res = await fetch(buildUrl(path, params));
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`OpenFDA API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}
const checkDrugSafety = createTool({
  id: "check-drug-safety",
  description: "Check drug safety including label, boxed warning, contraindications and indications from OpenFDA.",
  inputSchema: z.object({
    drug: z.string().describe("Brand name of the drug (e.g. 'Humira')")
  }),
  outputSchema: z.object({
    drug: z.string(),
    risk_level: z.string(),
    boxed_warning: z.string(),
    contraindications: z.string(),
    indications: z.string(),
    dosage: z.string()
  }),
  execute: async (context) => {
    const data = await fdaFetch("/drug/label.json", {
      search: `openfda.brand_name:${context.drug}`,
      limit: 1
    });
    if (!data || !Array.isArray(data["results"]) || data["results"].length === 0) {
      return { drug: context.drug, risk_level: "Unknown", boxed_warning: "N/A", contraindications: "N/A", indications: "N/A", dosage: "N/A" };
    }
    const r = data["results"][0];
    const getText = (v) => Array.isArray(v) ? v.join(" ").trim() : v ? String(v).trim() : "N/A";
    const boxedWarning = getText(r["boxed_warning"]);
    return {
      drug: context.drug,
      risk_level: boxedWarning !== "N/A" ? "HIGH_RISK" : "Standard",
      boxed_warning: boxedWarning,
      contraindications: getText(r["contraindications"]),
      indications: getText(r["indications_and_usage"]),
      dosage: getText(r["dosage_and_administration_table"] ?? r["dosage_and_administration"])
    };
  }
});
const checkAdverseEvents = createTool({
  id: "check-adverse-events",
  description: "Get the top reported adverse reaction terms for a drug from OpenFDA FAERS.",
  inputSchema: z.object({
    drug: z.string().describe("Drug name (generic or brand)"),
    limit: z.number().optional().default(10).describe("Max number of reactions to return")
  }),
  outputSchema: z.object({
    drug: z.string(),
    top_reactions: z.array(z.object({ reaction: z.string(), count: z.number() }))
  }),
  execute: async (context) => {
    const data = await fdaFetch("/drug/event.json", {
      search: `patient.drug.medicinalproduct:${context.drug}`,
      count: "patient.reaction.reactionmeddrapt.exact",
      limit: context.limit
    });
    const results = data?.["results"] ?? [];
    return {
      drug: context.drug,
      top_reactions: results.map((r) => ({ reaction: r.term, count: r.count }))
    };
  }
});
const checkRecalls = createTool({
  id: "check-recalls",
  description: "Get recent FDA enforcement actions (recalls) for a drug.",
  inputSchema: z.object({
    drug: z.string().describe("Drug name to search enforcement records for")
  }),
  outputSchema: z.object({
    drug: z.string(),
    found: z.number(),
    recalls: z.array(z.object({
      reason: z.string().nullable(),
      status: z.string().nullable(),
      date: z.string().nullable(),
      classification: z.string().nullable()
    }))
  }),
  execute: async (context) => {
    const data = await fdaFetch("/drug/enforcement.json", {
      search: `product_description:${context.drug}`,
      limit: 5,
      sort: "report_date:desc"
    });
    if (!data) return { drug: context.drug, found: 0, recalls: [] };
    const results = data["results"] ?? [];
    return {
      drug: context.drug,
      found: results.length,
      recalls: results.map((r) => ({
        reason: r["reason_for_recall"] ?? null,
        status: r["status"] ?? null,
        date: r["report_date"] ?? null,
        classification: r["classification"] ?? null
      }))
    };
  }
});
const getNdcInfo = createTool({
  id: "get-ndc-info",
  description: "Get National Drug Code (NDC) directory info \u2014 labeler, dosage form, active ingredients.",
  inputSchema: z.object({
    ndc: z.string().describe("NDC code (e.g. '0173-0715')")
  }),
  outputSchema: z.object({
    ndc: z.string(),
    brand_name: z.string().nullable(),
    generic_name: z.string().nullable(),
    labeler_name: z.string().nullable(),
    dosage_form: z.string().nullable(),
    route: z.array(z.string()),
    active_ingredients: z.array(z.unknown())
  }),
  execute: async (context) => {
    const data = await fdaFetch("/drug/ndc.json", {
      search: `product_ndc:${context.ndc}`,
      limit: 1
    });
    if (!data || !Array.isArray(data["results"]) || data["results"].length === 0) {
      return { ndc: context.ndc, brand_name: null, generic_name: null, labeler_name: null, dosage_form: null, route: [], active_ingredients: [] };
    }
    const r = data["results"][0];
    return {
      ndc: context.ndc,
      brand_name: r["brand_name"] ?? null,
      generic_name: r["generic_name"] ?? null,
      labeler_name: r["labeler_name"] ?? null,
      dosage_form: r["dosage_form"] ?? null,
      route: r["route"] ?? [],
      active_ingredients: r["active_ingredients"] ?? []
    };
  }
});
const searchDrugsFda = createTool({
  id: "search-drugs-fda",
  description: "Search the Drugs@FDA database for approved drug products and their regulatory history.",
  inputSchema: z.object({
    query: z.string().describe("Brand or generic drug name to search"),
    limit: z.number().optional().default(10)
  }),
  outputSchema: z.object({
    query: z.string(),
    total_found: z.number(),
    drugs: z.array(z.object({
      application_number: z.string().nullable(),
      sponsor_name: z.string().nullable(),
      brand_name: z.string().nullable(),
      dosage_form: z.string().nullable(),
      marketing_status: z.string().nullable()
    }))
  }),
  execute: async (context) => {
    const data = await fdaFetch("/drug/drugsfda.json", {
      search: `openfda.brand_name:${context.query}`,
      limit: context.limit
    });
    if (!data || !Array.isArray(data["results"])) {
      return { query: context.query, total_found: 0, drugs: [] };
    }
    const drugs = [];
    for (const result of data["results"]) {
      for (const product of result["products"] ?? []) {
        drugs.push({
          application_number: result["application_number"] ?? null,
          sponsor_name: result["sponsor_name"] ?? null,
          brand_name: product["brand_name"] ?? null,
          dosage_form: product["dosage_form"] ?? null,
          marketing_status: product["marketing_status"] ?? null
        });
      }
    }
    return { query: context.query, total_found: drugs.length, drugs };
  }
});
const getDrugShortages = createTool({
  id: "get-drug-shortages",
  description: "Get current FDA drug shortage information, critical for supply chain context.",
  inputSchema: z.object({
    drug: z.string().optional().describe("Drug name to filter by (leave empty for recent shortages)")
  }),
  outputSchema: z.object({
    query: z.string().nullable(),
    total_shortages: z.number(),
    shortages: z.array(z.object({
      product_description: z.string().nullable(),
      status: z.string().nullable(),
      reason: z.array(z.unknown())
    }))
  }),
  execute: async (context) => {
    const params = { limit: 20 };
    if (context.drug) params["search"] = `product_description:${context.drug}`;
    const data = await fdaFetch("/drug/drugshortages.json", params);
    if (!data) return { query: context.drug ?? null, total_shortages: 0, shortages: [] };
    const results = data["results"] ?? [];
    return {
      query: context.drug ?? null,
      total_shortages: results.length,
      shortages: results.map((r) => ({
        product_description: r["product_description"] ?? null,
        status: r["status"] ?? null,
        reason: r["reason"] ?? []
      }))
    };
  }
});

"use strict";
const PUBCHEM_DATA_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const PUBCHEM_VIEW_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug_view";
const CHEMBL_URL = "https://www.ebi.ac.uk/chembl/api/data";
async function pubchemFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`PubChem API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}
async function getCidProperties(cid) {
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
      inchikey: props.InChIKey ?? null
    },
    pubchem_link: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`
  };
}
const getCompoundProps = createTool({
  id: "pubchem-get-compound-props",
  description: "Get compound properties from PubChem by name.",
  inputSchema: z.object({
    name: z.string().describe("Compound Name (e.g. 'Aspirin')")
  }),
  outputSchema: z.object({
    agent: z.string(),
    cid: z.number(),
    compound_name: z.string(),
    properties: z.any(),
    pubchem_link: z.string()
  }),
  execute: async (context) => {
    const searchUrl = `${PUBCHEM_DATA_URL}/compound/name/${encodeURIComponent(context.name)}/cids/JSON`;
    const data = await pubchemFetch(searchUrl);
    const cids = data?.IdentifierList?.CID || [];
    if (cids.length === 0) throw new Error(`Compound '${context.name}' not found in PubChem`);
    const cid = cids[0];
    const props = await getCidProperties(cid);
    return { ...props, compound_name: context.name };
  }
});
const searchChembl = createTool({
  id: "chembl-search",
  description: "Search for molecules in ChEMBL by name.",
  inputSchema: z.object({
    query: z.string().describe("Molecule name to search (e.g. 'imatinib')")
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
      structure: z.string().nullable()
    }))
  }),
  execute: async (context) => {
    const url = new URL(`${CHEMBL_URL}/molecule`);
    url.searchParams.set("pref_name__icontains", context.query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "5");
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`ChEMBL API error: ${res.statusText}`);
    const data = await res.json();
    const moles = data.molecules || [];
    return {
      agent: "PubChem",
      source: "ChEMBL",
      query: context.query,
      found: moles.length,
      molecules: moles.map((m) => ({
        chembl_id: m.molecule_chembl_id,
        name: m.pref_name ?? null,
        type: m.molecule_type ?? null,
        structure: m.molecule_structures?.canonical_smiles ?? null
      }))
    };
  }
});
const getCompoundByCid = createTool({
  id: "pubchem-get-compound-by-cid",
  description: "Get compound properties directly by PubChem CID.",
  inputSchema: z.object({
    cid: z.number().describe("PubChem Compound ID")
  }),
  outputSchema: z.object({
    agent: z.string(),
    cid: z.number(),
    properties: z.any(),
    pubchem_link: z.string()
  }),
  execute: async (context) => {
    return await getCidProperties(context.cid);
  }
});
const getCompoundBySmiles = createTool({
  id: "pubchem-get-compound-by-smiles",
  description: "Get compound information by SMILES structure.",
  inputSchema: z.object({
    smiles: z.string().describe("SMILES string")
  }),
  outputSchema: z.object({
    agent: z.string(),
    cid: z.number(),
    properties: z.any(),
    pubchem_link: z.string()
  }),
  execute: async (context) => {
    const url = `${PUBCHEM_DATA_URL}/compound/smiles/${encodeURIComponent(context.smiles)}/cids/JSON`;
    const data = await pubchemFetch(url);
    const cids = data?.IdentifierList?.CID || [];
    if (cids.length === 0) throw new Error("No CID found for SMILES");
    return await getCidProperties(cids[0]);
  }
});
const getCompoundByFormula = createTool({
  id: "pubchem-get-compound-by-formula",
  description: "Search compounds by molecular formula.",
  inputSchema: z.object({
    formula: z.string().describe("Molecular formula (e.g. 'C9H8O4')")
  }),
  outputSchema: z.object({
    agent: z.string(),
    formula: z.string(),
    total_found: z.number(),
    cids: z.array(z.number())
  }),
  execute: async (context) => {
    const url = `${PUBCHEM_DATA_URL}/compound/formula/${context.formula}/cids/JSON`;
    const data = await pubchemFetch(url);
    const cids = data?.IdentifierList?.CID || [];
    if (cids.length === 0) throw new Error(`No compounds found with formula ${context.formula}`);
    return {
      agent: "PubChem",
      formula: context.formula,
      total_found: cids.length,
      cids: cids.slice(0, 5)
    };
  }
});
const getBioassays = createTool({
  id: "pubchem-get-bioassays",
  description: "Get bioassay data for a compound (IC50, Ki, activity).",
  inputSchema: z.object({
    cid: z.number().describe("PubChem Compound ID"),
    limit: z.number().optional().default(5).describe("Max assays to return")
  }),
  outputSchema: z.object({
    agent: z.string(),
    cid: z.number(),
    total_assays: z.number(),
    assays: z.array(z.object({
      aid: z.number().nullable(),
      name: z.string().nullable(),
      description: z.string().nullable(),
      activity_outcome: z.string().nullable()
    }))
  }),
  execute: async (context) => {
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
            activity_outcome: summary.ActivityOutcome ?? null
          });
        }
      } catch (e) {
      }
    }
    return {
      agent: "PubChem",
      cid: context.cid,
      total_assays: aidList.length,
      assays
    };
  }
});

"use strict";
const SEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const FETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";
async function ncbiFetch(url, params) {
  const finalUrl = new URL(url);
  for (const [k, v] of Object.entries(params)) finalUrl.searchParams.set(k, String(v));
  const email = process.env["NCBI_EMAIL"];
  const apiKey = process.env["NCBI_API_KEY"];
  if (email) finalUrl.searchParams.set("email", email);
  if (apiKey) finalUrl.searchParams.set("api_key", apiKey);
  const res = await fetch(finalUrl.toString());
  if (!res.ok) throw new Error(`NCBI API error: ${res.statusText}`);
  return res;
}
const searchLiterature = createTool({
  id: "pubmed-search-literature",
  description: "Search scientific literature by topic/disease on PubMed.",
  inputSchema: z.object({
    disease: z.string().describe("Topic or disease to search (e.g. 'NSCLC')"),
    year: z.number().optional().default(2024).describe("Publication year"),
    limit: z.number().optional().default(5).describe("Max results")
  }),
  outputSchema: z.object({
    agent: z.string(),
    topic: z.string(),
    total_found: z.string().nullable(),
    top_papers: z.array(z.object({
      id: z.string().nullable(),
      title: z.string().nullable(),
      journal: z.string().nullable(),
      pub_date: z.string().nullable(),
      abstract: z.string().nullable(),
      link: z.string().nullable()
    }))
  }),
  execute: async (context) => {
    const searchRes = await ncbiFetch(SEARCH_URL, {
      db: "pubmed",
      term: `${context.disease}[Title/Abstract] AND ${context.year}[pdat]`,
      retmode: "json",
      retmax: context.limit
    });
    const searchData = await searchRes.json();
    const idList = searchData?.esearchresult?.idlist || [];
    if (idList.length === 0) throw new Error("No papers found.");
    const fetchRes = await ncbiFetch(FETCH_URL, {
      db: "pubmed",
      id: idList.join(","),
      retmode: "xml"
    });
    const xmlText = await fetchRes.text();
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
    const result = await parser.parseStringPromise(xmlText);
    const articles = result.PubmedArticleSet?.PubmedArticle || [];
    const articlesArray = Array.isArray(articles) ? articles : [articles];
    const papers = articlesArray.map((article) => {
      const medlineCitation = article.MedlineCitation;
      const articleData = medlineCitation?.Article;
      const title = typeof articleData?.ArticleTitle === "string" ? articleData.ArticleTitle : articleData?.ArticleTitle?._ || "No Title";
      let fullAbstract = "No Abstract Available.";
      const abstractNode = articleData?.Abstract?.AbstractText;
      if (abstractNode) {
        if (Array.isArray(abstractNode)) {
          fullAbstract = abstractNode.map((node) => {
            const label = node.$?.Label;
            const text = node._ || node;
            return label ? `**${label}:** ${text}` : text;
          }).join("\n\n");
        } else {
          fullAbstract = typeof abstractNode === "string" ? abstractNode : abstractNode._ || "";
        }
      }
      const pmid = typeof medlineCitation?.PMID === "string" ? medlineCitation.PMID : medlineCitation?.PMID?._;
      const journal = articleData?.Journal?.Title || "Unknown Journal";
      const pubDateNode = articleData?.Journal?.JournalIssue?.PubDate;
      let pubDate = "Unknown Date";
      if (pubDateNode) {
        const { Year, Month, Day, MedlineDate } = pubDateNode;
        if (MedlineDate) pubDate = MedlineDate;
        else pubDate = `${Year || ""} ${Month || ""} ${Day || ""}`.trim();
      }
      return {
        id: pmid,
        title,
        journal,
        pub_date: pubDate,
        abstract: fullAbstract,
        link: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : null
      };
    });
    return {
      agent: "PubMed",
      topic: context.disease,
      total_found: searchData?.esearchresult?.count ?? null,
      top_papers: papers
    };
  }
});
const searchPreprints = createTool({
  id: "pubmed-search-preprints",
  description: "Fetch recent preprints from bioRxiv/medRxiv and filter by topic.",
  inputSchema: z.object({
    topic: z.string().describe("Topic to filter by"),
    server: z.string().optional().default("biorxiv").describe("Server to search (biorxiv or medrxiv)"),
    days: z.number().optional().default(30).describe("Days back to search")
  }),
  outputSchema: z.object({
    agent: z.string(),
    source: z.string(),
    topic: z.string(),
    interval: z.string(),
    total_scanned: z.number(),
    matched: z.number(),
    top_papers: z.array(z.object({
      id: z.string().nullable(),
      title: z.string().nullable(),
      date: z.string().nullable(),
      server: z.string().nullable(),
      link: z.string().nullable(),
      abstract: z.string().nullable()
    }))
  }),
  execute: async (context) => {
    const endDate = /* @__PURE__ */ new Date();
    const startDate = /* @__PURE__ */ new Date();
    startDate.setDate(endDate.getDate() - context.days);
    const formatDate = (d) => d.toISOString().split("T")[0];
    const interval = `${formatDate(startDate)}/${formatDate(endDate)}`;
    const res = await fetch(`https://api.biorxiv.org/details/${context.server}/${interval}`);
    if (!res.ok) throw new Error(`Preprint API error: ${res.statusText}`);
    const data = await res.json();
    const collection = data.collection || [];
    const term = context.topic.toLowerCase();
    const matches = [];
    for (const paper of collection) {
      const title = (paper.title || "").toLowerCase();
      const abstract = (paper.abstract || "").toLowerCase();
      if (title.includes(term) || abstract.includes(term)) {
        matches.push({
          id: paper.doi ?? null,
          title: paper.title ?? null,
          date: paper.date ?? null,
          server: context.server,
          link: paper.doi ? `https://doi.org/${paper.doi}` : null,
          abstract: paper.abstract ?? null
        });
      }
    }
    return {
      agent: "PubMed",
      source: context.server,
      topic: context.topic,
      interval,
      total_scanned: collection.length,
      matched: matches.length,
      top_papers: matches.slice(0, 10)
    };
  }
});

"use strict";
const BASE_URL = "https://clinicaltrials.gov/api/v2/studies";
const searchStudies = createTool({
  id: "ct-search-studies",
  description: "Search for clinical trials by term on ClinicalTrials.gov.",
  inputSchema: z.object({
    term: z.string().describe("Search term (e.g. disease, drug name)"),
    limit: z.number().optional().default(10).describe("Max results to return")
  }),
  outputSchema: z.object({
    agent: z.string(),
    query: z.string(),
    total_found: z.number(),
    studies: z.array(z.object({
      nct_id: z.string().nullable(),
      title: z.string().nullable(),
      status: z.string().nullable(),
      phase: z.array(z.string()),
      conditions: z.array(z.string()),
      interventions: z.array(z.string()),
      locations: z.number().nullable()
    }))
  }),
  execute: async (context) => {
    const url = new URL(BASE_URL);
    url.searchParams.set("query.term", context.term);
    url.searchParams.set("pageSize", String(context.limit));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`ClinicalTrials API error: ${res.statusText}`);
    const data = await res.json();
    const studies = data.studies || [];
    const results = studies.map((study) => {
      const protocol = study.protocolSection ?? {};
      const idModule = protocol.identificationModule ?? {};
      const statusModule = protocol.statusModule ?? {};
      const designModule = protocol.designModule ?? {};
      const conditionsModule = protocol.conditionsModule ?? {};
      const interventionsModule = protocol.armsInterventionsModule ?? {};
      const contactsModule = protocol.contactsLocationsModule ?? {};
      return {
        nct_id: idModule.nctId ?? null,
        title: idModule.briefTitle ?? null,
        status: statusModule.overallStatus ?? null,
        phase: designModule.phases ?? [],
        conditions: conditionsModule.conditions ?? [],
        interventions: (interventionsModule.interventions || []).map((i) => i.name),
        locations: contactsModule.locations ? contactsModule.locations.length : 0
      };
    });
    return {
      agent: "ClinicalTrials",
      query: context.term,
      total_found: data.totalCount ?? results.length,
      studies: results
    };
  }
});

"use strict";
const coPharmaAgent = new Agent({
  id: "co-pharma-researcher",
  name: "Co-Pharma Researcher",
  memory: new Memory(),
  instructions: `You are a molecular biologist and pharmaceutical researcher specializing in target validation for drug repurposing.
Given a gene symbol, disease, or drug query, use your tools to:
1. Validate targets using OpenTargets (validateTarget)
2. Retrieve genomic sequences and variants from Ensembl (getGeneInfo, getVariation) 
3. Check drug safety, adverse events, and shortages via OpenFDA (checkDrugSafety, checkAdverseEvents)
4. Find compound properties and bioassays from PubChem/ChEMBL (searchChembl, getBioassays)
5. Search recent literature and preprints via PubMed (searchLiterature, searchPreprints)
6. Check clinical trials via ClinicalTrials.gov (searchStudies)

Synthesize the data across tools. Return a structured markdown or JSON summary as requested.`,
  model: google("gemini-2.5-flash"),
  tools: {
    // OpenTargets
    validate_target: validateTarget,
    get_drug_info: getDrugInfo,
    get_disease_info: getDiseaseInfo,
    get_ncbi_gene: getNcbiGeneInfo,
    get_ncbi_protein: getNcbiProteinInfo,
    // Ensembl
    get_gene_info: getGeneInfo,
    get_sequence: getSequence,
    get_variation: getVariation,
    get_homology: getHomology,
    get_xrefs: getXrefs,
    // OpenFDA
    check_drug_safety: checkDrugSafety,
    check_adverse_events: checkAdverseEvents,
    check_recalls: checkRecalls,
    get_ndc_info: getNdcInfo,
    search_drugs_fda: searchDrugsFda,
    get_drug_shortages: getDrugShortages,
    // PubChem
    get_compound_props: getCompoundProps,
    search_chembl: searchChembl,
    get_compound_by_cid: getCompoundByCid,
    get_compound_by_smiles: getCompoundBySmiles,
    get_compound_by_formula: getCompoundByFormula,
    get_bioassays: getBioassays,
    // PubMed
    search_literature: searchLiterature,
    search_preprints: searchPreprints,
    // Clinical Trials
    search_studies: searchStudies
  }
});

"use strict";
const WorkflowInput = z.object({
  drug_name: z.string(),
  gene_target: z.string(),
  indication: z.string()
});
const gatherBiologyStep = createStep({
  id: "gather-biology",
  inputSchema: WorkflowInput,
  outputSchema: z.object({ biology: z.string(), drug_name: z.string() }),
  execute: async ({ inputData }) => {
    const result = await coPharmaAgent.generate(
      `Validate target ${inputData.gene_target} for ${inputData.indication}`
    );
    return {
      biology: result.text,
      drug_name: inputData.drug_name
    };
  }
});
const gapAnalysisStep = createStep({
  id: "gap-analysis",
  inputSchema: z.object({
    biology: z.string(),
    drug_name: z.string()
  }),
  outputSchema: z.object({
    gaps: z.string(),
    dossier_draft: z.string(),
    biology: z.string()
  }),
  execute: async ({ inputData }) => {
    const dossierDraft = `# Draft Dossier \u2014 ${inputData.drug_name}

## Biologist Findings
${inputData.biology}

## Gaps
- Missing clinical trial data
- Missing safety / adverse-event analysis
`;
    return {
      gaps: "Missing trial and safety data.",
      dossier_draft: dossierDraft,
      biology: inputData.biology
    };
  }
});
const humanReviewStep = createStep({
  id: "human-review",
  inputSchema: z.object({
    dossier_draft: z.string(),
    biology: z.string()
  }),
  outputSchema: z.object({
    approved: z.boolean(),
    reviewer_notes: z.string(),
    dossier_draft: z.string()
  }),
  resumeSchema: z.object({
    approved: z.boolean(),
    notes: z.string().optional()
  }),
  suspendSchema: z.object({
    dossier_preview: z.string()
  }),
  execute: async ({ inputData, resumeData, suspend }) => {
    const { approved, notes } = resumeData ?? {};
    if (!approved) {
      return await suspend({ dossier_preview: inputData.dossier_draft });
    }
    return {
      approved: true,
      reviewer_notes: notes ?? "",
      dossier_draft: inputData.dossier_draft
    };
  }
});
const finalizeDossierStep = createStep({
  id: "finalize-dossier",
  inputSchema: z.object({
    dossier_draft: z.string(),
    approved: z.boolean(),
    reviewer_notes: z.string()
  }),
  outputSchema: z.object({ final_dossier: z.string() }),
  execute: async ({ inputData }) => {
    if (!inputData.approved) {
      throw new Error("Dossier rejected by reviewer");
    }
    const finalDossier = `# Final Approved Dossier

## Reviewer Notes
${inputData.reviewer_notes || "None"}

---

${inputData.dossier_draft}`;
    return { final_dossier: finalDossier };
  }
});
const drugRepurposingWorkflow = createWorkflow({
  id: "drug-repurposing-dossier",
  inputSchema: WorkflowInput,
  outputSchema: z.object({ final_dossier: z.string() })
}).then(gatherBiologyStep).then(gapAnalysisStep).then(humanReviewStep).then(finalizeDossierStep).commit();

"use strict";
const mastra = new Mastra({
  agents: {
    coPharmaAgent
  },
  workflows: {
    drugRepurposingWorkflow
  },
  storage: new LibSQLStore({
    id: "entropy-storage",
    url: "file:./mastra.db"
  })
});

export { mastra };
