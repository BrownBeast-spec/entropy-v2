import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerMarketTools(server: McpServer): void {
  // ─── 1. Search Market Data ──────────────────────────────────────────
  server.tool(
    "search_market_data",
    "Search for market data on a drug or therapeutic area",
    {
      query: z.string().describe("Drug name or therapeutic area"),
      region: z.string().optional().default("global").describe("Market region"),
    },
    async ({ query, region }) => {
      const result = {
        _stub: true,
        query,
        region,
        message: "Phase 2 stub — IQVIA integration pending",
        market_size_usd: null,
        growth_rate: null,
        top_competitors: [] as string[],
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    },
  );

  // ─── 2. Get Competitive Landscape ───────────────────────────────────
  server.tool(
    "get_competitive_landscape",
    "Get competitive landscape for a therapeutic area",
    {
      therapeutic_area: z
        .string()
        .describe("Therapeutic area (e.g. 'Oncology')"),
      drug_class: z.string().optional().describe("Specific drug class"),
    },
    async ({ therapeutic_area, drug_class }) => {
      const result = {
        _stub: true,
        therapeutic_area,
        drug_class: drug_class ?? undefined,
        message: "Phase 2 stub — IQVIA integration pending",
        competitors: [] as string[],
        market_share: {} as Record<string, unknown>,
        pipeline_drugs: [] as string[],
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    },
  );
}
