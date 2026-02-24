import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerClinicalTrialsTools, registerPubMedTools } from "../index.js";

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

const describeIntegration = describe.skipIf(!process.env.RUN_INTEGRATION_TESTS);

describeIntegration("MCP Clinical integration", () => {
  let server: McpServer;
  let handlers: Map<string, ToolHandler>;

  beforeEach(() => {
    server = new McpServer({ name: "mcp-clinical-test", version: "0.0.1" });
    handlers = new Map();

    const originalTool = server.tool.bind(server);
    server.tool = ((...args: unknown[]) => {
      const name = args[0] as string;
      const handler = args[args.length - 1] as ToolHandler;
      handlers.set(name, handler);
      return originalTool(...(args as Parameters<typeof originalTool>));
    }) as typeof server.tool;

    registerClinicalTrialsTools(server);
    registerPubMedTools(server);
  });

  const getHandler = (name: string) => {
    const handler = handlers.get(name);
    if (!handler) {
      throw new Error(`Missing tool handler: ${name}`);
    }
    return handler;
  };

  it("search_studies returns ClinicalTrials.gov results", async () => {
    const result = await getHandler("search_studies")({
      term: "aspirin inflammation",
      limit: 3,
    });
    expect(result.isError).not.toBe(true);
    const parsed = JSON.parse(result.content[0].text) as {
      query?: string;
      total_found?: number;
      studies?: unknown[];
      error?: string;
    };
    expect(parsed.error).toBeUndefined();
    expect(parsed.query).toBe("aspirin inflammation");
    expect(Array.isArray(parsed.studies)).toBe(true);
  }, 30000);

  it("search_literature returns PubMed results", async () => {
    const result = await getHandler("search_literature")({
      disease: "aspirin inflammation",
      year: 2024,
      limit: 3,
    });
    expect(result.isError).not.toBe(true);
    const parsed = JSON.parse(result.content[0].text) as {
      topic?: string;
      total_found?: string;
      top_papers?: unknown[];
      error?: string;
    };
    expect(parsed.error).toBeUndefined();
    expect(parsed.topic).toBe("aspirin inflammation");
    expect(Array.isArray(parsed.top_papers)).toBe(true);
  }, 30000);
});
