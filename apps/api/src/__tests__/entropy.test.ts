import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetBiologyTools = vi.fn();
const mockGetClinicalTrialsTools = vi.fn();
const mockGetEuropePMCTools = vi.fn();
const mockGetPatentsTools = vi.fn();
const mockGetPubChemTools = vi.fn();
const mockGetPubMedTools = vi.fn();
const mockGetSTRINGTools = vi.fn();

vi.mock("@entropy/mastra-app/src/lib/mcp-client.js", () => ({
  getBiologyTools: mockGetBiologyTools,
  getClinicalTrialsTools: mockGetClinicalTrialsTools,
  getEuropePMCTools: mockGetEuropePMCTools,
  getPatentsTools: mockGetPatentsTools,
  getPubChemTools: mockGetPubChemTools,
  getPubMedTools: mockGetPubMedTools,
  getSTRINGTools: mockGetSTRINGTools,
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
  mockGetEuropePMCTools.mockResolvedValue({});
  mockGetPatentsTools.mockResolvedValue({});
  mockGetPubChemTools.mockResolvedValue({});
  mockGetPubMedTools.mockResolvedValue({});
  mockGetSTRINGTools.mockResolvedValue({});
});

describe("GET /api/entropy/search", () => {
  it("deduplicates results across selected sources", async () => {
    mockGetPubMedTools.mockResolvedValue({
      search_literature: {
        execute: vi.fn().mockResolvedValue(
          toolPayload({
            top_papers: [
              {
                pmid: "123",
                title: "Metformin paper",
                abstract: "Key literature evidence",
                url: "https://doi.org/10.1000/example",
              },
            ],
          }),
        ),
      },
    });

    mockGetEuropePMCTools.mockResolvedValue({
      search_europepmc: {
        execute: vi.fn().mockResolvedValue(
          toolPayload({
            papers: [
              {
                id: "ABC",
                title: "Same paper duplicate",
                abstract: "Duplicate source",
                source: "MED",
                url: "https://doi.org/10.1000/example",
              },
            ],
          }),
        ),
      },
    });

    const res = await app.request(
      "/api/entropy/search?q=metformin&types=literature,preprints&limit=5",
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.query).toBe("metformin");
    expect(body.query_plan).toBeDefined();
    expect(body.total_results).toBe(1);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].url).toBe("https://doi.org/10.1000/example");
    expect(Array.isArray(body.results[0].citations)).toBe(true);
    expect(body.results[0].citations.length).toBeGreaterThan(0);
    expect(body.summary).toBeDefined();
    expect(body.summary.generated_by).toBe("fallback");
  });

  it("returns 400 for invalid types query param", async () => {
    const res = await app.request(
      "/api/entropy/search?q=metformin&types=not-a-type",
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns an error bag when a selected source tool is missing", async () => {
    mockGetPubMedTools.mockResolvedValue({});

    const res = await app.request(
      "/api/entropy/search?q=metformin&types=literature",
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total_results).toBe(0);
    expect(body.errors).toBeDefined();
    expect(body.errors.literature).toContain("not available");
    expect(body.summary).toBeDefined();
    expect(body.summary.generated_by).toBe("fallback");
  });
});

describe("POST /api/entropy/search", () => {
  it("returns trial results for valid request", async () => {
    mockGetClinicalTrialsTools.mockResolvedValue({
      search_studies: {
        execute: vi.fn().mockResolvedValue(
          toolPayload({
            studies: [
              {
                nct_id: "NCT00000001",
                title: "Metformin in diabetes",
                status: "RECRUITING",
                phase: ["PHASE2"],
                conditions: ["Type 2 Diabetes"],
                interventions: ["Metformin"],
              },
            ],
          }),
        ),
      },
    });

    const res = await app.request("/api/entropy/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: "metformin", types: ["trials"], limit: 3 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total_results).toBe(1);
    expect(body.results[0].type).toBe("trials");
    expect(body.results[0].id).toBe("NCT00000001");
    expect(Array.isArray(body.results[0].citations)).toBe(true);
    expect(body.results[0].citations[0].source).toBe("ClinicalTrials.gov");
    expect(body.summary).toBeDefined();
  });

  it("returns 400 on invalid body", async () => {
    const res = await app.request("/api/entropy/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
