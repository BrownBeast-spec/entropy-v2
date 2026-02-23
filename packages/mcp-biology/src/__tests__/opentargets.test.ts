import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerOpenTargetsTools } from "../tools/opentargets.js";

// Mock global fetch
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

describe("OpenTargets Tools", () => {
  let server: McpServer;
  let registeredTools: Map<
    string,
    { handler: (...args: unknown[]) => unknown }
  >;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new McpServer({ name: "test", version: "0.0.1" });

    // Capture tool registrations
    registeredTools = new Map();
    const originalTool = server.tool.bind(server);
    server.tool = ((...args: unknown[]) => {
      const name = args[0] as string;
      // Find the callback (last argument that is a function)
      const cb = args[args.length - 1];
      registeredTools.set(name, {
        handler: cb as (...a: unknown[]) => unknown,
      });
      return originalTool(...(args as Parameters<typeof originalTool>));
    }) as typeof server.tool;

    registerOpenTargetsTools(server);
  });

  describe("validate_target", () => {
    it("should resolve a gene symbol and return target info", async () => {
      // First call: resolveTargetId search
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          data: {
            search: { hits: [{ id: "ENSG00000146648" }] },
          },
        }),
      );
      // Second call: target info
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          data: {
            target: {
              id: "ENSG00000146648",
              approvedSymbol: "EGFR",
              associatedDiseases: {
                rows: [
                  { disease: { name: "Lung Cancer" }, score: 0.95 },
                  { disease: { name: "Glioblastoma" }, score: 0.87 },
                ],
              },
            },
          },
        }),
      );

      const handler = registeredTools.get("validate_target")!.handler;
      const result = (await handler({ geneSymbol: "EGFR" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.agent).toBe("OpenTargets");
      expect(parsed.gene_symbol).toBe("EGFR");
      expect(parsed.target_id).toBe("ENSG00000146648");
      expect(parsed.top_associations).toHaveLength(2);
      expect(parsed.top_associations[0]).toContain("Lung Cancer");
    });

    it("should return error when gene not found", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          data: { search: { hits: [] } },
        }),
      );

      const handler = registeredTools.get("validate_target")!.handler;
      const result = (await handler({ geneSymbol: "FAKEGENE" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("not found");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const handler = registeredTools.get("validate_target")!.handler;
      const result = (await handler({ geneSymbol: "EGFR" })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("Network failure");
    });
  });

  describe("get_drug_info", () => {
    it("should return drug information", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          data: {
            drug: {
              id: "CHEMBL1743081",
              name: "Erlotinib",
              description: "EGFR inhibitor",
              maximumClinicalTrialPhase: 4,
              linkedDiseases: {
                rows: [{ name: "Non-small cell lung carcinoma" }],
              },
            },
          },
        }),
      );

      const handler = registeredTools.get("get_drug_info")!.handler;
      const result = (await handler({ drugId: "CHEMBL1743081" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.agent).toBe("OpenTargets");
      expect(parsed.drug_id).toBe("CHEMBL1743081");
      expect(parsed.name).toBe("Erlotinib");
      expect(parsed.max_clinical_phase).toBe(4);
      expect(parsed.linked_diseases).toContain("Non-small cell lung carcinoma");
    });

    it("should return error when drug not found", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({ data: { drug: null } }),
      );

      const handler = registeredTools.get("get_drug_info")!.handler;
      const result = (await handler({ drugId: "FAKE" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("not found");
    });
  });

  describe("get_disease_info", () => {
    it("should return disease information", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          data: {
            disease: {
              id: "EFO_0000685",
              name: "Non-small cell lung carcinoma",
              description: "A type of lung cancer",
              therapeuticAreas: [{ name: "Respiratory" }, { name: "Oncology" }],
            },
          },
        }),
      );

      const handler = registeredTools.get("get_disease_info")!.handler;
      const result = (await handler({ diseaseId: "EFO_0000685" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.agent).toBe("OpenTargets");
      expect(parsed.disease_id).toBe("EFO_0000685");
      expect(parsed.name).toBe("Non-small cell lung carcinoma");
      expect(parsed.therapeutic_areas).toContain("Oncology");
    });

    it("should return error when disease not found", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({ data: { disease: null } }),
      );

      const handler = registeredTools.get("get_disease_info")!.handler;
      const result = (await handler({ diseaseId: "FAKE" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("not found");
    });
  });
});
