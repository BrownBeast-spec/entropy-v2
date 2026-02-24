import { describe, it, expect } from "vitest";
import { app } from "../index.js";

const CANONICAL_QUERY =
  "Can aspirin be repurposed to reduce systemic inflammation?";

const describeE2E = describe.skipIf(
  !process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    !process.env.RUN_INTEGRATION_TESTS,
);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describeE2E("API E2E", () => {
  it("runs research workflow and returns PDF", async () => {
    const createRes = await app.request("/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: CANONICAL_QUERY }),
    });

    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    const sessionId = createBody.sessionId as string;

    let status = "running";
    for (let i = 0; i < 60; i += 1) {
      await sleep(5000);
      const pollRes = await app.request(`/api/research/${sessionId}`);
      const pollBody = await pollRes.json();
      status = pollBody.status as string;
      if (status === "suspended" || status === "completed") break;
    }

    expect(["suspended", "completed"]).toContain(status);

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
    }

    let completed = false;
    for (let i = 0; i < 60; i += 1) {
      await sleep(5000);
      const pollRes = await app.request(`/api/research/${sessionId}`);
      const pollBody = await pollRes.json();
      if (pollBody.status === "completed") {
        completed = true;
        break;
      }
    }

    expect(completed).toBe(true);

    const pdfRes = await app.request(`/api/research/${sessionId}/report`);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers.get("Content-Type")).toBe("application/pdf");
    const buffer = new Uint8Array(await pdfRes.arrayBuffer());
    const header = new TextDecoder().decode(buffer.slice(0, 5));
    expect(header).toBe("%PDF-");
  }, 300000);
});
