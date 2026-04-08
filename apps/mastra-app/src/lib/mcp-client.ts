import { MCPClient } from "@mastra/mcp";
import type { Tool } from "@mastra/core/tools";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagesDir = resolve(__dirname, "../../../../packages");

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
      europepmc: {
        command: "node",
        args: [resolve(packagesDir, "mcp-europepmc/dist/server.js")],
      },
      patents: {
        command: "node",
        args: [resolve(packagesDir, "mcp-patents/dist/server.js")],
      },
      patentStrategy: {
        command: "node",
        args: [resolve(packagesDir, "mcp-patent-strategy/dist/server.js")],
      },
      commercialIntel: {
        command: "node",
        args: [resolve(packagesDir, "mcp-commercial-intel/dist/server.js")],
      },
      string: {
        command: "node",
        args: [resolve(packagesDir, "mcp-string/dist/server.js")],
      },
      pubchem: {
        command: "node",
        args: [resolve(packagesDir, "mcp-pubchem/dist/server.js")],
      },
    },
    timeout: 60_000,
  });

  return mcpClient;
}

type AnyTool = Tool<any, any, any, any>;

let toolsets: Record<string, Record<string, AnyTool>> | null = null;

async function getToolsets(): Promise<Record<string, Record<string, AnyTool>>> {
  if (toolsets) return toolsets;
  toolsets = await getMcpClient().listToolsets();
  return toolsets;
}

export async function getBiologyTools(): Promise<Record<string, AnyTool>> {
  const ts = await getToolsets();
  return ts.biology ?? {};
}

const CLINICAL_TRIALS_TOOL_NAMES = new Set([
  "search_studies",
  "get_study_details",
  "get_eligibility_criteria",
  "identify_clinical_whitespace",
  "get_approved_formulations",
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

export async function getSafetyTools(): Promise<Record<string, AnyTool>> {
  const ts = await getToolsets();
  return ts.safety ?? {};
}

export async function getEuropePMCTools(): Promise<Record<string, AnyTool>> {
  const ts = await getToolsets();
  return ts.europepmc ?? {};
}

export async function getPatentsTools(): Promise<Record<string, AnyTool>> {
  const ts = await getToolsets();
  return ts.patents ?? {};
}

export async function getPatentStrategyTools(): Promise<
  Record<string, AnyTool>
> {
  const ts = await getToolsets();
  return ts.patentStrategy ?? {};
}

export async function getCommercialIntelTools(): Promise<
  Record<string, AnyTool>
> {
  const ts = await getToolsets();
  return ts.commercialIntel ?? {};
}

export async function getSTRINGTools(): Promise<Record<string, AnyTool>> {
  const ts = await getToolsets();
  return ts.string ?? {};
}

export async function getPubChemTools(): Promise<Record<string, AnyTool>> {
  const ts = await getToolsets();
  return ts.pubchem ?? {};
}

export async function resetToolCaches(): Promise<void> {
  toolsets = null;
  if (mcpClient) {
    await mcpClient.disconnect();
    mcpClient = null;
  }
}
