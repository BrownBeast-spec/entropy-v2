import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Connect an MCP Client to an McpServer in-process via InMemoryTransport.
 * Returns the connected Client instance.
 */
async function connectToServer(
  server: McpServer,
  clientName: string,
): Promise<Client> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  const client = new Client({ name: clientName, version: "1.0.0" });

  // Connect both ends — order doesn't matter since InMemoryTransport buffers
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return client;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTool = ReturnType<typeof createTool<any, any, any, any, any, any, any>>;

/**
 * Discover all tools from an MCP server and wrap them as Mastra-compatible tools.
 * Each tool delegates execution to `client.callTool()`.
 */
async function wrapMcpTools(
  client: Client,
  toolFilter?: (toolName: string) => boolean,
): Promise<Record<string, AnyTool>> {
  const { tools } = await client.listTools();
  const wrapped: Record<string, AnyTool> = {};

  for (const tool of tools) {
    if (toolFilter && !toolFilter(tool.name)) {
      continue;
    }

    wrapped[tool.name] = createTool({
      id: tool.name,
      description: tool.description ?? `MCP tool: ${tool.name}`,
      inputSchema: z.object({}).passthrough(),
      execute: async (args) => {
        const result = await client.callTool({
          name: tool.name,
          arguments: args as Record<string, unknown>,
        });
        return result;
      },
    });
  }

  return wrapped;
}

/**
 * Create tools from an MCP server factory function.
 * Handles server creation, client connection, tool discovery, and wrapping.
 */
async function createMcpTools(
  createServerFn: () => McpServer,
  clientName: string,
  toolFilter?: (toolName: string) => boolean,
): Promise<Record<string, AnyTool>> {
  const server = createServerFn();
  const client = await connectToServer(server, clientName);
  return wrapMcpTools(client, toolFilter);
}

// ─── Lazy-initialized caches ───────────────────────────────────────────

let biologyTools: Record<string, AnyTool> | null = null;
let clinicalTrialsTools: Record<string, AnyTool> | null = null;
let pubmedTools: Record<string, AnyTool> | null = null;
let safetyTools: Record<string, AnyTool> | null = null;

// Clinical trials tool names (from mcp-clinical's clinicaltrials.ts)
const CLINICAL_TRIALS_TOOL_NAMES = new Set([
  "search_studies",
  "get_study_details",
  "get_eligibility_criteria",
]);

// PubMed tool names (from mcp-clinical's pubmed.ts)
const PUBMED_TOOL_NAMES = new Set([
  "search_literature",
  "search_preprints",
  "get_abstract",
  "get_paper_metadata",
]);

/**
 * Get all biology MCP tools (Open Targets, NCBI, Ensembl, UniProt).
 * Lazily connects to mcp-biology on first call.
 */
export async function getBiologyTools(): Promise<Record<string, AnyTool>> {
  if (biologyTools) return biologyTools;
  const { createServer } = await import("@entropy/mcp-biology");
  biologyTools = await createMcpTools(createServer, "biology-client");
  return biologyTools;
}

/**
 * Get clinical trials tools (ClinicalTrials.gov) from mcp-clinical.
 * Filters to only clinical trials tools, excluding PubMed tools.
 */
export async function getClinicalTrialsTools(): Promise<
  Record<string, AnyTool>
> {
  if (clinicalTrialsTools) return clinicalTrialsTools;
  const { createServer } = await import("@entropy/mcp-clinical");
  clinicalTrialsTools = await createMcpTools(
    createServer,
    "clinical-trials-client",
    (name) => CLINICAL_TRIALS_TOOL_NAMES.has(name),
  );
  return clinicalTrialsTools;
}

/**
 * Get PubMed tools (literature search) from mcp-clinical.
 * Filters to only PubMed tools, excluding clinical trials tools.
 */
export async function getPubMedTools(): Promise<Record<string, AnyTool>> {
  if (pubmedTools) return pubmedTools;
  const { createServer } = await import("@entropy/mcp-clinical");
  pubmedTools = await createMcpTools(createServer, "pubmed-client", (name) =>
    PUBMED_TOOL_NAMES.has(name),
  );
  return pubmedTools;
}

/**
 * Get all safety MCP tools (OpenFDA, drug interactions).
 * Lazily connects to mcp-safety on first call.
 */
export async function getSafetyTools(): Promise<Record<string, AnyTool>> {
  if (safetyTools) return safetyTools;
  const { createServer } = await import("@entropy/mcp-safety");
  safetyTools = await createMcpTools(createServer, "safety-client");
  return safetyTools;
}

/**
 * Reset all cached tool connections (useful for testing).
 */
export function resetToolCaches(): void {
  biologyTools = null;
  clinicalTrialsTools = null;
  pubmedTools = null;
  safetyTools = null;
}
