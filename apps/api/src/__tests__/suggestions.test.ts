import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSuggestFollowups = vi.fn();

vi.mock("@entropy/mastra-app/src/agents/followup-agent.js", () => ({
  suggestFollowups: mockSuggestFollowups,
}));

const { app } = await import("../index.js");

beforeEach(() => {
  vi.clearAllMocks();
  mockSuggestFollowups.mockResolvedValue({
    suggestions: [
      "What are the highest-confidence targets in this graph?",
      "Show safety signals for metformin in NASH contexts.",
      "Which trials add India-specific evidence?",
    ],
  });
});

describe("GET /api/causaly/suggestions", () => {
  it("returns 3 follow-up suggestions for Researcher mode", async () => {
    const graphSnapshot = encodeURIComponent(
      JSON.stringify({ nodeIds: ["ENSG00000141510"], edgeSummary: [] }),
    );

    const res = await app.request(
      `/api/causaly/suggestions?graphSnapshot=${graphSnapshot}&personaMode=Researcher`,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.suggestions)).toBe(true);
    expect(body.suggestions).toHaveLength(3);
  });

  it("returns strategist-oriented suggestions for Strategist mode", async () => {
    mockSuggestFollowups.mockResolvedValueOnce({
      suggestions: [
        "Which assignees dominate patents in this workspace?",
        "Where are upcoming patent expiry windows?",
        "Which sponsors are most active in ongoing trials?",
      ],
    });

    const graphSnapshot = encodeURIComponent(
      JSON.stringify({ nodeIds: ["US1234567"], edgeSummary: [] }),
    );

    const res = await app.request(
      `/api/causaly/suggestions?graphSnapshot=${graphSnapshot}&personaMode=Strategist`,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions[0]).toContain("assignees");
  });

  it("returns 400 when personaMode is missing", async () => {
    const graphSnapshot = encodeURIComponent(
      JSON.stringify({ nodeIds: ["ENSG00000141510"], edgeSummary: [] }),
    );

    const res = await app.request(
      `/api/causaly/suggestions?graphSnapshot=${graphSnapshot}`,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when graphSnapshot is missing", async () => {
    const res = await app.request(
      "/api/causaly/suggestions?personaMode=Researcher",
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("handles malformed graphSnapshot JSON by falling back to empty snapshot", async () => {
    const res = await app.request(
      "/api/causaly/suggestions?graphSnapshot=%7Bbad-json&personaMode=Researcher",
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toHaveLength(3);
  });
});
