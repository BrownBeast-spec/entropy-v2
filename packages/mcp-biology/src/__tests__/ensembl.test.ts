import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerEnsemblTools } from "../tools/ensembl.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeJsonResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
    headers: new Headers(headers),
  } as unknown as Response;
}

describe("Ensembl Tools", () => {
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

    registerEnsemblTools(server);
  });

  describe("get_gene_info", () => {
    it("should return gene information", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          id: "ENSG00000139618",
          display_name: "BRCA2",
          description: "BRCA2 DNA repair associated",
          biotype: "protein_coding",
          start: 32315474,
          end: 32400266,
        }),
      );

      const handler = registeredTools.get("get_gene_info")!.handler;
      const result = (await handler({ symbol: "BRCA2" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.agent).toBe("Ensembl");
      expect(parsed.id).toBe("ENSG00000139618");
      expect(parsed.display_name).toBe("BRCA2");
      expect(parsed.biotype).toBe("protein_coding");
      expect(parsed.start).toBe(32315474);
    });

    it("should return error when gene not found (404)", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(null, 404));

      const handler = registeredTools.get("get_gene_info")!.handler;
      const result = (await handler({ symbol: "FAKEGENE" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("not found");
    });
  });

  describe("get_sequence", () => {
    it("should return truncated sequence", async () => {
      const longSeq = "ATCG".repeat(200); // 800 chars
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          seq: longSeq,
          desc: "Test gene sequence",
        }),
      );

      const handler = registeredTools.get("get_sequence")!.handler;
      const result = (await handler({ geneId: "ENSG00000139618" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.id).toBe("ENSG00000139618");
      expect(parsed.sequence.length).toBeLessThanOrEqual(504); // 500 + "..."
      expect(parsed.sequence.endsWith("...")).toBe(true);
      expect(parsed.desc).toBe("Test gene sequence");
    });

    it("should handle missing sequence", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(null, 404));

      const handler = registeredTools.get("get_sequence")!.handler;
      const result = (await handler({ geneId: "FAKE" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("not found");
    });
  });

  describe("get_variation", () => {
    it("should return variant information", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          name: "rs56116432",
          most_severe_consequence: "missense_variant",
          minor_allele: "T",
          minor_allele_freq: 0.015,
        }),
      );

      const handler = registeredTools.get("get_variation")!.handler;
      const result = (await handler({
        variantId: "rs56116432",
        species: "human",
      })) as { content: Array<{ type: string; text: string }> };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.agent).toBe("Ensembl");
      expect(parsed.variant_id).toBe("rs56116432");
      expect(parsed.most_severe_consequence).toBe("missense_variant");
      expect(parsed.minor_allele_freq).toBe(0.015);
    });

    it("should handle 404 for unknown variant", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(null, 404));

      const handler = registeredTools.get("get_variation")!.handler;
      const result = (await handler({
        variantId: "rs000",
        species: "human",
      })) as { content: Array<{ type: string; text: string }> };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("not found");
    });
  });

  describe("get_homology", () => {
    it("should return homologs", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          data: [
            {
              homologies: [
                {
                  type: "ortholog_one2one",
                  target: { species: "mus_musculus", perc_id: 85.5 },
                },
                {
                  type: "paralog",
                  target: { species: "homo_sapiens", perc_id: 45.2 },
                },
              ],
            },
          ],
        }),
      );

      const handler = registeredTools.get("get_homology")!.handler;
      const result = (await handler({
        geneId: "ENSG00000139618",
        species: "human",
      })) as { content: Array<{ type: string; text: string }> };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.agent).toBe("Ensembl");
      expect(parsed.total_homologs).toBe(2);
      expect(parsed.homologs[0].type).toBe("ortholog_one2one");
      expect(parsed.homologs[0].species).toBe("mus_musculus");
    });

    it("should handle no homologs", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse({ data: [] }));

      const handler = registeredTools.get("get_homology")!.handler;
      const result = (await handler({
        geneId: "ENSG00000000000",
        species: "human",
      })) as { content: Array<{ type: string; text: string }> };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.total_homologs).toBe(0);
      expect(parsed.homologs).toEqual([]);
    });
  });

  describe("get_xrefs", () => {
    it("should return cross-references", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse([
          { dbname: "UniProt/Swiss-Prot" },
          { dbname: "HGNC" },
          { dbname: "UniProt/Swiss-Prot" },
          { dbname: "RefSeq" },
        ]),
      );

      const handler = registeredTools.get("get_xrefs")!.handler;
      const result = (await handler({
        geneId: "ENSG00000139618",
      })) as { content: Array<{ type: string; text: string }> };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.agent).toBe("Ensembl");
      expect(parsed.gene_id).toBe("ENSG00000139618");
      expect(parsed.total_xrefs).toBe(4);
      expect(parsed.databases).toContain("UniProt/Swiss-Prot");
      expect(parsed.databases).toContain("HGNC");
      expect(parsed.databases).toContain("RefSeq");
      // Deduplication: UniProt/Swiss-Prot appears once in databases
      expect(
        parsed.databases.filter((d: string) => d === "UniProt/Swiss-Prot"),
      ).toHaveLength(1);
    });

    it("should handle missing gene", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(null, 404));

      const handler = registeredTools.get("get_xrefs")!.handler;
      const result = (await handler({
        geneId: "FAKE",
      })) as { content: Array<{ type: string; text: string }> };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("not found");
    });
  });
});
