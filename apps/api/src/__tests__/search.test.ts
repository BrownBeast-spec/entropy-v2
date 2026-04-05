import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const mockScoreHelpfulness = vi.fn();
const mockGetBiologyTools = vi.fn();

vi.mock("@entropy/mastra-app/src/index.js", async () => {
  const actual = await vi.importActual("@entropy/mastra-app/src/index.js");
  return {
    ...actual,
    scoreHelpfulness: mockScoreHelpfulness,
  };
});

vi.mock("@entropy/mastra-app/src/lib/mcp-client.js", async () => {
  const actual = await vi.importActual(
    "@entropy/mastra-app/src/lib/mcp-client.js",
  );
  return {
    ...actual,
    getBiologyTools: mockGetBiologyTools,
  };
});

const { createSearchRoute } = await import("../routes/entropy.js");

describe("POST /api/entropy/search", () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();

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
