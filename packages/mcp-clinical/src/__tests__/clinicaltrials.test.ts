import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerClinicalTrialsTools } from "../tools/clinicaltrials.js";

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

describe("ClinicalTrials Tools", () => {
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

    registerClinicalTrialsTools(server);
  });

  describe("search_studies", () => {
    it("should search and return studies", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          totalCount: 42,
          studies: [
            {
              protocolSection: {
                identificationModule: {
                  nctId: "NCT00001234",
                  briefTitle: "Test Study on NSCLC",
                },
                statusModule: { overallStatus: "RECRUITING" },
                designModule: { phases: ["PHASE3"] },
                conditionsModule: {
                  conditions: ["Non-Small Cell Lung Cancer"],
                },
                armsInterventionsModule: {
                  interventions: [{ name: "Pembrolizumab" }],
                },
                contactsLocationsModule: {
                  locations: [
                    { facility: "Hospital A" },
                    { facility: "Hospital B" },
                  ],
                },
              },
            },
          ],
        }),
      );

      const handler = registeredTools.get("search_studies")!.handler;
      const result = (await handler({ term: "NSCLC", limit: 10 })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.query).toBe("NSCLC");
      expect(parsed.total_found).toBe(42);
      expect(parsed.studies).toHaveLength(1);
      expect(parsed.studies[0].nct_id).toBe("NCT00001234");
      expect(parsed.studies[0].title).toBe("Test Study on NSCLC");
      expect(parsed.studies[0].status).toBe("RECRUITING");
      expect(parsed.studies[0].phase).toEqual(["PHASE3"]);
      expect(parsed.studies[0].conditions).toContain(
        "Non-Small Cell Lung Cancer",
      );
      expect(parsed.studies[0].interventions).toContain("Pembrolizumab");
      expect(parsed.studies[0].locations).toBe(2);
    });

    it("should handle empty results", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          totalCount: 0,
          studies: [],
        }),
      );

      const handler = registeredTools.get("search_studies")!.handler;
      const result = (await handler({ term: "xyznonexistent", limit: 10 })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.total_found).toBe(0);
      expect(parsed.studies).toEqual([]);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const handler = registeredTools.get("search_studies")!.handler;
      const result = (await handler({ term: "cancer", limit: 5 })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("Connection refused");
    });

    it("should handle API errors (500)", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(null, 500));

      const handler = registeredTools.get("search_studies")!.handler;
      const result = (await handler({ term: "cancer", limit: 5 })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("ClinicalTrials API error");
    });

    it("should handle missing protocol sections gracefully", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          totalCount: 1,
          studies: [{ protocolSection: {} }],
        }),
      );

      const handler = registeredTools.get("search_studies")!.handler;
      const result = (await handler({ term: "test", limit: 5 })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.studies).toHaveLength(1);
      expect(parsed.studies[0].nct_id).toBeNull();
      expect(parsed.studies[0].title).toBeNull();
      expect(parsed.studies[0].phase).toEqual([]);
    });
  });

  describe("get_study_details", () => {
    it("should return detailed study info", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          protocolSection: {
            identificationModule: {
              nctId: "NCT00005678",
              briefTitle: "Detailed Trial",
            },
            statusModule: {
              overallStatus: "COMPLETED",
              startDateStruct: { date: "2020-01-15" },
              completionDateStruct: { date: "2023-06-30" },
            },
            designModule: { phases: ["PHASE2"] },
            conditionsModule: { conditions: ["Breast Cancer"] },
            armsInterventionsModule: {
              interventions: [{ name: "Trastuzumab" }],
            },
            eligibilityModule: {
              eligibilityCriteria: "Inclusion: Age >= 18",
            },
            descriptionModule: {
              briefSummary: "A study of trastuzumab for breast cancer.",
            },
            sponsorCollaboratorsModule: {
              leadSponsor: { name: "NIH" },
            },
          },
        }),
      );

      const handler = registeredTools.get("get_study_details")!.handler;
      const result = (await handler({ nctId: "NCT00005678" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.nct_id).toBe("NCT00005678");
      expect(parsed.title).toBe("Detailed Trial");
      expect(parsed.status).toBe("COMPLETED");
      expect(parsed.phase).toEqual(["PHASE2"]);
      expect(parsed.conditions).toContain("Breast Cancer");
      expect(parsed.interventions).toContain("Trastuzumab");
      expect(parsed.eligibility_criteria).toBe("Inclusion: Age >= 18");
      expect(parsed.start_date).toBe("2020-01-15");
      expect(parsed.completion_date).toBe("2023-06-30");
      expect(parsed.sponsor).toBe("NIH");
      expect(parsed.brief_summary).toContain("trastuzumab");
    });

    it("should return error when study not found (404)", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(null, 404));

      const handler = registeredTools.get("get_study_details")!.handler;
      const result = (await handler({ nctId: "NCT99999999" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("Study not found");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Timeout"));

      const handler = registeredTools.get("get_study_details")!.handler;
      const result = (await handler({ nctId: "NCT00001111" })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("Timeout");
    });
  });

  describe("get_eligibility_criteria", () => {
    it("should return eligibility criteria", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          protocolSection: {
            eligibilityModule: {
              eligibilityCriteria: "Must be 18+ years old",
              sex: "ALL",
              minimumAge: "18 Years",
              maximumAge: "75 Years",
              healthyVolunteers: "No",
            },
          },
        }),
      );

      const handler = registeredTools.get("get_eligibility_criteria")!.handler;
      const result = (await handler({ nctId: "NCT00001234" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.nct_id).toBe("NCT00001234");
      expect(parsed.eligibility_criteria).toBe("Must be 18+ years old");
      expect(parsed.sex).toBe("ALL");
      expect(parsed.minimum_age).toBe("18 Years");
      expect(parsed.maximum_age).toBe("75 Years");
      expect(parsed.healthy_volunteers).toBe("No");
    });

    it("should return error when study not found (404)", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse(null, 404));

      const handler = registeredTools.get("get_eligibility_criteria")!.handler;
      const result = (await handler({ nctId: "NCT99999999" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("Study not found");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("DNS lookup failed"));

      const handler = registeredTools.get("get_eligibility_criteria")!.handler;
      const result = (await handler({ nctId: "NCT00001234" })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("DNS lookup failed");
    });

    it("should handle missing eligibility fields gracefully", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          protocolSection: {
            eligibilityModule: {},
          },
        }),
      );

      const handler = registeredTools.get("get_eligibility_criteria")!.handler;
      const result = (await handler({ nctId: "NCT00001234" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.nct_id).toBe("NCT00001234");
      expect(parsed.eligibility_criteria).toBeNull();
      expect(parsed.sex).toBeNull();
      expect(parsed.minimum_age).toBeNull();
      expect(parsed.maximum_age).toBeNull();
      expect(parsed.healthy_volunteers).toBeNull();
    });
  });
});
