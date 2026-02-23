import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { google } from "@ai-sdk/google";

// Import Native TS Tools
import { validateTarget, getDrugInfo, getDiseaseInfo, getNcbiGeneInfo, getNcbiProteinInfo } from "../tools/opentargets.js";
import { getGeneInfo, getSequence, getVariation, getHomology, getXrefs } from "../tools/ensembl.js";
import { checkDrugSafety, checkAdverseEvents, checkRecalls, getNdcInfo, searchDrugsFda, getDrugShortages } from "../tools/openfda.js";
import { getCompoundProps, searchChembl, getCompoundByCid, getCompoundBySmiles, getCompoundByFormula, getBioassays } from "../tools/pubchem.js";
import { searchLiterature, searchPreprints } from "../tools/pubmed.js";
import { searchStudies } from "../tools/clinical-trials.js";

// Ensure GOOGLE_GENERATIVE_AI_API_KEY is available in .env
export const coPharmaAgent = new Agent({
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
        search_studies: searchStudies,
    }
});
