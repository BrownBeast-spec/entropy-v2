import { Hono } from "hono";
import { z } from "zod";
import { errorResponse } from "../middleware/error-handler.js";
import {
  getBiologyTools,
  getClinicalTrialsTools,
  getEuropePMCTools,
  getPatentsTools,
  getPubChemTools,
  getPubMedTools,
  getSTRINGTools,
} from "@entropy/mastra-app/src/lib/mcp-client.js";
import { queryPlannerAgent } from "@entropy/mastra-app/src/agents/query-planner.js";
import { evidenceSummarizerAgent } from "@entropy/mastra-app/src/agents/evidence-summarizer.js";

const entropy = new Hono();

const SearchTypeSchema = z.enum([
  "literature",
  "preprints",
  "proteins",
  "compounds",
  "trials",
  "patents",
  "targets",
  "interactions",
]);

const DEFAULT_TYPES = [
  "literature",
  "preprints",
  "proteins",
  "compounds",
  "trials",
  "patents",
  "targets",
] as const;

const SearchInputSchema = z.object({
  q: z.string().trim().min(1),
  types: z.array(SearchTypeSchema).default([...DEFAULT_TYPES]),
  limit: z.number().int().min(1).max(25).default(10),
});

type SearchType = z.infer<typeof SearchTypeSchema>;

type Citation = {
  source: string;
  label: string;
  url?: string;
  identifier?: string;
};

type SearchResult = {
  type: SearchType;
  id: string;
  title: string;
  description: string;
  source: string;
  url?: string;
  citations: Citation[];
  metadata: Record<string, unknown>;
};

type SummaryFinding = {
  claim: string;
  citations: Citation[];
  evidence: Array<{
    id: string;
    title: string;
    type: SearchType;
    source: string;
    url?: string;
  }>;
};

type SearchSummary = {
  overview: string;
  findings: SummaryFinding[];
  limitations?: string;
  generated_by: "gemini" | "fallback";
};

type ToolMap = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function parseTypesInput(rawTypes: unknown): unknown {
  if (rawTypes === undefined || rawTypes === null) {
    return undefined;
  }

  if (Array.isArray(rawTypes)) {
    return rawTypes
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  if (typeof rawTypes === "string" && rawTypes.trim().length > 0) {
    return rawTypes
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  return rawTypes;
}

function parseToolPayload(result: unknown): Record<string, unknown> | null {
  if (!isRecord(result)) return null;
  const content = result.content;
  if (!Array.isArray(content)) return null;

  for (const item of content) {
    if (!isRecord(item)) continue;
    const text = item.text;
    if (typeof text !== "string") continue;
    try {
      const parsed = JSON.parse(text);
      return isRecord(parsed) ? parsed : { value: parsed };
    } catch {
      return { raw: text };
    }
  }

  return null;
}

type ToolCall = {
  payload: Record<string, unknown> | null;
  error?: string;
};

const QueryPlanSchema = z.object({
  pubmedDisease: z.string().trim().min(1),
  europepmcQuery: z.string().trim().min(1),
  uniprotQuery: z.string().trim().min(1),
  compoundName: z.string().trim().min(1),
  trialTerm: z.string().trim().min(1),
  patentDrugName: z.string().trim().min(1),
  targetGeneSymbol: z.string().trim().min(1),
  stringProteinIds: z.string().trim().min(1),
  rationale: z.string().optional(),
});

type QueryPlan = z.infer<typeof QueryPlanSchema>;

const SummarySchema = z.object({
  overview: z.string().trim().min(1),
  findings: z
    .array(
      z.object({
        claim: z.string().trim().min(1),
        result_ids: z.array(z.string().trim().min(1)).default([]),
      }),
    )
    .max(5)
    .default([]),
  limitations: z.string().optional(),
});

type GeneratedSummary = z.infer<typeof SummarySchema>;

function defaultQueryPlan(q: string): QueryPlan {
  return {
    pubmedDisease: q,
    europepmcQuery: q,
    uniprotQuery: q,
    compoundName: q,
    trialTerm: q,
    patentDrugName: q,
    targetGeneSymbol: q,
    stringProteinIds: q,
    rationale: "fallback-to-original-query",
  };
}

function hasApiKeyForProvider(provider: string): boolean {
  switch (provider) {
    case "google":
      return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY);
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY);
    case "perplexity":
      return Boolean(process.env.PERPLEXITY_API_KEY);
    case "huggingface":
      return Boolean(process.env.HUGGINGFACE_API_KEY);
    case "openrouter":
      return Boolean(process.env.OPENROUTER_API_KEY);
    default:
      return false;
  }
}

