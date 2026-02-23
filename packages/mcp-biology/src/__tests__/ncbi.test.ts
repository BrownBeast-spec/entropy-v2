import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerNcbiTools } from "../tools/ncbi.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeJsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
    headers: new Headers(),
  } as unknown as Response;
}

describe("NCBI Tools", () => {
  let server: McpServer;
  let registeredTools: Map<
    string,
    { handler: (...args: unknown[]) => unknown }
  >;

  beforeEach(() => {
    vi.clearAllMocks();
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

    registerNcbiTools(server);
  });

  describe("get_ncbi_gene_info", () => {
    it("should return gene info from NCBI", async () => {
      // esearch response
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          esearchresult: { idlist: ["672"] },
        }),
      );
      // esummary response
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          result: {
            "672": {
              name: "BRCA1",
              description: "BRCA1 DNA repair associated",
            },
          },
        }),
      );

      const handler = registeredTools.get("get_ncbi_gene_info")!.handler;
      const result = (await handler({ geneSymbol: "BRCA1" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.agent).toBe("NCBI");
      expect(parsed.gene_id).toBe("672");
      expect(parsed.symbol).toBe("BRCA1");
      expect(parsed.description).toContain("BRCA1");
    });

    it("should return error when gene not found", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          esearchresult: { idlist: [] },
        }),
      );

      const handler = registeredTools.get("get_ncbi_gene_info")!.handler;
      const result = (await handler({ geneSymbol: "FAKEGENE" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("not found");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection timeout"));

      const handler = registeredTools.get("get_ncbi_gene_info")!.handler;
      const result = (await handler({ geneSymbol: "BRCA1" })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("Connection timeout");
    });
  });

  describe("get_ncbi_protein_info", () => {
    it("should return protein info from NCBI", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          result: {
            NP_000483: {
              title: "BRCA1 protein",
              organism: "Homo sapiens",
            },
          },
        }),
      );

      const handler = registeredTools.get("get_ncbi_protein_info")!.handler;
      const result = (await handler({ proteinId: "NP_000483" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.agent).toBe("NCBI");
      expect(parsed.protein_id).toBe("NP_000483");
      expect(parsed.title).toBe("BRCA1 protein");
      expect(parsed.organism).toBe("Homo sapiens");
    });

    it("should return error when protein not found", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          result: {},
        }),
      );

      const handler = registeredTools.get("get_ncbi_protein_info")!.handler;
      const result = (await handler({ proteinId: "FAKE" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("not found");
    });
  });
});
