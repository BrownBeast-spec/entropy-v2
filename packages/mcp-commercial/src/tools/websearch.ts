import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerWebSearchTools(server: McpServer): void {
  // ─── 1. Web Search Sonar ────────────────────────────────────────────
  server.tool(
    "web_search_sonar",
    "Search the web using Perplexity Sonar Pro (gated behind feature flag)",
    {
      query: z.string().describe("Search query"),
      focus: z.enum(["web", "academic", "news"]).optional().default("web"),
    },
    async ({ query, focus }) => {
      const enablePerplexity = process.env["ENABLE_PERPLEXITY"] === "true";
      const hasApiKey = Boolean(process.env["PERPLEXITY_API_KEY"]);

      const result = {
        _stub: true,
        query,
        focus,
        enabled: enablePerplexity && hasApiKey,
        message: "Phase 2 stub — Perplexity Sonar Pro integration pending",
        results: [] as string[],
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    },
  );
}
