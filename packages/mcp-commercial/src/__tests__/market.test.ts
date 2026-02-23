import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerMarketTools } from "../tools/market.js";

describe("Market Tools", () => {
  let server: McpServer;
  let registeredTools: Map<
    string,
    { handler: (...args: unknown[]) => unknown }
  >;

  beforeEach(() => {
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

    registerMarketTools(server);
  });

  describe("search_market_data", () => {
    it("should be registered", () => {
      expect(registeredTools.has("search_market_data")).toBe(true);
    });

    it("should return stub response with _stub: true", async () => {
      const handler = registeredTools.get("search_market_data")!.handler;
      const result = (await handler({
        query: "Oncology",
        region: "global",
      })) as { content: Array<{ type: string; text: string }> };

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed._stub).toBe(true);
      expect(parsed.query).toBe("Oncology");
      expect(parsed.region).toBe("global");
      expect(parsed.message).toBe("Phase 2 stub — IQVIA integration pending");
      expect(parsed.market_size_usd).toBeNull();
      expect(parsed.growth_rate).toBeNull();
      expect(parsed.top_competitors).toEqual([]);
    });

    it("should use default region when not provided", async () => {
      const handler = registeredTools.get("search_market_data")!.handler;
      const result = (await handler({
        query: "Keytruda",
        region: "global",
      })) as { content: Array<{ type: string; text: string }> };

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed._stub).toBe(true);
      expect(parsed.query).toBe("Keytruda");
      expect(parsed.region).toBe("global");
    });

    it("should pass custom region through", async () => {
      const handler = registeredTools.get("search_market_data")!.handler;
      const result = (await handler({
        query: "Humira",
        region: "US",
      })) as { content: Array<{ type: string; text: string }> };

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.region).toBe("US");
      expect(parsed.query).toBe("Humira");
    });

    it("should return content with type text", async () => {
      const handler = registeredTools.get("search_market_data")!.handler;
      const result = (await handler({
        query: "test",
        region: "global",
      })) as { content: Array<{ type: string; text: string }> };

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
    });
  });

  describe("get_competitive_landscape", () => {
    it("should be registered", () => {
      expect(registeredTools.has("get_competitive_landscape")).toBe(true);
    });

    it("should return stub response with _stub: true", async () => {
      const handler = registeredTools.get("get_competitive_landscape")!.handler;
      const result = (await handler({
        therapeutic_area: "Oncology",
        drug_class: "PD-1 inhibitors",
      })) as { content: Array<{ type: string; text: string }> };

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed._stub).toBe(true);
      expect(parsed.therapeutic_area).toBe("Oncology");
      expect(parsed.drug_class).toBe("PD-1 inhibitors");
      expect(parsed.message).toBe("Phase 2 stub — IQVIA integration pending");
      expect(parsed.competitors).toEqual([]);
      expect(parsed.market_share).toEqual({});
      expect(parsed.pipeline_drugs).toEqual([]);
    });

    it("should work without drug_class", async () => {
      const handler = registeredTools.get("get_competitive_landscape")!.handler;
      const result = (await handler({
        therapeutic_area: "Cardiology",
      })) as { content: Array<{ type: string; text: string }> };

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed._stub).toBe(true);
      expect(parsed.therapeutic_area).toBe("Cardiology");
    });
  });
});
