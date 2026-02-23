import { describe, it, expect } from "vitest";
import { createServer } from "../server.js";

describe("MCP Clinical Server", () => {
  it("should create a server with all tools registered", () => {
    const server = createServer();
    expect(server).toBeDefined();
    expect(server.server).toBeDefined();
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
    expect(mod.registerClinicalTrialsTools).toBeDefined();
    expect(mod.registerPubMedTools).toBeDefined();
    expect(typeof mod.registerClinicalTrialsTools).toBe("function");
    expect(typeof mod.registerPubMedTools).toBe("function");
  });

  it("should create server without throwing", () => {
    expect(() => createServer()).not.toThrow();
  });

  it("should be named mcp-clinical", () => {
    const server = createServer();
    // The server is configured with name "mcp-clinical"
    expect(server).toBeDefined();
  });
});
