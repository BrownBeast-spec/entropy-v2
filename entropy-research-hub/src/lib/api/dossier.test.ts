import { describe, expect, it, vi } from "vitest";
import { generateDossier } from "./dossier";

describe("generateDossier", () => {
  it("parses dossier SSE stream and returns final payload", async () => {
    const streamBody =
      "event: status\ndata: {\"stage\":\"starting\"}\n\n" +
      "event: complete\ndata: {\"filename\":\"dossier-ws_1.tex\",\"latex\":\"\\\\section*{Overview}\"}\n\n";

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      body: {
        getReader: () => {
          let consumed = false;
          return {
            read: async () => {
              if (consumed) {
                return { done: true, value: undefined };
              }
              consumed = true;
              return {
                done: false,
                value: new TextEncoder().encode(streamBody),
              };
            },
          };
        },
      },
    } as unknown as Response);

    const result = await generateDossier({
      workspaceId: "ws_1",
      query: "Repurpose metformin for NASH in Indian population",
      personaMode: "Researcher",
      reportSections: [
        {
          title: "Overview",
          content: "content",
          citations: [],
        },
      ],
    });

    expect(result.filename).toBe("dossier-ws_1.tex");
    expect(result.latex).toContain("section*{Overview}");
    fetchMock.mockRestore();
  });

  it("throws when dossier response is non-200", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: "dossier failed" } }),
    } as Response);

    await expect(
      generateDossier({
        workspaceId: "ws_1",
        query: "q",
        personaMode: "Strategist",
        reportSections: [{ title: "Overview", content: "x", citations: [] }],
      }),
    ).rejects.toThrow("dossier failed");

    fetchMock.mockRestore();
  });
});