function modelProviderFromId(modelId: string): string {
  const [provider] = modelId.split(":");
  return provider;
}

function canUseQueryPlannerLlm(): boolean {
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") {
    return false;
  }

  const modelId =
    process.env.QUERY_PLANNER_MODEL ??
    process.env.LLM_MODEL ??
    "google:gemini-2.5-pro-preview-05-06";
  return hasApiKeyForProvider(modelProviderFromId(modelId));
}

function canUseSummaryLlm(): boolean {
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") {
    return false;
  }

  const modelId =
    process.env.EVIDENCE_SUMMARIZER_MODEL ??
    process.env.LLM_MODEL ??
    "google:gemini-2.5-pro-preview-05-06";
  return hasApiKeyForProvider(modelProviderFromId(modelId));
}

function buildCitation(
  source: string,
  label: string,
  opts?: { url?: string; identifier?: string },
): Citation {
  return {
    source,
    label,
    url: opts?.url,
    identifier: opts?.identifier,
  };
}

function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const citation of citations) {
    const key = `${citation.source}::${citation.identifier ?? ""}::${citation.url ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(citation);
  }
  return out;
}

function firstSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 220) {
    return cleaned;
  }
  const match = cleaned.match(/^(.{80,220}?[.!?])(\s|$)/);
  if (match?.[1]) {
    return match[1].trim();
  }
  return `${cleaned.slice(0, 217).trim()}...`;
}

async function buildQueryPlan(q: string): Promise<QueryPlan> {
  const fallback = defaultQueryPlan(q);
  if (!canUseQueryPlannerLlm()) {
    return fallback;
  }

  try {
    const prompt = [
      "Create source-specific API query fields for this biomedical question.",
      "Do not hallucinate entities. Keep fields concise and execution-ready.",
      `Question: ${q}`,
    ].join("\n");

    const response = await queryPlannerAgent.generate(
      [{ role: "user", content: prompt }],
      { structuredOutput: { schema: QueryPlanSchema } },
    );

    const maybeObject = (response as { object?: unknown }).object;
    const parsed = QueryPlanSchema.safeParse(maybeObject);
    if (!parsed.success) {
      return fallback;
    }

    return parsed.data;
  } catch {
    return fallback;
  }
}

function fallbackSummary(
  query: string,
  results: SearchResult[],
): SearchSummary {
  if (results.length === 0) {
    return {
      overview: `No evidence was retrieved for \"${query}\" from the selected sources. Try broadening the query or source types.`,
      findings: [],
      limitations: "No results available to summarize.",
      generated_by: "fallback",
    };
  }

  const top = results.slice(0, 3);
  const findings: SummaryFinding[] = top.map((item) => ({
    claim: `${item.title} (${item.source}) is among the most relevant retrieved evidence for this query.`,
    citations: item.citations.slice(0, 3),
    evidence: [
      {
        id: item.id,
        title: item.title,
        type: item.type,
        source: item.source,
        url: item.url,
      },
    ],
  }));

  return {
    overview: `Retrieved ${results.length} evidence item${results.length === 1 ? "" : "s"} across ${new Set(results.map((r) => r.type)).size} source type${new Set(results.map((r) => r.type)).size === 1 ? "" : "s"}.`,
    findings,
    limitations:
      "This fallback summary is extractive and does not infer beyond retrieved records.",
    generated_by: "fallback",
  };
}

