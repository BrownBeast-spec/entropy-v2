import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerWebSearchTools } from "../tools/websearch.js";

describe("Web Search Tools", () => {
  let server: McpServer;
  let registeredTools: Map<
    string,
    { handler: (...args: unknown[]) => unknown }
  >;

  const originalEnv = process.env;

  beforeEach(() => {
    vi.stubEnv("ENABLE_PERPLEXITY", "");
    vi.stubEnv("PERPLEXITY_API_KEY", "");

    server = new McpServer({ name: "test", version: "0.0.1" });

    registeredTools = new Map();
    const originalTool = server.tool.bind(server);
    server.tool = ((...args: unknown[]) => {
      const name = args[0] as string;
      const cb = args[args.length - 1];
      registeredTools.set(name, {
        handler: cb as (...a: unknown[]) => unknown,
      });
      return originalTool(...(args as Parameters<typeof originalTool>));
    }) as typeof server.tool;

    registerWebSearchTools(server);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("web_search_sonar", () => {
    it("should be registered", () => {
      expect(registeredTools.has("web_search_sonar")).toBe(true);
    });

    it("should return stub response with _stub: true", async () => {
      const handler = registeredTools.get("web_search_sonar")!.handler;
      const result = (await handler({
        query: "cancer treatment breakthroughs",
        focus: "web",
      })) as { content: Array<{ type: string; text: string }> };

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed._stub).toBe(true);
      expect(parsed.query).toBe("cancer treatment breakthroughs");
      expect(parsed.focus).toBe("web");
      expect(parsed.message).toBe(
        "Phase 2 stub — Perplexity Sonar Pro integration pending",
      );
      expect(parsed.results).toEqual([]);
    });

    it("should return enabled: false when ENABLE_PERPLEXITY is not set", async () => {
      const handler = registeredTools.get("web_search_sonar")!.handler;
      const result = (await handler({
        query: "test query",
        focus: "web",
      })) as { content: Array<{ type: string; text: string }> };

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.enabled).toBe(false);
    });

    it("should return enabled: false when ENABLE_PERPLEXITY is true but no API key", async () => {
      vi.stubEnv("ENABLE_PERPLEXITY", "true");
      vi.stubEnv("PERPLEXITY_API_KEY", "");

      const handler = registeredTools.get("web_search_sonar")!.handler;
      const result = (await handler({
        query: "test query",
        focus: "web",
      })) as { content: Array<{ type: string; text: string }> };

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.enabled).toBe(false);
    });

    it("should return enabled: true when both ENABLE_PERPLEXITY and API key are set", async () => {
      vi.stubEnv("ENABLE_PERPLEXITY", "true");
      vi.stubEnv("PERPLEXITY_API_KEY", "pplx-test-key-123");

      const handler = registeredTools.get("web_search_sonar")!.handler;
      const result = (await handler({
        query: "pharma news",
        focus: "news",
      })) as { content: Array<{ type: string; text: string }> };

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.enabled).toBe(true);
      expect(parsed._stub).toBe(true);
      expect(parsed.focus).toBe("news");
    });

    it("should accept academic focus", async () => {
      const handler = registeredTools.get("web_search_sonar")!.handler;
      const result = (await handler({
        query: "EGFR mutations",
        focus: "academic",
      })) as { content: Array<{ type: string; text: string }> };

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.focus).toBe("academic");
      expect(parsed._stub).toBe(true);
    });
  });
});
