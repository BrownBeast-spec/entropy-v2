import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerOpenFdaTools } from "../tools/openfda.js";

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

describe("OpenFDA Tools", () => {
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
      const cb = args[args.length - 1];
      registeredTools.set(name, {
        handler: cb as (...a: unknown[]) => unknown,
      });
      return originalTool(...(args as Parameters<typeof originalTool>));
    }) as typeof server.tool;

    registerOpenFdaTools(server);
  });

  // ─── check_drug_safety ────────────────────────────────────────────────

  describe("check_drug_safety", () => {
    it("should return drug safety info with boxed warning", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          results: [
            {
              boxed_warning: ["Serious risk of infection"],
              contraindications: ["Do not use with X"],
              indications_and_usage: ["For treatment of Y"],
              dosage_and_administration: ["Take 40mg weekly"],
            },
          ],
        }),
      );

      const handler = registeredTools.get("check_drug_safety")!.handler;
      const result = (await handler({ drug: "Humira" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.drug).toBe("Humira");
      expect(parsed.risk_level).toBe("HIGH_RISK");
      expect(parsed.boxed_warning).toContain("Serious risk");
      expect(parsed.contraindications).toContain("Do not use");
      expect(parsed.indications).toContain("treatment of Y");
      expect(parsed.dosage).toContain("40mg");
    });

    it("should return Unknown risk when drug not found (404)", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(null, 404));

      const handler = registeredTools.get("check_drug_safety")!.handler;
      const result = (await handler({ drug: "FakeDrug" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.drug).toBe("FakeDrug");
      expect(parsed.risk_level).toBe("Unknown");
      expect(parsed.boxed_warning).toBe("N/A");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const handler = registeredTools.get("check_drug_safety")!.handler;
      const result = (await handler({ drug: "Humira" })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("Network failure");
    });

    it("should return Standard risk when no boxed warning", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          results: [
            {
              indications_and_usage: ["Pain relief"],
              dosage_and_administration: ["Take as needed"],
            },
          ],
        }),
      );

      const handler = registeredTools.get("check_drug_safety")!.handler;
      const result = (await handler({ drug: "Tylenol" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.risk_level).toBe("Standard");
      expect(parsed.boxed_warning).toBe("N/A");
    });
  });

  // ─── check_adverse_events ─────────────────────────────────────────────

  describe("check_adverse_events", () => {
    it("should return top adverse reactions", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          results: [
            { term: "NAUSEA", count: 5000 },
            { term: "HEADACHE", count: 3000 },
          ],
        }),
      );

      const handler = registeredTools.get("check_adverse_events")!.handler;
      const result = (await handler({ drug: "Aspirin", limit: 10 })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.drug).toBe("Aspirin");
      expect(parsed.top_reactions).toHaveLength(2);
      expect(parsed.top_reactions[0].reaction).toBe("NAUSEA");
      expect(parsed.top_reactions[0].count).toBe(5000);
    });

    it("should return empty reactions when not found (404)", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(null, 404));

      const handler = registeredTools.get("check_adverse_events")!.handler;
      const result = (await handler({ drug: "FakeDrug", limit: 10 })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.drug).toBe("FakeDrug");
      expect(parsed.top_reactions).toEqual([]);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Timeout"));

      const handler = registeredTools.get("check_adverse_events")!.handler;
      const result = (await handler({ drug: "Aspirin", limit: 10 })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("Timeout");
    });
  });

  // ─── check_recalls ────────────────────────────────────────────────────

  describe("check_recalls", () => {
    it("should return recall information", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          results: [
            {
              reason_for_recall: "Contamination",
              status: "Ongoing",
              report_date: "20240101",
              classification: "Class I",
            },
          ],
        }),
      );

      const handler = registeredTools.get("check_recalls")!.handler;
      const result = (await handler({ drug: "Metformin" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.drug).toBe("Metformin");
      expect(parsed.found).toBe(1);
      expect(parsed.recalls[0].reason).toBe("Contamination");
      expect(parsed.recalls[0].classification).toBe("Class I");
    });

    it("should return empty recalls when not found (404)", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(null, 404));

      const handler = registeredTools.get("check_recalls")!.handler;
      const result = (await handler({ drug: "FakeDrug" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.drug).toBe("FakeDrug");
      expect(parsed.found).toBe(0);
      expect(parsed.recalls).toEqual([]);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const handler = registeredTools.get("check_recalls")!.handler;
      const result = (await handler({ drug: "Metformin" })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("Connection refused");
    });
  });

  // ─── get_ndc_info ─────────────────────────────────────────────────────

  describe("get_ndc_info", () => {
    it("should return NDC directory info", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          results: [
            {
              brand_name: "ADVAIR DISKUS",
              generic_name: "FLUTICASONE PROPIONATE AND SALMETEROL",
              labeler_name: "GlaxoSmithKline",
              dosage_form: "POWDER",
              route: ["RESPIRATORY (INHALATION)"],
              active_ingredients: [{ name: "Fluticasone", strength: "250mcg" }],
            },
          ],
        }),
      );

      const handler = registeredTools.get("get_ndc_info")!.handler;
      const result = (await handler({ ndc: "0173-0715" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.ndc).toBe("0173-0715");
      expect(parsed.brand_name).toBe("ADVAIR DISKUS");
      expect(parsed.generic_name).toContain("FLUTICASONE");
      expect(parsed.labeler_name).toBe("GlaxoSmithKline");
      expect(parsed.route).toContain("RESPIRATORY (INHALATION)");
    });

    it("should return nulls when NDC not found (404)", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(null, 404));

      const handler = registeredTools.get("get_ndc_info")!.handler;
      const result = (await handler({ ndc: "0000-0000" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.ndc).toBe("0000-0000");
      expect(parsed.brand_name).toBeNull();
      expect(parsed.generic_name).toBeNull();
      expect(parsed.route).toEqual([]);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("DNS resolution failed"));

      const handler = registeredTools.get("get_ndc_info")!.handler;
      const result = (await handler({ ndc: "0173-0715" })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("DNS resolution failed");
    });
  });

  // ─── search_drugs_fda ─────────────────────────────────────────────────

  describe("search_drugs_fda", () => {
    it("should return drug search results", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          results: [
            {
              application_number: "NDA020702",
              sponsor_name: "ABBVIE INC",
              products: [
                {
                  brand_name: "HUMIRA",
                  dosage_form: "INJECTABLE",
                  marketing_status: "Prescription",
                },
              ],
            },
          ],
        }),
      );

      const handler = registeredTools.get("search_drugs_fda")!.handler;
      const result = (await handler({ query: "Humira", limit: 10 })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.query).toBe("Humira");
      expect(parsed.total_found).toBe(1);
      expect(parsed.drugs[0].brand_name).toBe("HUMIRA");
      expect(parsed.drugs[0].sponsor_name).toBe("ABBVIE INC");
    });

    it("should return empty results when not found (404)", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(null, 404));

      const handler = registeredTools.get("search_drugs_fda")!.handler;
      const result = (await handler({ query: "FakeDrug", limit: 10 })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.query).toBe("FakeDrug");
      expect(parsed.total_found).toBe(0);
      expect(parsed.drugs).toEqual([]);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Server error"));

      const handler = registeredTools.get("search_drugs_fda")!.handler;
      const result = (await handler({ query: "Humira", limit: 10 })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("Server error");
    });
  });

  // ─── get_drug_shortages ───────────────────────────────────────────────

  describe("get_drug_shortages", () => {
    it("should return drug shortage info", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          results: [
            {
              product_description: "Epinephrine Injection",
              status: "Currently in Shortage",
              reason: ["Manufacturing delays"],
            },
          ],
        }),
      );

      const handler = registeredTools.get("get_drug_shortages")!.handler;
      const result = (await handler({ drug: "Epinephrine" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.query).toBe("Epinephrine");
      expect(parsed.total_shortages).toBe(1);
      expect(parsed.shortages[0].product_description).toBe(
        "Epinephrine Injection",
      );
      expect(parsed.shortages[0].status).toBe("Currently in Shortage");
    });

    it("should return empty shortages when not found (404)", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(null, 404));

      const handler = registeredTools.get("get_drug_shortages")!.handler;
      const result = (await handler({ drug: "FakeDrug" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.query).toBe("FakeDrug");
      expect(parsed.total_shortages).toBe(0);
      expect(parsed.shortages).toEqual([]);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Rate limited"));

      const handler = registeredTools.get("get_drug_shortages")!.handler;
      const result = (await handler({ drug: "Epinephrine" })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("Rate limited");
    });

    it("should work without drug parameter for recent shortages", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          results: [
            {
              product_description: "Saline Solution",
              status: "Resolved",
              reason: [],
            },
          ],
        }),
      );

      const handler = registeredTools.get("get_drug_shortages")!.handler;
      const result = (await handler({})) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.query).toBeNull();
      expect(parsed.total_shortages).toBe(1);
    });
  });
});