async function buildSummary(
  query: string,
  results: SearchResult[],
): Promise<SearchSummary> {
  const fallback = fallbackSummary(query, results);
  if (results.length === 0 || !canUseSummaryLlm()) {
    return fallback;
  }

  try {
    const compact = results.slice(0, 12).map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      source: item.source,
      citations: item.citations.slice(0, 3),
      metadata: {
        year: item.metadata.year,
        journal: item.metadata.journal,
        doi: item.metadata.doi,
        pmid: item.metadata.pmid,
        citation_count: item.metadata.citation_count,
      },
    }));

    const prompt = [
      "Summarize the biomedical evidence for the query.",
      "Requirements:",
      "- Keep overview factual and concise (2-4 sentences).",
      "- Produce up to 5 findings.",
      "- For each finding, include result_ids pointing to evidence rows.",
      "- Do not include claims that are not supported by provided results.",
      `Query: ${query}`,
      `Evidence rows: ${JSON.stringify(compact)}`,
    ].join("\n");

    const response = await evidenceSummarizerAgent.generate(
      [{ role: "user", content: prompt }],
      { structuredOutput: { schema: SummarySchema } },
    );

    const maybeObject = (response as { object?: unknown }).object;
    const parsed = SummarySchema.safeParse(maybeObject);
    if (!parsed.success) {
      return fallback;
    }

    const generated: GeneratedSummary = parsed.data;
    const byId = new Map(results.map((item) => [item.id, item]));

    const findings: SummaryFinding[] = generated.findings.map((finding) => {
      const matched = finding.result_ids
        .map((id) => byId.get(id))
        .filter((item): item is SearchResult => Boolean(item));

      const evidenceItems = (
        matched.length > 0 ? matched : results.slice(0, 1)
      ).map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        source: item.source,
        url: item.url,
      }));

      const citations = dedupeCitations(
        (matched.length > 0 ? matched : results.slice(0, 1))
          .flatMap((item) => item.citations)
          .slice(0, 8),
      );

      return {
        claim: finding.claim,
        citations,
        evidence: evidenceItems,
      };
    });

    return {
      overview: generated.overview,
      findings,
      limitations: generated.limitations,
      generated_by: "gemini",
    };
  } catch {
    return fallback;
  }
}

