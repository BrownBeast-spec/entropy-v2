import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerOpenTargetsTools,
  registerNcbiTools,
  registerEnsemblTools,
  registerUniprotTools,
} from "../index.js";

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

const describeIntegration = describe.skipIf(!process.env.RUN_INTEGRATION_TESTS);

describeIntegration("MCP Biology integration", () => {
  let server: McpServer;
  let handlers: Map<string, ToolHandler>;

  beforeEach(() => {
    server = new McpServer({ name: "mcp-biology-test", version: "0.0.1" });
    handlers = new Map();

    const originalTool = server.tool.bind(server);
    server.tool = ((...args: unknown[]) => {
      const name = args[0] as string;
      const handler = args[args.length - 1] as ToolHandler;
      handlers.set(name, handler);
      return originalTool(...(args as Parameters<typeof originalTool>));
    }) as typeof server.tool;

    registerOpenTargetsTools(server);
    registerNcbiTools(server);
    registerEnsemblTools(server);
    registerUniprotTools(server);
  });

  const getHandler = (name: string) => {
    const handler = handlers.get(name);
    if (!handler) {
      throw new Error(`Missing tool handler: ${name}`);
    }
    return handler;
  };

  it("validate_target returns OpenTargets data", async () => {
    const result = await getHandler("validate_target")({
      geneSymbol: "PPARG",
    });
    expect(result.isError).not.toBe(true);
    const parsed = JSON.parse(result.content[0].text) as {
      gene_symbol?: string;
      target_id?: string;
      top_associations?: unknown[];
      error?: string;
    };
    expect(parsed.error).toBeUndefined();
    expect(parsed.gene_symbol).toBe("PPARG");
    expect(typeof parsed.target_id).toBe("string");
    expect(Array.isArray(parsed.top_associations)).toBe(true);
  }, 30000);

  it("get_ncbi_gene_info returns NCBI gene data", async () => {
    const result = await getHandler("get_ncbi_gene_info")({
      geneSymbol: "PPARG",
    });
    expect(result.isError).not.toBe(true);
    const parsed = JSON.parse(result.content[0].text) as {
      gene_id?: string;
      symbol?: string;
      error?: string;
    };
    expect(parsed.error).toBeUndefined();
    expect(typeof parsed.gene_id).toBe("string");
    expect(parsed.symbol).toBeDefined();
  }, 30000);

  it("get_protein_data returns UniProt protein data", async () => {
    const result = await getHandler("get_protein_data")({
      accession: "P37231",
    });
    expect(result.isError).not.toBe(true);
    const parsed = JSON.parse(result.content[0].text) as {
      accession?: string;
      protein_name?: string | null;
      gene_name?: string | null;
      sequence_length?: number | null;
      error?: string;
    };
    expect(parsed.error).toBeUndefined();
    expect(parsed.accession).toBe("P37231");
    expect(parsed.sequence_length).not.toBeUndefined();
  }, 30000);

  it("get_gene_info returns Ensembl gene data", async () => {
    const result = await getHandler("get_gene_info")({
      symbol: "PPARG",
    });
    expect(result.isError).not.toBe(true);
    const parsed = JSON.parse(result.content[0].text) as {
      id?: string;
      display_name?: string | null;
      error?: string;
    };
    expect(parsed.error).toBeUndefined();
    expect(typeof parsed.id).toBe("string");
    expect(parsed.id).toMatch(/^ENSG/);
    expect(parsed.display_name).toBeDefined();
  }, 30000);
});
