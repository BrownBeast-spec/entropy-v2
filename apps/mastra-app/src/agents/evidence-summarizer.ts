import { Agent } from "@mastra/core/agent";
import { getModelForAgent } from "../lib/llm.js";

export const evidenceSummarizerAgent = new Agent({
  id: "evidence-summarizer",
  name: "Evidence Summarizer Agent",
  instructions: `You write concise biomedical evidence summaries grounded strictly in provided results.

Rules:
1. Never add facts not present in input.
2. Prioritize high-signal findings first.
3. Keep language plain, precise, and verifiable.
4. Every claim must be supportable by at least one cited result.
5. Return only fields required by the output schema.`,
  model: getModelForAgent("evidence-summarizer"),
});
