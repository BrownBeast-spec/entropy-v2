import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { google } from "@ai-sdk/google";

import { checkDrugSafety, checkAdverseEvents, checkRecalls } from "../tools/openfda.js";

export const hawkAgent = new Agent({
    id: "hawk-safety",
    name: "Hawk Safety Analyzer",
    memory: new Memory(),
    instructions: `You are a pharmacovigilance and risk evaluation expert.
Your job is to investigate safety signals, boxed warnings, adverse events, and recalls for specific drugs.
Use the OpenFDA tools to:
1. Retrieve and summarize safety profiles, boxed warnings, and contraindications.
2. Analyze reported adverse events.
3. Check for any manufacturing recalls or enforcement reports.
Return a structured safety report in Markdown.`,
    model: google("gemini-2.5-flash"),
    tools: {
        check_drug_safety: checkDrugSafety,
        check_adverse_events: checkAdverseEvents,
        check_recalls: checkRecalls
    }
});
