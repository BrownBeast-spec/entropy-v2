import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetBiologyTools = vi.fn();
const mockGetClinicalTrialsTools = vi.fn();
const mockGetPatentsTools = vi.fn();
const mockGetPubChemTools = vi.fn();
const mockEvaluateCompleteness = vi.fn();

vi.mock("@entropy/mastra-app/src/lib/mcp-client.js", () => ({
  getBiologyTools: mockGetBiologyTools,
  getClinicalTrialsTools: mockGetClinicalTrialsTools,
  getPatentsTools: mockGetPatentsTools,
  getPubChemTools: mockGetPubChemTools,
  getEuropePMCTools: vi.fn().mockResolvedValue({}),
  getPubMedTools: vi.fn().mockResolvedValue({}),
  getSTRINGTools: vi.fn().mockResolvedValue({}),
}));

vi.mock("@entropy/mastra-app/src/index.js", async () => {
  const actual = await vi.importActual("@entropy/mastra-app/src/index.js");
  return {
    ...actual,
    evaluateCompleteness: mockEvaluateCompleteness,
  };
});

vi.mock("@entropy/mastra-app/src/agents/completeness-agent.js", () => ({
  evaluateCompleteness: mockEvaluateCompleteness,
}));

const { app } = await import("../index.js");

function toolPayload(payload: Record<string, unknown>) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetBiologyTools.mockResolvedValue({});
  mockGetClinicalTrialsTools.mockResolvedValue({});
  mockGetPatentsTools.mockResolvedValue({});
  mockGetPubChemTools.mockResolvedValue({});
  mockEvaluateCompleteness.mockResolvedValue({
    score: 90,
    missingNodes: [],
    missingEdges: [],
  });
});

