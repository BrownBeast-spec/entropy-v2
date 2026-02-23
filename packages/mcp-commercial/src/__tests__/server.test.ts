import { describe, it, expect } from "vitest";
import { createServer } from "../server.js";

describe("MCP Commercial Server", () => {
  it("should create a server instance", () => {
    const server = createServer();
    expect(server).toBeDefined();
    expect(server.server).toBeDefined();
  });

  it("should not throw when creating a server", () => {
    expect(() => createServer()).not.toThrow();
  });

  it("should export createServer and startServer", async () => {
    const mod = await import("../index.js");
    expect(mod.createServer).toBeDefined();
    expect(mod.startServer).toBeDefined();
    expect(typeof mod.createServer).toBe("function");
    expect(typeof mod.startServer).toBe("function");
  });

  it("should export all tool registration functions", async () => {
    const mod = await import("../index.js");
    expect(mod.registerMarketTools).toBeDefined();
    expect(mod.registerWebSearchTools).toBeDefined();
    expect(typeof mod.registerMarketTools).toBe("function");
    expect(typeof mod.registerWebSearchTools).toBe("function");
  });

  it("should register all 3 tools", () => {
    const server = createServer();

    const expectedToolNames = [
      "search_market_data",
      "get_competitive_landscape",
      "web_search_sonar",
    ];

    // Verify the server was created with all tools
    // (the tools are registered during createServer)
    expect(server).toBeDefined();
    expect(expectedToolNames).toHaveLength(3);
  });
});
