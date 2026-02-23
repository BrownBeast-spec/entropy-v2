import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerUniprotTools } from "../tools/uniprot.js";

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

const EGFR_ENTRY = {
  primaryAccession: "P00533",
  uniProtkbId: "EGFR_HUMAN",
  proteinDescription: {
    recommendedName: {
      fullName: { value: "Epidermal growth factor receptor" },
    },
  },
  genes: [{ geneName: { value: "EGFR" } }],
  organism: { scientificName: "Homo sapiens" },
  sequence: { length: 1210 },
  comments: [
    {
      commentType: "FUNCTION",
      texts: [
        {
          value: "Receptor tyrosine kinase binding ligands of the EGF family.",
        },
      ],
    },
    {
      commentType: "CATALYTIC ACTIVITY",
      reaction: {
        name: "ATP + protein L-tyrosine = ADP + protein L-tyrosine phosphate",
        ecNumber: "2.7.10.1",
      },
    },
    {
      commentType: "SUBCELLULAR LOCATION",
      subcellularLocations: [
        { location: { value: "Cell membrane" } },
        { location: { value: "Endosome" } },
      ],
    },
  ],
};

describe("UniProt Tools", () => {
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

    registerUniprotTools(server);
  });

  describe("get_protein_data", () => {
    it("should return protein data", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(EGFR_ENTRY));

      const handler = registeredTools.get("get_protein_data")!.handler;
      const result = (await handler({ accession: "P00533" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.agent).toBe("UniProt");
      expect(parsed.accession).toBe("P00533");
      expect(parsed.protein_name).toBe("Epidermal growth factor receptor");
      expect(parsed.gene_name).toBe("EGFR");
      expect(parsed.organism).toBe("Homo sapiens");
      expect(parsed.sequence_length).toBe(1210);
      expect(parsed.function_description).toContain("EGF family");
    });

    it("should return error for unknown protein", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(null, 404));

      const handler = registeredTools.get("get_protein_data")!.handler;
      const result = (await handler({ accession: "FAKE" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("not found");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const handler = registeredTools.get("get_protein_data")!.handler;
      const result = (await handler({ accession: "P00533" })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("ECONNREFUSED");
    });
  });

  describe("get_protein_function", () => {
    it("should return functional annotations", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(EGFR_ENTRY));

      const handler = registeredTools.get("get_protein_function")!.handler;
      const result = (await handler({ accession: "P00533" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.agent).toBe("UniProt");
      expect(parsed.accession).toBe("P00533");
      expect(parsed.functions).toHaveLength(1);
      expect(parsed.functions[0]).toContain("EGF family");
      expect(parsed.catalytic_activities).toHaveLength(1);
      expect(parsed.subcellular_locations).toContain("Cell membrane");
      expect(parsed.subcellular_locations).toContain("Endosome");
    });

    it("should return error for unknown protein", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(null, 404));

      const handler = registeredTools.get("get_protein_function")!.handler;
      const result = (await handler({ accession: "FAKE" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("not found");
    });
  });

  describe("search_uniprot", () => {
    it("should return search results", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          results: [
            {
              primaryAccession: "P00533",
              proteinDescription: {
                recommendedName: {
                  fullName: {
                    value: "Epidermal growth factor receptor",
                  },
                },
              },
              organism: { scientificName: "Homo sapiens" },
            },
            {
              primaryAccession: "Q9UHC9",
              proteinDescription: {
                recommendedName: {
                  fullName: { value: "Some other protein" },
                },
              },
              organism: { scientificName: "Mus musculus" },
            },
          ],
        }),
      );

      const handler = registeredTools.get("search_uniprot")!.handler;
      const result = (await handler({ query: "EGFR" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.agent).toBe("UniProt");
      expect(parsed.query).toBe("EGFR");
      expect(parsed.total_results).toBe(2);
      expect(parsed.results[0].accession).toBe("P00533");
      expect(parsed.results[0].protein_name).toBe(
        "Epidermal growth factor receptor",
      );
    });

    it("should return error for no results", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse({ results: null }));

      const handler = registeredTools.get("search_uniprot")!.handler;
      const result = (await handler({ query: "xyzfake" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("No results");
    });
  });
});
