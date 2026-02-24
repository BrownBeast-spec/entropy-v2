import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerOpenFdaTools, registerInteractionTools } from "../index.js";

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

const describeIntegration = describe.skipIf(!process.env.RUN_INTEGRATION_TESTS);

describeIntegration("MCP Safety integration", () => {
  let server: McpServer;
  let handlers: Map<string, ToolHandler>;

  beforeEach(() => {
    server = new McpServer({ name: "mcp-safety-test", version: "0.0.1" });
    handlers = new Map();

    const originalTool = server.tool.bind(server);
    server.tool = ((...args: unknown[]) => {
      const name = args[0] as string;
      const handler = args[args.length - 1] as ToolHandler;
      handlers.set(name, handler);
      return originalTool(...(args as Parameters<typeof originalTool>));
    }) as typeof server.tool;

    registerOpenFdaTools(server);
    registerInteractionTools(server);
  });

  const getHandler = (name: string) => {
    const handler = handlers.get(name);
    if (!handler) {
      throw new Error(`Missing tool handler: ${name}`);
    }
    return handler;
  };

  it("check_drug_safety returns safety profile", async () => {
    const result = await getHandler("check_drug_safety")({ drug: "aspirin" });
    expect(result.isError).not.toBe(true);
    const parsed = JSON.parse(result.content[0].text) as {
      drug?: string;
      risk_level?: string;
      boxed_warning?: string;
      error?: string;
    };
    expect(parsed.error).toBeUndefined();
    expect(parsed.drug).toBe("aspirin");
    expect(typeof parsed.risk_level).toBe("string");
    expect(parsed.boxed_warning).toBeDefined();
  }, 30000);

  it("check_adverse_events returns FAERS reactions", async () => {
    const result = await getHandler("check_adverse_events")({
      drug: "aspirin",
      limit: 5,
    });
    expect(result.isError).not.toBe(true);
    const parsed = JSON.parse(result.content[0].text) as {
      drug?: string;
      top_reactions?: unknown[];
      error?: string;
    };
    expect(parsed.error).toBeUndefined();
    expect(parsed.drug).toBe("aspirin");
    expect(Array.isArray(parsed.top_reactions)).toBe(true);
  }, 30000);
});
