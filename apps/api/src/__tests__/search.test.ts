import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const mockScoreHelpfulness = vi.fn();
const mockGetBiologyTools = vi.fn();
const mockGetClinicalTrialsTools = vi.fn();
const mockGetEuropePMCTools = vi.fn();
const mockGetPatentsTools = vi.fn();
const mockGetPubChemTools = vi.fn();
const mockGetPubMedTools = vi.fn();
const mockGetSTRINGTools = vi.fn();

vi.mock("@entropy/mastra-app/src/index.js", () => {
  return {
    scoreHelpfulness: mockScoreHelpfulness,
  };
});

vi.mock("@entropy/mastra-app/src/lib/mcp-client.js", () => {
  return {
    getBiologyTools: mockGetBiologyTools,
    getClinicalTrialsTools: mockGetClinicalTrialsTools,
    getEuropePMCTools: mockGetEuropePMCTools,
    getPatentsTools: mockGetPatentsTools,
    getPubChemTools: mockGetPubChemTools,
    getPubMedTools: mockGetPubMedTools,
    getSTRINGTools: mockGetSTRINGTools,
  };
});

const { createSearchRoute } = await import("../routes/entropy.js");

describe("POST /api/entropy/search", () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetBiologyTools.mockResolvedValue({});
    mockGetClinicalTrialsTools.mockResolvedValue({});
    mockGetEuropePMCTools.mockResolvedValue({});
    mockGetPatentsTools.mockResolvedValue({});
    mockGetPubChemTools.mockResolvedValue({});
    mockGetPubMedTools.mockResolvedValue({});
    mockGetSTRINGTools.mockResolvedValue({});

    app = new Hono();
    app.route("/api/entropy", createSearchRoute());
  });

  it("should return scored results sorted by helpfulness", async () => {
    mockGetBiologyTools.mockResolvedValue({
      searchTargets: vi.fn().mockResolvedValue([
        {
          id: "ENSG00001",
          type: "protein",
          label: "AMPK",
          metadata: { pathway: "AMPK signaling" },
        },
      ]),
    });

    mockScoreHelpfulness.mockResolvedValue({
      score: 85,
      explanation: "Fills gap: AMPK pathway",
      gapsFilled: ["pathway:AMPK signaling"],
    });

    const response = await app.request("/api/entropy/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "AMPK targets",
        graphSnapshot: {
          nodeIds: [],
          edgeSummary: [],
        },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test-workspace",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.results).toHaveLength(1);
    expect(data.results[0].entityId).toBe("ENSG00001");
    expect(data.results[0].helpfulness.score).toBe(85);
    expect(data.results[0].helpfulness.explanation).toContain("gap");
    expect(data.searchedSources).toContain("Open Targets");
  });

  it("should fallback to search_uniprot tool when searchTargets is unavailable", async () => {
    mockGetBiologyTools.mockResolvedValue({
      search_uniprot: {
        execute: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                agent: "UniProt",
                query: "ampk",
                total_results: 1,
                results: [
                  {
                    accession: "P54646",
                    protein_name: "AMP-activated protein kinase",
                    organism: "Homo sapiens",
                  },
                ],
              }),
            },
          ],
        }),
      },
    });

    mockScoreHelpfulness.mockResolvedValue({
      score: 78,
      explanation: "Relevant protein target",
      gapsFilled: ["pathway:ampk"],
    });

    const response = await app.request("/api/entropy/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "ampk",
        graphSnapshot: {
          nodeIds: [],
          edgeSummary: [],
        },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test-workspace",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.results).toHaveLength(1);
    expect(data.results[0].entityId).toBe("P54646");
    expect(data.results[0].source).toBe("UniProt");
    expect(data.searchedSources).toContain("UniProt");
  });

  it("should fan out across multiple manual-search sources when available", async () => {
    mockGetBiologyTools.mockResolvedValue({
      search_targets: {
        execute: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                targets: [
                  {
                    id: "ENSG000001",
                    entityType: "protein",
                    label: "AMPK alpha-1",
                    metadata: { sourceType: "target" },
                  },
                ],
              }),
            },
          ],
        }),
      },
    });
    mockGetPubMedTools.mockResolvedValue({
      search_literature: {
        execute: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                top_papers: [
                  {
                    pmid: "12345",
                    title: "Metformin reduces hepatic glucose production",
                    abstract: "Clinical and mechanistic evidence",
                  },
                ],
              }),
            },
          ],
        }),
      },
    });

    mockScoreHelpfulness.mockResolvedValue({
      score: 64,
      explanation: "Fills graph gaps",
      gapsFilled: ["pathway:ampk"],
    });

    const response = await app.request("/api/entropy/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "metformin",
        graphSnapshot: {
          nodeIds: [],
          edgeSummary: [],
        },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test-workspace",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.results.length).toBeGreaterThan(0);
    expect(data.searchedSources).toContain("Open Targets");
    expect(data.searchedSources).toContain("PubMed");
  });

  it("should include per-source diagnostics when manual search fanout has unavailable sources", async () => {
    mockGetBiologyTools.mockResolvedValue({
      search_uniprot: {
        execute: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                results: [
                  {
                    accession: "Q96FL8",
                    protein_name: "Multidrug and toxin extrusion protein 1",
                    organism: "Homo sapiens",
                  },
                ],
              }),
            },
          ],
        }),
      },
    });
    mockGetPubMedTools.mockResolvedValue({});
    mockGetEuropePMCTools.mockResolvedValue({});
    mockGetPatentsTools.mockResolvedValue({});
    mockGetPubChemTools.mockResolvedValue({});
    mockGetClinicalTrialsTools.mockResolvedValue({});

    mockScoreHelpfulness.mockResolvedValue({
      score: 42,
      explanation: "Novel entity",
      gapsFilled: [],
    });

    const response = await app.request("/api/entropy/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "metformin",
        graphSnapshot: {
          nodeIds: [],
          edgeSummary: [],
        },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test-workspace",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.results).toHaveLength(1);
    expect(data.searchedSources).toContain("UniProt");
    expect(data.sourceDiagnostics).toBeDefined();
    expect(data.sourceDiagnostics.PubMed).toContain("not available");
  });

  it("should report patents as diagnostics-only during migration window", async () => {
    mockGetBiologyTools.mockResolvedValue({
      search_uniprot: {
        execute: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                results: [
                  {
                    accession: "Q96FL8",
                    protein_name: "Multidrug and toxin extrusion protein 1",
                    organism: "Homo sapiens",
                  },
                ],
              }),
            },
          ],
        }),
      },
    });

    mockScoreHelpfulness.mockResolvedValue({
      score: 42,
      explanation: "Novel entity",
      gapsFilled: [],
    });

    const response = await app.request("/api/entropy/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "metformin",
        graphSnapshot: {
          nodeIds: [],
          edgeSummary: [],
        },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test-workspace",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.results).toHaveLength(1);
    expect(data.sourceDiagnostics).toBeDefined();
    expect(data.sourceDiagnostics.PatentsView).toContain(
      "USPTO ODP migration",
    );
  });

  it("should preserve source diversity in top manual search results", async () => {
    mockGetBiologyTools.mockResolvedValue({
      search_uniprot: {
        execute: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                results: [
                  {
                    accession: "Q96FL8",
                    protein_name: "Multidrug and toxin extrusion protein 1",
                    organism: "Homo sapiens",
                  },
                  {
                    accession: "Q86VL8",
                    protein_name: "Multidrug and toxin extrusion protein 2",
                    organism: "Homo sapiens",
                  },
                ],
              }),
            },
          ],
        }),
      },
    });

    mockGetClinicalTrialsTools.mockResolvedValue({
      search_studies: {
        execute: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                studies: [
                  {
                    nct_id: "NCT000001",
                    title: "Metformin active surveillance trial",
                  },
                  {
                    nct_id: "NCT000002",
                    title: "Metformin phase 2 trial",
                  },
                  {
                    nct_id: "NCT000003",
                    title: "Metformin phase 3 trial",
                  },
                ],
              }),
            },
          ],
        }),
      },
    });

    mockGetEuropePMCTools.mockResolvedValue({
      search_europepmc: {
        execute: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                papers: [
                  {
                    id: "PPR1001",
                    title: "Metformin oncology paper",
                  },
                  {
                    id: "PPR1002",
                    title: "Metformin endocrinology paper",
                  },
                ],
              }),
            },
          ],
        }),
      },
    });

    mockGetPubMedTools.mockResolvedValue({
      search_literature: {
        execute: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                top_papers: [
                  {
                    pmid: "12345",
                    title: "Metformin mechanism paper",
                  },
                  {
                    pmid: "12346",
                    title: "Metformin outcomes paper",
                  },
                ],
              }),
            },
          ],
        }),
      },
    });

    mockScoreHelpfulness.mockImplementation(
      async ({ result }: { result: { source: string } }) => {
        if (result.source === "UniProt") {
          return {
            score: 1,
            explanation: "Low novelty",
            gapsFilled: [],
          };
        }

        return {
          score: 34,
          explanation: "Adds underrepresented type",
          gapsFilled: [],
        };
      },
    );

    const response = await app.request("/api/entropy/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "metformin",
        graphSnapshot: {
          nodeIds: ["N1", "N2"],
          edgeSummary: [],
        },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test-workspace",
        maxResults: 4,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    const sources = new Set(
      data.results.map((result: { source: string }) => result.source),
    );
    expect(sources.has("UniProt")).toBe(true);
    expect(sources.size).toBeGreaterThan(1);
  });

  it("should include Open Targets results via unified target lookup for manual requests", async () => {
    mockGetBiologyTools.mockResolvedValue({
      validate_target: {
        execute: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                target_id: "ENSG00000164258",
                gene_symbol: "SLC29A4",
                top_associations: ["Type 2 diabetes"],
              }),
            },
          ],
        }),
      },
      search_uniprot: {
        execute: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: JSON.stringify({ results: [] }) }],
        }),
      },
    });

    mockScoreHelpfulness.mockResolvedValue({
      score: 55,
      explanation: "Relevant target",
      gapsFilled: ["target:metformin"],
    });

    const response = await app.request("/api/entropy/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "metformin",
        graphSnapshot: {
          nodeIds: [],
          edgeSummary: [],
        },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test-workspace",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.searchedSources).toContain("Open Targets");
    expect(
      data.results.some(
        (result: { source: string; entityId: string }) =>
          result.source === "Open Targets" &&
          result.entityId === "ENSG00000164258",
      ),
    ).toBe(true);
  });

  it("should use planner-derived terms in manual/query search fanout", async () => {
    mockGetBiologyTools.mockResolvedValue({
      search_uniprot: {
        execute: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                results: [
                  {
                    accession: "Q96FL8",
                    protein_name: "Metformin transporter",
                    organism: "Homo sapiens",
                  },
                ],
              }),
            },
          ],
        }),
      },
    });

    mockGetPubMedTools.mockResolvedValue({
      search_literature: {
        execute: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: JSON.stringify({ top_papers: [] }) }],
        }),
      },
    });

    mockScoreHelpfulness.mockResolvedValue({
      score: 61,
      explanation: "Query intent match",
      gapsFilled: [],
    });

    const response = await app.request("/api/entropy/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "what are metformin transport proteins",
        graphSnapshot: {
          nodeIds: [],
          edgeSummary: [],
        },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test-workspace",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.results.length).toBeGreaterThan(0);
    expect(data.queryPlan).toBeDefined();
    expect(data.queryPlan.uniprotQuery).toBeTruthy();
    expect(data.queryPlan.pubmedDisease).toBeTruthy();
  });

  describe("validation", () => {
    it("should reject missing query", async () => {
      const response = await app.request("/api/entropy/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          graphSnapshot: { nodeIds: [], edgeSummary: [] },
          personaMode: "Researcher",
          indiaLens: false,
          workspaceId: "test",
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid request");
    });

    it("should reject invalid personaMode", async () => {
      const response = await app.request("/api/entropy/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "test",
          graphSnapshot: { nodeIds: [], edgeSummary: [] },
          personaMode: "InvalidMode",
          indiaLens: false,
          workspaceId: "test",
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("bootstrap mode", () => {
    it("should return more results when graph is empty", async () => {
      const mockResults = Array.from({ length: 30 }, (_, i) => ({
        id: `ENSG0000${i}`,
        type: "protein",
        label: `Protein ${i}`,
        metadata: {},
      }));

      mockGetBiologyTools.mockResolvedValue({
        searchTargets: vi.fn().mockResolvedValue(mockResults),
      });

      mockScoreHelpfulness.mockResolvedValue({
        score: 70,
        explanation: "bootstrap mode",
        gapsFilled: [],
      });

      const response = await app.request("/api/entropy/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "proteins",
          graphSnapshot: { nodeIds: [], edgeSummary: [] },
          personaMode: "Researcher",
          indiaLens: false,
          workspaceId: "test",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.results.length).toBe(25);
    });
  });
});
