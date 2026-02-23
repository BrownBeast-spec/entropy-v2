import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { google } from "@ai-sdk/google";

import { validateTarget, getDiseaseInfo } from "../tools/opentargets.js";
import { getGeneInfo, getVariation, getHomology } from "../tools/ensembl.js";

export const biologistAgent = new Agent({
    id: "biologist-researcher",
    name: "Biologist Researcher",
    memory: new Memory(),
    instructions: `You are a molecular biologist specializing in target validation.
Given a gene symbol or disease, use your tools to:
1. Validate the target using Open Targets.
2. Retrieve genomic sequences and variants from Ensembl.
3. Summarize the target's druggability, key pathways, and disease associations.
Return a structured scientific summary in Markdown.`,
    model: google("gemini-2.5-flash"),
    tools: {
        validate_target: validateTarget,
        get_disease_info: getDiseaseInfo,
        get_gene_info: getGeneInfo,
        get_variation: getVariation,
        get_homology: getHomology
    }
});
