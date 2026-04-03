import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSummariseFromGraph = vi.fn();

vi.mock("@entropy/mastra-app/src/agents/synthesis-agent.js", () => ({
  summariseFromGraph: mockSummariseFromGraph,
}));

const { app } = await import("../index.js");

beforeEach(() => {
  vi.clearAllMocks();
  mockSummariseFromGraph.mockResolvedValue({
    sections: [
      {
        title: "Overview",
        content: "Metformin shows evidence in NASH-related pathways.",
        citations: [
          {
            source: "Open Targets",
            label: "ENSG00000141510",
            nodeId: "ENSG00000141510",
          },
        ],
      },
    ],
  });
});

describe("POST /api/causaly/synthesise", () => {
  it("returns sections with content and citations for Researcher mode", async () => {
    const res = await app.request("/api/causaly/synthesise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        graphSnapshot: {
          nodes: [
            {
              id: "ENSG00000141510",
              type: "target",
              label: "TP53",
            },
          ],
          edges: [],
        },
        personaMode: "Researcher",
        reportSections: ["Overview", "Key Targets"],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.sections)).toBe(true);
    expect(body.sections.length).toBeGreaterThan(0);
    expect(body.sections[0]).toHaveProperty("title");
    expect(body.sections[0]).toHaveProperty("content");
    expect(Array.isArray(body.sections[0].citations)).toBe(true);
  });

  it("returns different sections for Strategist mode", async () => {
    mockSummariseFromGraph.mockResolvedValueOnce({
      sections: [
        {
          title: "Competitive Landscape Overview",
          content: "Patent ownership is concentrated among 3 companies.",
          citations: [
            {
              source: "PatentsView",
              label: "US1234567",
              nodeId: "US1234567",
            },
          ],
        },
      ],
    });

    const res = await app.request("/api/causaly/synthesise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        graphSnapshot: {
          nodes: [
            {
              id: "US1234567",
              type: "patent",
              label: "Metformin formulation patent",
            },
          ],
          edges: [],
        },
        personaMode: "Strategist",
        reportSections: ["Competitive Landscape Overview"],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sections[0].title).toBe("Competitive Landscape Overview");
  });

  it("returns 400 for invalid body shape", async () => {
    const res = await app.request("/api/causaly/synthesise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personaMode: "Researcher",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await app.request("/api/causaly/synthesise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{broken-json",
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });
});
