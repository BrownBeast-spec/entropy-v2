import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { google } from "@ai-sdk/google";

import { searchStudies } from "../tools/clinical-trials.js";
import { searchLiterature } from "../tools/pubmed.js";

export const clinicalScoutAgent = new Agent({
    id: "clinical-scout",
    name: "Clinical Scout",
    memory: new Memory(),
    instructions: `You are a clinical trial design expert and scout.
Your job is to investigate existing and past clinical trials for specific drugs and indications.
Use the ClinicalTrials and PubMed tools to:
1. Find relevant clinical trials and summarize their endpoints, patient populations, and statuses.
2. Search recent literature for clinical outcomes.
Return a structured clinical summary in Markdown.`,
    model: google("gemini-2.5-flash"),
    tools: {
        search_studies: searchStudies,
        search_literature: searchLiterature
    }
});
