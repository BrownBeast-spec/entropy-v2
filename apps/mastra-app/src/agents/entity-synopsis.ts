import { Agent } from "@mastra/core/agent";
import { getModelForAgent } from "../lib/llm.js";
import { z } from "zod";

/**
 * Entity Synopsis Agent
 *
 * Generates concise, structured synopses for biomedical entities (papers, proteins, trials, etc.)
 * and explains their relevance to user queries.
 *
 * Uses NVIDIA NIM with Llama-3.1-8B for fast, cost-effective generation.
 * Set env var: ENTITY_SYNOPSIS_MODEL=nvidia:meta/llama-3.1-8b-instruct
 */

// ─── Structured Synopsis Schemas ───────────────────────────────────────

export const paperSynopsisSchema = z.object({
  background: z.string().describe("1-2 sentences: Context and motivation"),
  methods: z.string().describe("1 sentence: Study design or approach"),
  findings: z.string().describe("1-2 sentences: Key results"),
  significance: z.string().describe("1 sentence: Why this matters"),
  relevance_to_query: z
    .string()
    .describe("How this paper addresses the user's query"),
});

export const proteinSynopsisSchema = z.object({
  function: z.string().describe("1-2 sentences: Primary biological function"),
  pathways: z
    .string()
    .describe("1 sentence: Key pathways or processes involved"),
  disease_association: z
    .string()
    .describe("1 sentence: Known disease connections"),
  therapeutic_potential: z
    .string()
    .describe("1 sentence: Drug target or clinical relevance"),
  relevance_to_query: z
    .string()
    .describe("How this protein relates to the user's query"),
});

export const trialSynopsisSchema = z.object({
  intervention: z.string().describe("1 sentence: What is being tested"),
  design: z
    .string()
    .describe("1 sentence: Study design and patient population"),
  outcomes: z.string().describe("1-2 sentences: Primary outcomes and status"),
  implications: z
    .string()
    .describe("1 sentence: Clinical or research implications"),
  relevance_to_query: z
    .string()
    .describe("How this trial addresses the user's query"),
});

export const drugSynopsisSchema = z.object({
  mechanism: z.string().describe("1-2 sentences: Mechanism of action"),
  indications: z.string().describe("1 sentence: Approved or investigated uses"),
  development_status: z
    .string()
    .describe("1 sentence: Clinical stage or approval status"),
  significance: z.string().describe("1 sentence: Therapeutic importance"),
  relevance_to_query: z
    .string()
    .describe("How this drug relates to the user's query"),
});

export const patentSynopsisSchema = z.object({
  innovation: z.string().describe("1-2 sentences: What is claimed/invented"),
  application: z
    .string()
    .describe("1 sentence: Potential uses or applications"),
  status: z.string().describe("1 sentence: Filing status and timeline"),
  significance: z
    .string()
    .describe("1 sentence: Commercial or scientific importance"),
  relevance_to_query: z
    .string()
    .describe("How this patent relates to the user's query"),
});

// Fallback generic schema for other entity types
export const genericSynopsisSchema = z.object({
  synopsis: z.string().describe("4-6 sentence summary of the entity"),
  relevance_to_query: z
    .string()
    .describe("Explanation of relevance to user query"),
});

// ─── Agent Instructions by Entity Type ─────────────────────────────────

const PAPER_INSTRUCTIONS = `You create structured synopses for scientific papers.

Given paper metadata (title, abstract, authors, journal, MeSH terms, etc.) and a user query, provide:

1. **Background**: What motivated this research? What problem does it address? (1-2 sentences)
2. **Methods**: What approach or study design was used? (1 sentence)
3. **Findings**: What were the key results or discoveries? (1-2 sentences)
4. **Significance**: Why does this matter to the field? (1 sentence)
5. **Relevance to Query**: Specifically explain how this paper helps answer the user's query

Rules:
- Ground ALL statements in the provided metadata (abstract, MeSH terms, etc.)
- Never invent facts not present in the input
- Use precise scientific language
- Focus on actionable insights
- If full text isn't available, base synopsis on abstract only`;

const PROTEIN_INSTRUCTIONS = `You create structured synopses for proteins and genes.

Given protein data (name, function description, subcellular location, etc.) and a user query, provide:

1. **Function**: What is this protein's primary biological role? (1-2 sentences)
2. **Pathways**: Which key cellular pathways or processes does it participate in? (1 sentence)
3. **Disease Association**: What diseases or conditions is it linked to? (1 sentence)
4. **Therapeutic Potential**: Is it a drug target? Any clinical relevance? (1 sentence)
5. **Relevance to Query**: Specifically explain how this protein relates to the user's query

Rules:
- Ground ALL statements in the provided UniProt data
- Never invent functions or associations not present in the data
- Use standard protein nomenclature
- Highlight mechanistic insights when available
- If disease data is missing, say "No known disease associations in current data"`;