async function callTool(
  tools: ToolMap,
  toolName: string,
  input: Record<string, unknown>,
): Promise<ToolCall> {
  const maybeTool = tools[toolName];
  if (!isRecord(maybeTool) || typeof maybeTool.execute !== "function") {
    return { payload: null, error: `Tool '${toolName}' not available` };
  }

  try {
    const raw = await maybeTool.execute(input);
    const payload = parseToolPayload(raw);
    if (!payload) {
      return { payload: null, error: `Tool '${toolName}' returned no payload` };
    }

    if (typeof payload.error === "string" && payload.error.length > 0) {
      return { payload, error: payload.error };
    }

    return { payload };
  } catch (error) {
    return {
      payload: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function dedupeResults(items: SearchResult[]): SearchResult[] {
  const byKey = new Map<string, SearchResult>();

  for (const item of items) {
    const key = item.url ?? `${item.type}:${item.id}`;
    if (!byKey.has(key)) {
      byKey.set(key, item);
      continue;
    }

    const prev = byKey.get(key);
    if (!prev) continue;

    byKey.set(key, {
      ...prev,
      citations: dedupeCitations([...prev.citations, ...item.citations]),
      metadata: { ...prev.metadata, ...item.metadata },
    });
  }

  return [...byKey.values()];
}

type CitationToolInput = {
  pmid?: string;
  pmcid?: string;
  doi?: string;
};

function citationInputFromResult(item: SearchResult): CitationToolInput | null {
  const pmid = asString(item.metadata.pmid);
  const pmcid = asString(item.metadata.pmcid);
  const doi = asString(item.metadata.doi);

  if (pmid) return { pmid };
  if (pmcid) return { pmcid };
  if (doi) return { doi };
  return null;
}

async function enrichCitationMetrics(items: SearchResult[]): Promise<void> {
  const candidates = items
    .filter((item) => item.type === "literature" || item.type === "preprints")
    .slice(0, 6);

  if (candidates.length === 0) {
    return;
  }

  const tools = await getEuropePMCTools();
  const maybeTool = tools.get_citations_europepmc;
  if (!isRecord(maybeTool) || typeof maybeTool.execute !== "function") {
    return;
  }

  await Promise.all(
    candidates.map(async (item) => {
      const input = citationInputFromResult(item);
      if (!input) return;

      const { payload } = await callTool(
        tools,
        "get_citations_europepmc",
        input as Record<string, unknown>,
      );
      if (!payload) return;

      const citationCount = asNumber(payload.citation_count);
      if (typeof citationCount === "number") {
        item.metadata.citation_count = citationCount;
      }

      const recent = asRecordArray(payload.recent_citations)
        .slice(0, 3)
        .map((c) => ({
          title: asString(c.title),
          year: asString(c.year),
          id: asString(c.id),
        }));

      if (recent.length > 0) {
        item.metadata.recent_citations = recent;
      }
    }),
  );
}

async function runUnifiedSearch(input: z.infer<typeof SearchInputSchema>) {
  const { q, types, limit } = input;
  const queryPlan = await buildQueryPlan(q);
  const items: SearchResult[] = [];
  const errors: Record<string, string> = {};

  const tasks: Promise<void>[] = [];

  if (types.includes("literature")) {
    tasks.push(
      (async () => {
        const tools = await getPubMedTools();
        const { payload, error } = await callTool(tools, "search_literature", {
          disease: queryPlan.pubmedDisease,
          year: new Date().getUTCFullYear(),
          limit,
        });
        if (error) {
          errors.literature = error;
          return;
        }

        const papers = asRecordArray(payload?.top_papers).slice(0, limit);
        for (const paper of papers) {
          const id = asString(paper.pmid) ?? asString(paper.id);
          const title = asString(paper.title);
          if (!id || !title) continue;

          const doi = asString(paper.doi);
          const explicitUrl = asString(paper.url) ?? asString(paper.link);
          const pubmedUrl = `https://pubmed.ncbi.nlm.nih.gov/${id}/`;
          const resultUrl = explicitUrl ?? pubmedUrl;
          const abstractText =
            asString(paper.abstract) ?? "No abstract available";

          const citations = dedupeCitations([
            buildCitation("PubMed", `PMID ${id}`, {
              identifier: id,
              url: pubmedUrl,
            }),
            ...(doi
              ? [
                  buildCitation("DOI", doi, {
                    identifier: doi,
                    url: `https://doi.org/${doi}`,
                  }),
                ]
              : []),
            ...(explicitUrl
              ? [
                  buildCitation("Source", "Primary record", {
                    url: explicitUrl,
                    identifier: id,
                  }),
                ]
              : []),
          ]);

          items.push({
            type: "literature",
            id,
            title,
            description: firstSentence(abstractText),
            source: "PubMed",
            url: resultUrl,
            citations,
            metadata: {
              authors: paper.authors,
              journal: paper.journal,
              year: paper.year,
              doi,
              pmid: id,
              abstract: abstractText,
              pub_date: asString(paper.pub_date),
            },
          });
        }
      })(),
    );
  }

  if (types.includes("preprints")) {
    tasks.push(
      (async () => {
        const tools = await getEuropePMCTools();
        const { payload, error } = await callTool(tools, "search_europepmc", {
          query: queryPlan.europepmcQuery,
          limit,
          includePreprints: true,
        });
        if (error) {
          errors.preprints = error;
          return;
        }

        const papers = asRecordArray(payload?.papers).slice(0, limit);
        for (const paper of papers) {
          const id = asString(paper.id);
          const title = asString(paper.title);
          if (!id || !title) continue;

          const sourceCode = asString(paper.source) ?? "EuropePMC";
          const doi = asString(paper.doi);
          const fallbackUrl = `https://europepmc.org/article/${sourceCode}/${id}`;
          const resultUrl = asString(paper.url) ?? fallbackUrl;
          const abstractText =
            asString(paper.abstract) ?? "No abstract available";
          const pmid = sourceCode === "MED" ? id : undefined;
          const pmcid =
            sourceCode === "PMC"
              ? id.startsWith("PMC")
                ? id
                : `PMC${id}`
              : undefined;

          const citations = dedupeCitations([
            buildCitation("Europe PMC", `${sourceCode}:${id}`, {
              identifier: `${sourceCode}:${id}`,
              url: fallbackUrl,
            }),
            ...(pmid
              ? [
                  buildCitation("PubMed", `PMID ${pmid}`, {
                    identifier: pmid,
                    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
                  }),
                ]
              : []),
            ...(doi
              ? [
                  buildCitation("DOI", doi, {
                    identifier: doi,
                    url: `https://doi.org/${doi}`,
                  }),
                ]
              : []),
            ...(resultUrl
              ? [
                  buildCitation("Source", "Primary record", {
                    url: resultUrl,
                    identifier: id,
                  }),
                ]
              : []),
          ]);

          items.push({
            type: "preprints",
            id,
            title,
            description: firstSentence(abstractText),
            source: `Europe PMC${paper.source ? ` (${String(paper.source)})` : ""}`,
            url: resultUrl,
            citations,
            metadata: {
              authors: paper.authors,
              year: paper.year,
              journal: paper.journal,
              doi,
              pmid,
              pmcid,
              open_access: asBoolean(paper.isOpenAccess),
              has_full_text: asBoolean(paper.hasFullText),
              abstract: abstractText,
            },
          });
        }
      })(),
    );
  }

  if (types.includes("proteins")) {
    tasks.push(
      (async () => {
        const tools = await getBiologyTools();
        const { payload, error } = await callTool(tools, "search_uniprot", {
          query: queryPlan.uniprotQuery,
        });
        if (error) {
          errors.proteins = error;
          return;
        }

        const proteins = asRecordArray(payload?.results).slice(0, limit);
        for (const protein of proteins) {
          const accession = asString(protein.accession);
          const proteinName = asString(protein.protein_name);
          if (!accession || !proteinName) continue;
          const url = `https://www.uniprot.org/uniprotkb/${accession}`;
          items.push({
            type: "proteins",
            id: accession,
            title: proteinName,
            description: asString(protein.organism) ?? "Protein entry",
            source: "UniProt",
            url,
            citations: [
              buildCitation("UniProt", accession, {
                identifier: accession,
                url,
              }),
            ],
            metadata: {
              accession,
              organism: protein.organism,
            },
          });
        }
      })(),
    );
  }

  if (types.includes("compounds")) {
    tasks.push(
      (async () => {
        const tools = await getPubChemTools();
        const { payload, error } = await callTool(tools, "search_compounds", {
          compoundName: queryPlan.compoundName,
          limit,
        });
        if (error) {
          errors.compounds = error;
          return;
        }

        const compounds = asRecordArray(payload?.compounds).slice(0, limit);
        for (const compound of compounds) {
          const cid = asNumber(compound.cid);
          if (!cid) continue;
          const formula = asString(compound.molecular_formula) ?? "Unknown";
          const weight = asNumber(compound.molecular_weight);
          const url =
            asString(compound.pubchem_url) ??
            `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`;
          items.push({
            type: "compounds",
            id: String(cid),
            title: asString(compound.iupac_name) ?? `CID ${cid}`,
            description: `Formula ${formula}${weight ? `, MW ${weight}` : ""}`,
            source: "PubChem",
            url,
            citations: [
              buildCitation("PubChem", `CID ${cid}`, {
                identifier: String(cid),
                url,
              }),
            ],
            metadata: {
              cid,
              molecular_formula: formula,
              molecular_weight: weight,
              smiles: compound.smiles,
            },
          });
        }
      })(),
    );
  }

  if (types.includes("trials")) {
    tasks.push(
      (async () => {
        const tools = await getClinicalTrialsTools();
        const { payload, error } = await callTool(tools, "search_studies", {
          term: queryPlan.trialTerm,
          limit,
        });
        if (error) {
          errors.trials = error;
          return;
        }

        const trials = asRecordArray(payload?.studies).slice(0, limit);
        for (const trial of trials) {
          const nctId = asString(trial.nct_id);
          const title = asString(trial.title);
          if (!nctId || !title) continue;
          const trialUrl = `https://clinicaltrials.gov/study/${nctId}`;
          items.push({
            type: "trials",
            id: nctId,
            title,
            description: `Status: ${asString(trial.status) ?? "unknown"}`,
            source: "ClinicalTrials.gov",
            url: trialUrl,
            citations: [
              buildCitation("ClinicalTrials.gov", nctId, {
                identifier: nctId,
                url: trialUrl,
              }),
            ],
            metadata: {
              status: trial.status,
              phase: trial.phase,
              conditions: trial.conditions,
              interventions: trial.interventions,
            },
          });
        }
      })(),
    );
  }

  if (types.includes("patents")) {
    tasks.push(
      (async () => {
        const tools = await getPatentsTools();
        const { payload, error } = await callTool(
          tools,
          "search_patents_by_drug",
          {
            drugName: queryPlan.patentDrugName,
            limit,
          },
        );
        if (error) {
          errors.patents = error;
          return;
        }

        const patents = asRecordArray(payload?.patents).slice(0, limit);
        for (const patent of patents) {
          const patentNumber = asString(patent.patent_number);
          const title = asString(patent.title);
          if (!patentNumber || !title) continue;
          const patentUrl = asString(patent.url);
          items.push({
            type: "patents",
            id: patentNumber,
            title,
            description: asString(patent.abstract) ?? "No abstract available",
            source: "PatentsView",
            url: patentUrl,
            citations: [
              buildCitation("PatentsView", patentNumber, {
                identifier: patentNumber,
                url: patentUrl,
              }),
            ],
            metadata: {
              date: patent.date,
              assignees: patent.assignees,
              inventors: patent.inventors,
            },
          });
        }
      })(),
    );
  }

  if (types.includes("targets")) {
    tasks.push(
      (async () => {
        const tools = await getBiologyTools();
        const { payload, error } = await callTool(tools, "validate_target", {
          geneSymbol: queryPlan.targetGeneSymbol,
        });
        if (error) {
          errors.targets = error;
          return;
        }

        const targetId = asString(payload?.target_id);
        const symbol = asString(payload?.gene_symbol);
        if (!targetId || !symbol) {
          return;
        }

        items.push({
          type: "targets",
          id: targetId,
          title: symbol,
          description: "Open Targets association summary",
          source: "Open Targets",
          url: `https://platform.opentargets.org/target/${targetId}`,
          citations: [
            buildCitation("Open Targets", symbol, {
              identifier: targetId,
              url: `https://platform.opentargets.org/target/${targetId}`,
            }),
          ],
          metadata: {
            top_associations: payload?.top_associations,
            gene_symbol: symbol,
            target_id: targetId,
          },
        });
      })(),
    );
  }

  if (types.includes("interactions")) {
    tasks.push(
      (async () => {
        const tools = await getSTRINGTools();
        const { payload, error } = await callTool(
          tools,
          "get_protein_interactions",
          {
            proteinIds: queryPlan.stringProteinIds,
            limit,
          },
        );
        if (error) {
          errors.interactions = error;
          return;
        }

        const interactions = asRecordArray(payload?.interactions).slice(
          0,
          limit,
        );
        for (const interaction of interactions) {
          const a = isRecord(interaction.protein_a)
            ? interaction.protein_a
            : {};
          const b = isRecord(interaction.protein_b)
            ? interaction.protein_b
            : {};
          const aName = asString(a.name);
          const bName = asString(b.name);
          if (!aName || !bName) continue;
          const id = `${aName}:${bName}`;
          const score = asNumber(interaction.combined_score);
          const url = `https://string-db.org/cgi/network?identifiers=${encodeURIComponent(`${aName}%0D${bName}`)}`;
          items.push({
            type: "interactions",
            id,
            title: `${aName} ↔ ${bName}`,
            description: `STRING score: ${score ?? "n/a"}`,
            source: "STRING DB",
            url,
            citations: [
              buildCitation("STRING DB", id, {
                identifier: id,
                url,
              }),
            ],
            metadata: {
              protein_a: a,
              protein_b: b,
              combined_score: score,
            },
          });
        }
      })(),
    );
  }

  const settled = await Promise.allSettled(tasks);
  settled.forEach((result, index) => {
    if (result.status === "rejected") {
      const key = `task_${index + 1}`;
      errors[key] =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
    }
  });

  const deduped = dedupeResults(items);
  await enrichCitationMetrics(deduped);
  const summary = await buildSummary(q, deduped);

  return {
    query: q,
    query_plan: queryPlan,
    types_requested: types,
    total_results: deduped.length,
    results: deduped,
    summary,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}

function parsePostInput(body: unknown): unknown {
  if (!isRecord(body)) {
    return {
      q: "",
      types: undefined,
      limit: 10,
    };
  }

  const q = typeof body.q === "string" ? body.q : "";
  const rawTypes = body.types;
  const rawLimit = body.limit;

  return {
    q,
    types: parseTypesInput(rawTypes),
    limit: typeof rawLimit === "number" ? rawLimit : 10,
  };
}

function parseGetInput(
  q: string | undefined,
  rawTypes: string | undefined,
  rawLimit: string | undefined,
): unknown {
  return {
    q: q ?? "",
    types: parseTypesInput(rawTypes),
    limit: rawLimit ? Number(rawLimit) : 10,
  };
}

entropy.get("/search", async (c) => {
  const parsed = SearchInputSchema.safeParse(
    parseGetInput(c.req.query("q"), c.req.query("types"), c.req.query("limit")),
  );
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Invalid query params", {
      issues: parsed.error.issues,
    });
  }

  const payload = await runUnifiedSearch(parsed.data);
  return c.json(payload);
});

entropy.post("/search", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, "BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = SearchInputSchema.safeParse(parsePostInput(body));
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Invalid request body", {
      issues: parsed.error.issues,
    });
  }

  const payload = await runUnifiedSearch(parsed.data);
  return c.json(payload);
});

export { entropy };
