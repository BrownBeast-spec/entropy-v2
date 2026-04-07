import { Hono } from "hono";
import { z } from "zod";
import { getCacheStore } from "@entropy/mastra-app/src/lib/audit.js";
import {
  createEntitySynopsisAgent,
  formatSynopsisForDisplay,
  getSchemaForEntityType,
} from "@entropy/mastra-app/src/agents/entity-synopsis.js";
import {
  getBiologyTools,
  getClinicalTrialsTools,
  getEuropePMCTools,
  getPatentsTools,
  getPubChemTools,
  getPubMedTools,
} from "@entropy/mastra-app/src/lib/mcp-client.js";

const app = new Hono();

// Entity node schema
const entityNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum([
    "paper",
    "protein",
    "gene",
    "drug",
    "compound",
    "trial",
    "patent",
    "disease",
    "company",
  ]),
  source: z.string(),
  metadata: z.record(z.unknown()),
  addedByQuery: z.string(),
  evidenceScore: z.number().optional(),
  indiaRelevant: z.boolean().optional(),
});

type EntityNode = z.infer<typeof entityNodeSchema>;

/**
 * Helper to call an MCP tool and extract the payload
 */
async function callTool(
  tools: Record<string, unknown>,
  toolName: string,
  input: Record<string, unknown>,
): Promise<{ payload: Record<string, unknown> | null; error?: string }> {
  const maybeTool = tools[toolName];
  if (
    !maybeTool ||
    typeof maybeTool !== "object" ||
    !("execute" in maybeTool) ||
    typeof maybeTool.execute !== "function"
  ) {
    return { payload: null, error: `Tool '${toolName}' not available` };
  }

  try {
    const raw = await maybeTool.execute(input);
    
    // Extract text content from MCP response
    let payload: Record<string, unknown> | null = null;
    if (raw && typeof raw === "object" && "content" in raw) {
      const content = (raw as { content: unknown }).content;
      if (Array.isArray(content) && content.length > 0) {
        const firstItem = content[0];
        if (firstItem && typeof firstItem === "object" && "text" in firstItem) {
          const text = (firstItem as { text: string }).text;
          try {
            payload = JSON.parse(text) as Record<string, unknown>;
          } catch {
            payload = { raw: text };
          }
        }
      }
    }

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

/**
 * Fetch full details for an entity from appropriate MCP tools
 */
async function fetchEntityDetails(
  node: EntityNode,
): Promise<Record<string, unknown>> {
  try {
    switch (node.type) {
      case "paper": {
        // Extract PMID from metadata or label (e.g., "PMID 12345678" or just the ID in metadata)
        const pmid =
          (node.metadata?.pmid as string) ||
          (node.metadata?.pubmedId as string) ||
          node.label.match(/PMID\s*(\d+)/i)?.[1] ||
          (node.id.match(/\d+/)?.[0]); // Sometimes the ID itself is just the PMID
          
        if (!pmid) {
          console.warn(`[entity-details] Cannot extract PMID from node:`, node);
          return node.metadata;
        }

        console.log(`[entity-details] Fetching paper metadata for PMID: ${pmid}`);
        const pubmedTools = await getPubMedTools();
        const { payload, error } = await callTool(
          pubmedTools,
          "get_paper_metadata",
          { pmid },
        );

        if (error || !payload) {
          console.warn(`[entity-details] PubMed fetch failed: ${error}`);
          return node.metadata;
        }

        console.log(`[entity-details] Paper metadata fetched:`, payload);
        return payload;
      }

      case "protein":
      case "gene": {
        // Extract UniProt ID from metadata or label
        const uniprotId = node.metadata?.uniprotId as string | undefined;
        if (!uniprotId) {
          console.warn(
            `[entity-details] No UniProt ID in metadata for: ${node.label}`,
          );
          return node.metadata;
        }

        const biologyTools = await getBiologyTools();
        const { payload, error } = await callTool(
          biologyTools,
          "get_protein_function",
          { accession: uniprotId },
        );

        if (error || !payload) {
          console.warn(`[entity-details] UniProt fetch failed: ${error}`);
          return node.metadata;
        }

        return payload;
      }

      case "trial": {
        // Extract NCT ID from metadata or label
        const nctId = 
          (node.metadata?.nct_id as string) ||
          (node.metadata?.nctId as string) ||
          node.label.match(/NCT\d+/i)?.[0];
          
        if (!nctId) {
          console.warn(`[entity-details] Cannot extract NCT ID from node:`, node);
          return node.metadata;
        }

        console.log(`[entity-details] Fetching trial details for: ${nctId}`);
        const clinicalTools = await getClinicalTrialsTools();
        const { payload, error } = await callTool(
          clinicalTools,
          "get_study_details",
          { nctId },
        );

        if (error || !payload) {
          console.warn(`[entity-details] ClinicalTrials fetch failed: ${error}`);
          return node.metadata;
        }

        console.log(`[entity-details] Trial details fetched:`, payload);
        return payload;
      }

      case "drug":
      case "compound": {
        // Extract PubChem CID from metadata
        const pubchemId = node.metadata?.pubchemId as string | undefined;
        if (!pubchemId) {
          console.warn(
            `[entity-details] No PubChem ID in metadata for: ${node.label}`,
          );
          return node.metadata;
        }

        const pubchemTools = await getPubChemTools();
        const { payload, error } = await callTool(
          pubchemTools,
          "get_compound_details",
          { cid: pubchemId },
        );

        if (error || !payload) {
          console.warn(`[entity-details] PubChem fetch failed: ${error}`);
          return node.metadata;
        }

        return payload;
      }

      case "patent": {
        // Extract patent number from label or metadata
        const patentNumber = (node.metadata?.patentNumber || node.label) as string;
        if (!patentNumber) {
          console.warn(`[entity-details] No patent number for: ${node.label}`);
          return node.metadata;
        }

        const patentsTools = await getPatentsTools();
        const { payload, error } = await callTool(
          patentsTools,
          "get_patent_details",
          { patent_number: patentNumber },
        );

        if (error || !payload) {
          console.warn(`[entity-details] Patents fetch failed: ${error}`);
          return node.metadata;
        }

        return payload;
      }

      default:
        // For other types (disease, company), use existing metadata
        return node.metadata;
    }
  } catch (err) {
    console.error(`[entity-details] Error fetching details:`, err);
    return node.metadata;
  }
}


/**
 * POST /api/entity/:nodeId/enrich
 *
 * Enriches an entity with:
 * - Full metadata from MCP tools (fetched via simple HTTP since we're in API layer)
 * - LLM-generated synopsis (structured by entity type)
 * - Relevance explanation based on user query
 * - Citation data (for papers)
 *
 * Caches result for 24 hours to avoid redundant API calls.
 */
app.post("/:nodeId/enrich", async (c) => {
  try {
    const nodeId = c.req.param("nodeId");
    const body = await c.req.json();

    // Validate request
    const { node } = z
      .object({
        node: entityNodeSchema,
      })
      .parse(body);

    // 1. Check cache first
    const cacheKey = `entity:${node.type}:${nodeId}`;
    const cache = getCacheStore();

    try {
      const cached = await cache.get("entity_enrichment", { cacheKey });
      if (cached) {
        console.log(`[entity-enrich] Cache hit for ${cacheKey}`);
        return c.json(cached);
      }
    } catch (err) {
      console.warn(`[entity-enrich] Cache check failed:`, err);
      // Continue without cache
    }

    console.log(
      `[entity-enrich] Cache miss for ${cacheKey}, generating synopsis...`,
    );

    // 2. Use existing metadata (already comprehensive from search-time enrichment)
    const fullDetails = node.metadata;

    // 3. Generate synopsis with LLM agent
    console.log(
      `[entity-enrich] Generating synopsis for ${node.type}: ${node.label}`,
    );

    const agent = createEntitySynopsisAgent(node.type);
    const schema = getSchemaForEntityType(node.type);

    // Prepare input for agent
    const agentInput = {
      entityType: node.type,
      entityId: nodeId,
      label: node.label,
      metadata: node.metadata,
      fullDetails,
      userQuery: node.addedByQuery,
    };

    let synopsisData: Record<string, string>;
    let formattedSynopsis: string;
    let relevanceExplanation: string;

    try {
      const result = await agent.generate(
        [
          {
            role: "user",
            content: JSON.stringify(agentInput, null, 2),
          },
        ],
        {
          structuredOutput: {
            schema,
          },
        },
      );

      synopsisData = (result.object ?? {}) as Record<string, string>;
      formattedSynopsis = formatSynopsisForDisplay(node.type, synopsisData);
      relevanceExplanation =
        synopsisData.relevance_to_query ||
        synopsisData.relevanceExplanation ||
        "";

      console.log(
        `[entity-enrich] Synopsis generated successfully for ${nodeId}`,
      );
    } catch (err) {
      console.error(`[entity-enrich] Failed to generate synopsis:`, err);

      // Fallback synopsis
      formattedSynopsis = `Unable to generate synopsis for ${node.label}. Please check the source for more information.`;
      relevanceExplanation = `This ${node.type} was identified as relevant to your query: "${node.addedByQuery}"`;
      synopsisData = {
        synopsis: formattedSynopsis,
        relevance_to_query: relevanceExplanation,
      };
    }

    // 4. Combine enriched data
    const enrichedData = {
      ...node,
      fullDetails,
      synopsisData,
      formattedSynopsis,
      relevanceExplanation,
      enrichedAt: new Date().toISOString(),
    };

    // 5. Cache for 24 hours (86400 seconds)
    try {
      await cache.set("entity_enrichment", { cacheKey }, enrichedData, 86400);
      console.log(`[entity-enrich] Cached enrichment for ${cacheKey}`);
    } catch (err) {
      console.warn(`[entity-enrich] Failed to cache result:`, err);
      // Continue without caching
    }

    return c.json(enrichedData);
  } catch (error) {
    console.error("[entity-enrich] Error:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: "Invalid request",
          details: error.errors,
        },
        400,
      );
    }

    return c.json(
      {
        error: "Failed to enrich entity",
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

export default app;