const TRIAL_INSTRUCTIONS = `You create structured synopses for clinical trials.

Given trial data (phase, status, intervention, outcomes, etc.) and a user query, provide:

1. **Intervention**: What is being tested? (drug, device, procedure) (1 sentence)
2. **Design**: Study design, phase, and patient population (1 sentence)
3. **Outcomes**: Primary outcomes being measured and current status (1-2 sentences)
4. **Implications**: What could this mean for patients or research? (1 sentence)
5. **Relevance to Query**: Specifically explain how this trial addresses the user's query

Rules:
- Ground ALL statements in the provided trial data
- Never invent outcomes or results not yet reported
- Be precise about trial phase and status (recruiting, completed, terminated, etc.)
- Highlight any preliminary results if available
- If outcomes aren't available, focus on study design and rationale`;

const DRUG_INSTRUCTIONS = `You create structured synopses for drugs and compounds.

Given drug data (mechanism, indications, development status, etc.) and a user query, provide:

1. **Mechanism**: How does this drug work? What is its mechanism of action? (1-2 sentences)
2. **Indications**: What is it approved for or being investigated for? (1 sentence)
3. **Development Status**: Clinical stage, approval status, or market availability (1 sentence)
4. **Significance**: Why is this therapeutically important? (1 sentence)
5. **Relevance to Query**: Specifically explain how this drug relates to the user's query

Rules:
- Ground ALL statements in the provided drug data
- Distinguish between approved uses and investigational uses
- Be precise about clinical development stage
- Highlight any novel mechanisms or first-in-class status
- If mechanism is unknown, say "Mechanism not fully characterized"`;

const PATENT_INSTRUCTIONS = `You create structured synopses for patents.

Given patent data (title, abstract, claims, assignee, dates, etc.) and a user query, provide:

1. **Innovation**: What is claimed or invented? What's novel? (1-2 sentences)
2. **Application**: What are the potential uses or commercial applications? (1 sentence)
3. **Status**: Filing date, grant status, expiry timeline (1 sentence)
4. **Significance**: Commercial, scientific, or competitive importance (1 sentence)
5. **Relevance to Query**: Specifically explain how this patent relates to the user's query

Rules:
- Ground ALL statements in the provided patent data
- Focus on independent claims for novelty assessment
- Distinguish between filed and granted patents
- Highlight assignee (company/institution) when relevant
- If claims are unclear, focus on title and abstract`;

// ─── Agent Factory ─────────────────────────────────────────────────────

export function createEntitySynopsisAgent(entityType: string): Agent {
  let instructions: string;
  let schema: z.ZodObject<any>;

  switch (entityType) {
    case "paper":
      instructions = PAPER_INSTRUCTIONS;
      schema = paperSynopsisSchema;
      break;
    case "protein":
    case "gene":
      instructions = PROTEIN_INSTRUCTIONS;
      schema = proteinSynopsisSchema;
      break;
    case "trial":
      instructions = TRIAL_INSTRUCTIONS;
      schema = trialSynopsisSchema;
      break;
    case "drug":
    case "compound":
      instructions = DRUG_INSTRUCTIONS;
      schema = drugSynopsisSchema;
      break;
    case "patent":
      instructions = PATENT_INSTRUCTIONS;
      schema = patentSynopsisSchema;
      break;
    default:
      instructions =
        "Provide a concise 4-6 sentence summary and explain relevance to the query.";
      schema = genericSynopsisSchema;
  }

  return new Agent({
    id: `entity-synopsis-${entityType}`,
    name: `Entity Synopsis Generator (${entityType})`,
    instructions,
    model: getModelForAgent("entity-synopsis"),
  });
}

// ─── Helper to format synopsis for display ────────────────────────────

export function formatSynopsisForDisplay(
  entityType: string,
  synopsis: Record<string, string>,
): string {
  switch (entityType) {
    case "paper":
      return `**Background:** ${synopsis.background}\n\n**Methods:** ${synopsis.methods}\n\n**Findings:** ${synopsis.findings}\n\n**Significance:** ${synopsis.significance}`;

    case "protein":
    case "gene":
      return `**Function:** ${synopsis.function}\n\n**Pathways:** ${synopsis.pathways}\n\n**Disease Association:** ${synopsis.disease_association}\n\n**Therapeutic Potential:** ${synopsis.therapeutic_potential}`;

    case "trial":
      return `**Intervention:** ${synopsis.intervention}\n\n**Design:** ${synopsis.design}\n\n**Outcomes:** ${synopsis.outcomes}\n\n**Implications:** ${synopsis.implications}`;

    case "drug":
    case "compound":
      return `**Mechanism:** ${synopsis.mechanism}\n\n**Indications:** ${synopsis.indications}\n\n**Development Status:** ${synopsis.development_status}\n\n**Significance:** ${synopsis.significance}`;

    case "patent":
      return `**Innovation:** ${synopsis.innovation}\n\n**Application:** ${synopsis.application}\n\n**Status:** ${synopsis.status}\n\n**Significance:** ${synopsis.significance}`;

    default:
      return synopsis.synopsis || "";
  }
}

export function getSchemaForEntityType(entityType: string): z.ZodObject<any> {
  switch (entityType) {
    case "paper":
      return paperSynopsisSchema;
    case "protein":
    case "gene":
      return proteinSynopsisSchema;
    case "trial":
      return trialSynopsisSchema;
    case "drug":
    case "compound":
      return drugSynopsisSchema;
    case "patent":
      return patentSynopsisSchema;
    default:
      return genericSynopsisSchema;
  }
}
