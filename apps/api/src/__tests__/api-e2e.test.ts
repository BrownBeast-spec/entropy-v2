import { describe, it, expect } from "vitest";
import { app } from "../index.js";

const CANONICAL_QUERY =
  "Can aspirin be repurposed to reduce systemic inflammation?";

const hasLlmKey =
  !!process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  !!process.env.PERPLEXITY_API_KEY;

const describeE2E = describe.skipIf(
  !hasLlmKey || !process.env.RUN_INTEGRATION_TESTS,
);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describeE2E("API E2E", () => {
  it("runs research workflow and returns PDF", async () => {
    // 1. Create a research session
    const createRes = await app.request("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: CANONICAL_QUERY }),
    });

    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    const sessionId = createBody.sessionId as string;
    expect(sessionId).toBeTruthy();

    // 2. Poll until suspended or completed (up to 5 minutes)
    let status = "running";
    for (let i = 0; i < 60; i += 1) {
      await sleep(5000);
      const pollRes = await app.request(`/api/research/${sessionId}`);
      const pollBody = await pollRes.json();
      status = pollBody.status as string;
      if (
        status === "suspended" ||
        status === "completed" ||
        status === "failed"
      )
        break;
    }

    expect(status).not.toBe("failed");
    expect(["suspended", "completed"]).toContain(status);

    // 3. If suspended, submit HITL review
    if (status === "suspended") {
      const reviewRes = await app.request(`/api/research/${sessionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approved: true,
          reviewer: "api-e2e",
          notes: "Auto-approved by API E2E test",
        }),
      });
      expect(reviewRes.status).toBe(200);

      // The resume call is synchronous (awaits workflow completion),
      // so check status immediately after
      const afterReview = await app.request(`/api/research/${sessionId}`);
      const afterBody = await afterReview.json();
      status = afterBody.status as string;
    }

    // 4. Poll until completed if not already (report generation may take time)
    if (status !== "completed") {
      for (let i = 0; i < 60; i += 1) {
        await sleep(5000);
        const pollRes = await app.request(`/api/research/${sessionId}`);
        const pollBody = await pollRes.json();
        status = pollBody.status as string;
        if (status === "completed" || status === "failed") break;
      }
    }

    expect(status).toBe("completed");

    // 5. Fetch the PDF report
    const reportRes = await app.request(`/api/research/${sessionId}/report`);
    expect(reportRes.status).toBe(200);
    expect(reportRes.headers.get("Content-Type")).toBe("application/pdf");

    const buffer = new Uint8Array(await reportRes.arrayBuffer());
    const header = new TextDecoder().decode(buffer.slice(0, 5));
    expect(header).toBe("%PDF-");
  }, 600_000); // 10 minute timeout for full pipeline
});
