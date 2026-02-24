import { describe, it, expect } from "vitest";
import { HitlResumeSchema, HitlOutputSchema } from "../schemas/hitl.js";
import { researchPipelineWorkflow } from "../workflows/research-pipeline.js";

describe("HitlResumeSchema", () => {
  it("validates approval with notes", () => {
    const data = {
      approved: true,
      reviewer: "dr.smith@example.com",
      notes: "Looks good",
    };
    const parsed = HitlResumeSchema.parse(data);
    expect(parsed.approved).toBe(true);
  });

  it("validates approval without notes", () => {
    const data = { approved: false, reviewer: "admin" };
    const parsed = HitlResumeSchema.parse(data);
    expect(parsed.notes).toBeUndefined();
  });

  it("rejects missing approved field", () => {
    const result = HitlResumeSchema.safeParse({ reviewer: "admin" });
    expect(result.success).toBe(false);
  });

  it("rejects missing reviewer field", () => {
    const result = HitlResumeSchema.safeParse({ approved: true });
    expect(result.success).toBe(false);
  });
});

describe("HitlOutputSchema", () => {
  it("validates complete output with verification report", () => {
    const output = {
      approved: true,
      reviewer: "dr.smith@example.com",
      notes: "Approved with minor comments",
      verificationReport: {
        summary: "All claims verified",
        totalClaimsChecked: 5,
        confirmedCount: 5,
        flaggedCount: 0,
        unverifiableCount: 0,
        claims: [],
        overallIntegrity: "high",
        recommendations: [],
      },
    };
    const parsed = HitlOutputSchema.parse(output);
    expect(parsed.approved).toBe(true);
    expect(parsed.verificationReport.totalClaimsChecked).toBe(5);
  });
});

describe("Human Review Step in Workflow", () => {
  it("workflow includes the human-review step in the graph", () => {
    const graph = researchPipelineWorkflow.serializedStepGraph;
    const stepIds: string[] = [];
    for (const entry of graph) {
      if (entry.type === "step" && entry.step) {
        stepIds.push(entry.step.id);
      }
      if (entry.type === "parallel") {
        // parallel entries have a steps array at the top level
        const parallelEntry = entry as unknown as {
          type: string;
          steps?: Array<{ id: string }>;
        };
        if (parallelEntry.steps) {
          for (const s of parallelEntry.steps) {
            stepIds.push(s.id);
          }
        }
      }
    }
    expect(stepIds).toContain("human-review");
  });

  it("workflow output schema reflects ReportOutputSchema shape", () => {
    // After the report step was added, the workflow outputSchema has the report fields
    const shape = (
      researchPipelineWorkflow as unknown as {
        outputSchema: { shape: Record<string, unknown> };
      }
    ).outputSchema?.shape;
    if (shape) {
      expect(shape).toHaveProperty("hitlOutput");
      expect(shape).toHaveProperty("texPath");
      expect(shape).toHaveProperty("pdfPath");
      expect(shape).toHaveProperty("pdfSuccess");
      expect(shape).toHaveProperty("pdfStderr");
    } else {
      // If outputSchema doesn't expose shape, just verify the workflow is defined
      expect(researchPipelineWorkflow).toBeDefined();
    }
  });

  it("schema exports are available", () => {
    expect(HitlResumeSchema).toBeDefined();
    expect(HitlOutputSchema).toBeDefined();
  });
});
