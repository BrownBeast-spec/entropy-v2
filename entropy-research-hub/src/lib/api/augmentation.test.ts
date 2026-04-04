import { afterEach, describe, expect, it, vi } from "vitest";
import { augmentWorkspace } from "./augmentation";

describe("augmentWorkspace API base URL", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses VITE_API_BASE_URL when configured", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:3001");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          newNodes: [],
          newEdges: [],
          completenessScore: 100,
          iterationsRun: 1,
          failedSources: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await augmentWorkspace({
      query: "test",
      graphSnapshot: { nodeIds: [], edgeSummary: [] },
      personaMode: "Researcher",
      indiaLens: false,
      workspaceId: "ws_1",
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:3001/api/causaly/augment",
      expect.any(Object),
    );
  });
});
