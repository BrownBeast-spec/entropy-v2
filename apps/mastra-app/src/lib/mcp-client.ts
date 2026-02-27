import { MCPClient } from "@mastra/mcp";
import type { Tool } from "@mastra/core/tools";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ─── Resolve paths to MCP server entry points ─────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagesDir = resolve(__dirname, "../../../../packages");

// ─── MCPClient instance (lazy singleton) ───────────────────────────────────

let mcpClient: MCPClient | null = null;

function getMcpClient(): MCPClient {
  if (mcpClient) return mcpClient;

  mcpClient = new MCPClient({
    id: "entropy-mcp",
    servers: {
      biology: {
        command: "node",
        args: [resolve(packagesDir, "mcp-biology/dist/server.js")],
      },
      clinical: {
        command: "node",
        args: [resolve(packagesDir, "mcp-clinical/dist/server.js")],
      },
      safety: {
        command: "node",
        args: [resolve(packagesDir, "mcp-safety/dist/server.js")],
      },
    },
    timeout: 30_000,
  });

  return mcpClient;
}

// ─── Tool type alias ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTool = Tool<any, any, any, any>;

// ─── Lazy-initialized caches ───────────────────────────────────────────────

let toolsets: Record<string, Record<string, AnyTool>> | null = null;

async function getToolsets(): Promise<Record<string, Record<string, AnyTool>>> {
  if (toolsets) return toolsets;
  toolsets = await getMcpClient().listToolsets();
  return toolsets;
}

// ─── Per-server tool getters ───────────────────────────────────────────────

/**
 * Get all biology MCP tools (Open Targets, NCBI, Ensembl, UniProt).
 */
export async function getBiologyTools(): Promise<Record<string, AnyTool>> {
  const ts = await getToolsets();
  return ts.biology ?? {};
}

/**
 * Get clinical trials tools (ClinicalTrials.gov) from mcp-clinical.
 * Filters to only clinical trials tools, excluding PubMed tools.
 */
const CLINICAL_TRIALS_TOOL_NAMES = new Set([
  "search_studies",
  "get_study_details",
  "get_eligibility_criteria",
]);

export async function getClinicalTrialsTools(): Promise<
  Record<string, AnyTool>
> {
  const ts = await getToolsets();
  const clinical = ts.clinical ?? {};
  const filtered: Record<string, AnyTool> = {};
  for (const [name, tool] of Object.entries(clinical)) {
    if (CLINICAL_TRIALS_TOOL_NAMES.has(name)) {
      filtered[name] = tool;
    }
  }
  return filtered;
}

/**
 * Get PubMed tools (literature search) from mcp-clinical.
 * Filters to only PubMed tools, excluding clinical trials tools.
 */
const PUBMED_TOOL_NAMES = new Set([
  "search_literature",
  "search_preprints",
  "get_abstract",
  "get_paper_metadata",
]);

export async function getPubMedTools(): Promise<Record<string, AnyTool>> {
  const ts = await getToolsets();
  const clinical = ts.clinical ?? {};
  const filtered: Record<string, AnyTool> = {};
  for (const [name, tool] of Object.entries(clinical)) {
    if (PUBMED_TOOL_NAMES.has(name)) {
      filtered[name] = tool;
    }
  }
  return filtered;
}

/**
 * Get all safety MCP tools (OpenFDA, drug interactions).
 */
export async function getSafetyTools(): Promise<Record<string, AnyTool>> {
  const ts = await getToolsets();
  return ts.safety ?? {};
}

/**
 * Reset all cached tool connections (useful for testing).
 */
export async function resetToolCaches(): Promise<void> {
  toolsets = null;
  if (mcpClient) {
    await mcpClient.disconnect();
    mcpClient = null;
  }
}
