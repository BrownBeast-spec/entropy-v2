import "dotenv/config";
import { describe, it, expect } from "vitest";
import { biologistAgent } from "../agents/biologist.js";
import { researchPipelineWorkflow } from "../workflows/research-pipeline.js";
import { getAuditStore, isAuditEnabled } from "../lib/audit.js";
import { readFile } from "node:fs/promises";

const CANONICAL_QUERY =
  "Can aspirin be repurposed to reduce systemic inflammation?";

const hasLlmKey =
  !!process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  !!process.env.PERPLEXITY_API_KEY;

const describeE2E = describe.skipIf(
  !hasLlmKey || !process.env.RUN_INTEGRATION_TESTS,
);

describeE2E("E2E: Biologist agent", () => {
  it("responds with domain-relevant biological content", async () => {
    const response = await biologistAgent.generate({
      messages: [{ role: "user", content: CANONICAL_QUERY }],
    });

    expect(response.text.length).toBeGreaterThan(100);
    expect(response.text).toMatch(/COX|inflammation|pathway|PTGS|mechanism/i);
  }, 60000);
});

describeE2E("E2E: Full pipeline", () => {
  it("runs full workflow and produces a PDF", async () => {
    const run = await researchPipelineWorkflow.createRun();

    run.watch(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (event: any) => {
        if (event.type === "workflow-step-start") {
          console.log(`[e2e] step:start ${event.payload?.id ?? "unknown"}`);
        }

        if (event.type === "workflow-step-suspended") {
          console.log(
            `[e2e] step:suspended ${event.payload?.id ?? "unknown"} status=${event.payload?.status ?? "unknown"}`,
          );
        }

        if (event.type === "workflow-step-result") {
          console.log(
            `[e2e] step:result ${event.payload?.id ?? "unknown"} status=${event.payload?.status ?? "unknown"}`,
          );
        }

        if (typeof event.type === "string" && event.type.includes("tool")) {
          const toolName =
            event.payload?.toolName ?? event.payload?.name ?? event.payload?.id;
          console.log(`[e2e] tool:${event.type} ${toolName ?? "unknown"}`);
        }
      },
    );

    const result = await run.start({
      inputData: { prompt: CANONICAL_QUERY },
    });

    expect(result.status).toBe("suspended");
    if (result.status !== "suspended") {
      throw new Error(`Expected suspended result, got ${result.status}`);
    }

    const resumeResult = await run.resume({
      step: "human-review",
      resumeData: {
        approved: true,
        reviewer: "e2e-test",
        notes: "Auto-approved by E2E test",
      },
    });

    expect(resumeResult.status).toBe("success");
    if (resumeResult.status !== "success") {
      throw new Error(`Expected success result, got ${resumeResult.status}`);
    }

    expect(resumeResult.result.pdfSuccess).toBe(true);
    const pdfBuffer = await readFile(resumeResult.result.pdfPath);
    expect(pdfBuffer.subarray(0, 5).toString()).toBe("%PDF-");

    if (isAuditEnabled()) {
      const trail = await getAuditStore().getSessionTrail(run.runId);
      expect(trail.toolCalls.length + trail.agentTraces.length).toBeGreaterThan(
        0,
      );
    }
  }, 300000);
});
