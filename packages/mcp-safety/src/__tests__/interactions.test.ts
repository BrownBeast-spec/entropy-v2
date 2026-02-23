import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerInteractionTools } from "../tools/interactions.js";

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

describe("Drug Interaction Tools", () => {
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

    registerInteractionTools(server);
  });

  describe("get_drug_interactions", () => {
    it("should return drug interactions by drug name", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          meta: { results: { total: 5 } },
          results: [
            {
              drug_interactions: [
                "Aspirin may increase the anticoagulant effect of Warfarin.",
              ],
              openfda: { brand_name: ["ASPIRIN TABLETS"] },
            },
            {
              drug_interactions: [
                "Concurrent use with NSAIDs may increase risk of GI bleeding.",
              ],
              openfda: { brand_name: ["BAYER ASPIRIN"] },
            },
          ],
        }),
      );

      const handler = registeredTools.get("get_drug_interactions")!.handler;
      const result = (await handler({ drug: "aspirin" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.drug).toBe("aspirin");
      expect(parsed.interaction_count).toBe(2);
      expect(parsed.source).toBe("OpenFDA Drug Labels");
      expect(parsed.interactions[0].brand_name).toBe("ASPIRIN TABLETS");
      expect(parsed.interactions[0].interaction_text).toContain("Warfarin");
      expect(parsed.interactions[1].brand_name).toBe("BAYER ASPIRIN");
    });

    it("should resolve RxCUI to drug name before querying", async () => {
      // First call: RxNav name resolution
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          propConceptGroup: {
            propConcept: [
              {
                propCategory: "NAMES",
                propName: "RxNorm Name",
                propValue: "aspirin",
              },
            ],
          },
        }),
      );
      // Second call: OpenFDA label query
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          results: [
            {
              drug_interactions: ["Interaction text here."],
              openfda: { brand_name: ["ASPIRIN"] },
            },
          ],
        }),
      );

      const handler = registeredTools.get("get_drug_interactions")!.handler;
      const result = (await handler({ drug: "1191" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.drug).toBe("aspirin");
      expect(parsed.interaction_count).toBe(1);
      // Verify RxNav was called first
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const firstCallUrl = mockFetch.mock.calls[0][0] as string;
      expect(firstCallUrl).toContain("rxnav.nlm.nih.gov");
      expect(firstCallUrl).toContain("1191");
    });

    it("should return error when RxCUI cannot be resolved", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          propConceptGroup: {
            propConcept: [],
          },
        }),
      );

      const handler = registeredTools.get("get_drug_interactions")!.handler;
      const result = (await handler({ drug: "99999" })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("Could not resolve RxCUI");
    });

    it("should return empty interactions when OpenFDA returns 404", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(null, 404));

      const handler = registeredTools.get("get_drug_interactions")!.handler;
      const result = (await handler({ drug: "someDrug" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.drug).toBe("someDrug");
      expect(parsed.interaction_count).toBe(0);
      expect(parsed.interactions).toEqual([]);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection timeout"));

      const handler = registeredTools.get("get_drug_interactions")!.handler;
      const result = (await handler({ drug: "aspirin" })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("Connection timeout");
    });

    it("should truncate long interaction text to 500 chars", async () => {
      const longText = "A".repeat(600);
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          results: [
            {
              drug_interactions: [longText],
              openfda: { brand_name: ["TEST DRUG"] },
            },
          ],
        }),
      );

      const handler = registeredTools.get("get_drug_interactions")!.handler;
      const result = (await handler({ drug: "testdrug" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.interactions[0].interaction_text.length).toBeLessThanOrEqual(
        501,
      ); // 500 + "…"
      expect(parsed.interactions[0].interaction_text).toContain("…");
    });

    it("should limit interactions to 10", async () => {
      const results = Array.from({ length: 15 }, (_, i) => ({
        drug_interactions: [`Interaction ${i}`],
        openfda: { brand_name: [`BRAND ${i}`] },
      }));

      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({ results }),
      );

      const handler = registeredTools.get("get_drug_interactions")!.handler;
      const result = (await handler({ drug: "aspirin" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      // Only 3 results are returned by the API (limit=3 in code),
      // but even if more come back, only 10 interactions are returned
      expect(parsed.interactions.length).toBeLessThanOrEqual(10);
    });
  });
});