describe("POST /api/causaly/augment", () => {
  it("returns newNodes and newEdges arrays for a well-formed request", async () => {
    mockEvaluateCompleteness
      .mockResolvedValueOnce({
        score: 25,
        missingNodes: ["target"],
        missingEdges: [],
      })
      .mockResolvedValueOnce({
        score: 90,
        missingNodes: [],
        missingEdges: [],
      });

    mockGetBiologyTools.mockResolvedValue({
      validate_target: {
        execute: vi.fn().mockResolvedValue(
          toolPayload({
            target_id: "ENSG00000141510",
            gene_symbol: "TP53",
            association_score: 0.91,
          }),
        ),
      },
    });

    const res = await app.request("/api/causaly/augment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "metformin NASH",
        graphSnapshot: { nodeIds: [], edgeSummary: [] },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test-ws-1",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.newNodes)).toBe(true);
    expect(Array.isArray(body.newEdges)).toBe(true);
    expect(body.newNodes).toHaveLength(1);
    expect(body.newNodes[0].id).toBe("ENSG00000141510");
    expect(body).toHaveProperty("completenessScore");
    expect(body.iterationsRun).toBe(2);
  });

  it("returns empty delta when completeness score >= 85 on first iteration", async () => {
    mockEvaluateCompleteness.mockResolvedValue({
      score: 88,
      missingNodes: [],
      missingEdges: [],
    });

    const res = await app.request("/api/causaly/augment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "metformin NASH",
        graphSnapshot: { nodeIds: ["existing-1"], edgeSummary: [] },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test-ws-1",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.newNodes).toEqual([]);
    expect(body.newEdges).toEqual([]);
    expect(body.iterationsRun).toBe(1);
  });

  it("never exceeds 3 iterations regardless of completeness score", async () => {
    mockEvaluateCompleteness.mockResolvedValue({
      score: 20,
      missingNodes: ["target"],
      missingEdges: ["supporting-evidence"],
    });

    const res = await app.request("/api/causaly/augment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "metformin NASH",
        graphSnapshot: { nodeIds: [], edgeSummary: [] },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test-ws-1",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.iterationsRun).toBe(3);
    expect(mockEvaluateCompleteness).toHaveBeenCalledTimes(3);
  });

  it("includes failed source names in failedSources when an MCP tool throws", async () => {
    mockEvaluateCompleteness
      .mockResolvedValueOnce({
        score: 20,
        missingNodes: ["target", "trial"],
        missingEdges: [],
      })
      .mockResolvedValueOnce({
        score: 90,
        missingNodes: [],
        missingEdges: [],
      });

    mockGetBiologyTools.mockResolvedValue({
      validate_target: {
        execute: vi.fn().mockRejectedValue(new Error("biology unavailable")),
      },
    });

    mockGetClinicalTrialsTools.mockResolvedValue({
      search_studies: {
        execute: vi.fn().mockResolvedValue(
          toolPayload({
            studies: [
              {
                nct_id: "NCT00000001",
                title: "Metformin for NASH",
                status: "RECRUITING",
              },
            ],
          }),
        ),
      },
    });

    const res = await app.request("/api/causaly/augment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "metformin NASH",
        graphSnapshot: { nodeIds: [], edgeSummary: [] },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test-ws-1",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.failedSources).toContain("biology");
    expect(body.newNodes.some((node: { id: string }) => node.id === "NCT00000001")).toBe(true);
  });

  it("returns 400 for invalid request body", async () => {
    const res = await app.request("/api/causaly/augment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "",
        personaMode: "Researcher",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await app.request("/api/causaly/augment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("deduplicates nodes by id and merges provenance from repeated fetches", async () => {
    mockEvaluateCompleteness
      .mockResolvedValueOnce({
        score: 20,
        missingNodes: ["target"],
        missingEdges: [],
      })
      .mockResolvedValueOnce({
        score: 20,
        missingNodes: ["target"],
        missingEdges: [],
      })
      .mockResolvedValueOnce({
        score: 90,
        missingNodes: [],
        missingEdges: [],
      });

    mockGetBiologyTools.mockResolvedValue({
      validate_target: {
        execute: vi
          .fn()
          .mockResolvedValue(
            toolPayload({
              target_id: "ENSG00000141510",
              gene_symbol: "TP53",
              association_score: 0.91,
            }),
          )
          .mockResolvedValue(
            toolPayload({
              target_id: "ENSG00000141510",
              gene_symbol: "TP53",
              association_score: 0.94,
            }),
          ),
      },
    });

    const res = await app.request("/api/causaly/augment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "metformin NASH",
        graphSnapshot: { nodeIds: [], edgeSummary: [] },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test-ws-1",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.newNodes).toHaveLength(1);
    expect(body.newNodes[0].provenance.length).toBeGreaterThanOrEqual(2);
  });

  it("maps compound and patent missing node types to their sources", async () => {
    mockEvaluateCompleteness
      .mockResolvedValueOnce({
        score: 30,
        missingNodes: ["compound", "patent"],
        missingEdges: [],
      })
      .mockResolvedValueOnce({
        score: 90,
        missingNodes: [],
        missingEdges: [],
      });

    mockGetPubChemTools.mockResolvedValue({
      search_compounds: {
        execute: vi.fn().mockResolvedValue(
          toolPayload({
            compounds: [{ cid: 1983, iupac_name: "metformin" }],
          }),
        ),
      },
    });

    mockGetPatentsTools.mockResolvedValue({
      search_patents_by_drug: {
        execute: vi.fn().mockResolvedValue(
          toolPayload({
            patents: [
              { patent_number: "US1234567", title: "Metformin patent" },
            ],
          }),
        ),
      },
    });

    const res = await app.request("/api/causaly/augment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "metformin NASH",
        graphSnapshot: { nodeIds: [], edgeSummary: [] },
        personaMode: "Strategist",
        indiaLens: true,
        workspaceId: "test-ws-1",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.newNodes.some((node: { type: string }) => node.type === "compound")).toBe(true);
    expect(body.newNodes.some((node: { type: string }) => node.type === "patent")).toBe(true);
  });
});
