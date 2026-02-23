import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createServer } from "../server.js";
import { registerOpenFdaTools, registerInteractionTools } from "../index.js";

// Mock global fetch to prevent real network calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("MCP Safety Server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a server instance", () => {
    const server = createServer();
    expect(server).toBeInstanceOf(McpServer);
  });

  it("should register all 7 tools", () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });

    const toolNames: string[] = [];
    const originalTool = server.tool.bind(server);
    server.tool = ((...args: unknown[]) => {
      const name = args[0] as string;
      toolNames.push(name);
      return originalTool(...(args as Parameters<typeof originalTool>));
    }) as typeof server.tool;

    registerOpenFdaTools(server);
    registerInteractionTools(server);

    expect(toolNames).toHaveLength(7);
    expect(toolNames).toContain("check_drug_safety");
    expect(toolNames).toContain("check_adverse_events");
    expect(toolNames).toContain("check_recalls");
    expect(toolNames).toContain("get_ndc_info");
    expect(toolNames).toContain("search_drugs_fda");
    expect(toolNames).toContain("get_drug_shortages");
    expect(toolNames).toContain("get_drug_interactions");
  });

  it("should export createServer function", async () => {
    const mod = await import("../index.js");
    expect(mod.createServer).toBeDefined();
    expect(typeof mod.createServer).toBe("function");
  });

  it("should export startServer function", async () => {
    const mod = await import("../index.js");
    expect(mod.startServer).toBeDefined();
    expect(typeof mod.startServer).toBe("function");
  });

  it("should export registerOpenFdaTools function", async () => {
    const mod = await import("../index.js");
    expect(mod.registerOpenFdaTools).toBeDefined();
    expect(typeof mod.registerOpenFdaTools).toBe("function");
  });

  it("should export registerInteractionTools function", async () => {
    const mod = await import("../index.js");
    expect(mod.registerInteractionTools).toBeDefined();
    expect(typeof mod.registerInteractionTools).toBe("function");
  });
});
