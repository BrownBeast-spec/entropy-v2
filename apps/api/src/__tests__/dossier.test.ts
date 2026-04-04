import { describe, expect, it } from "vitest";

const { app } = await import("../index.js");

describe("POST /api/causaly/dossier", () => {
  it("streams dossier generation events and returns escaped LaTeX payload", async () => {
    const res = await app.request("/api/causaly/dossier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: "ws_1",
        query: "Repurpose metformin for NASH in Indian population",
        personaMode: "Researcher",
        reportSections: [
          {
            title: "Overview",
            content: "Metformin & NASH outcomes improved by 12% in cohort #A_1.",
            citations: [
              {
                id: "c1",
                nodeId: "N1",
                source: "Open Targets",
                label: "OT:N1",
              },
            ],
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const streamText = await res.text();
    expect(streamText).toContain("event: status");
    expect(streamText).toContain("event: complete");

    const completeEventMatch = streamText.match(/event: complete\ndata: (.+)\n\n/);
    expect(completeEventMatch).toBeTruthy();

    const completePayload = JSON.parse(completeEventMatch![1]);
    expect(completePayload.filename).toBe("dossier-ws_1.tex");
    expect(completePayload.latex).toContain("\\section*{Overview}");
    expect(completePayload.latex).toContain("Metformin \\& NASH outcomes");
    expect(completePayload.latex).toContain("12\\% in cohort \\#A\\_1");
  });

  it("returns 400 for invalid request body", async () => {
    const res = await app.request("/api/causaly/dossier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: "ws_1",
        query: "Repurpose metformin",
        personaMode: "Researcher",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await app.request("/api/causaly/dossier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad-json",
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });
});
