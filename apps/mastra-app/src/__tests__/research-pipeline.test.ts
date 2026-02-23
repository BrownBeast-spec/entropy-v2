import { describe, it, expect } from "vitest";
import { EvidenceSchema, AgentEvidenceSchema } from "../schemas/evidence.js";
import type { PlannerOutput } from "../schemas/planner-output.js";
import {
  buildEvidence,
  researchPipelineWorkflow,
} from "../workflows/research-pipeline.js";

const plannerOutput: PlannerOutput = {
  originalQuery: "Can metformin be repurposed for Alzheimer's?",
  ppicoBreakdown: {
    population: "Adults with early-stage Alzheimer's",
    intervention: "Metformin",
    comparison: "Placebo",
    outcome: "Cognitive improvement",
  },
  subTasks: [
    {
      id: "bio-1",
      targetAgent: "biologist",
      query: "Investigate mechanism of action.",
      priority: "high",
      dependsOn: [],
    },
    {
      id: "clin-1",
      targetAgent: "clinical-scout",
      query: "Find clinical trials.",
      priority: "high",
      dependsOn: [],
    },
    {
      id: "hawk-1",
      targetAgent: "hawk-safety",
      query: "Assess safety profile.",
      priority: "medium",
      dependsOn: [],
    },
    {
      id: "lib-1",
      targetAgent: "librarian",
      query: "Find literature.",
      priority: "low",
      dependsOn: [],
    },
  ],
  rationale: "Cover biology, clinical evidence, safety, and literature.",
};

describe("Evidence Schema", () => {
  it("validates a complete evidence object", () => {
    const evidence = {
      query: "Can metformin be repurposed for Alzheimer's?",
      ppicoBreakdown: {
        population: "Adults with early-stage Alzheimer's",
        intervention: "Metformin",
        comparison: "Placebo",
        outcome: "Cognitive improvement",
      },
      plannerRationale: "Metformin's neuroprotective properties warrant study.",
      agents: {
        biologist: {
          agentId: "biologist",
          status: "success",
          content: "Biology analysis",
          timestamp: "2024-01-01T00:00:00Z",
        },
        clinicalScout: {
          agentId: "clinical-scout",
          status: "success",
          content: "Clinical trial analysis",
          timestamp: "2024-01-01T00:00:00Z",
        },
        hawk: {
          agentId: "hawk-safety",
          status: "success",
          content: "Safety analysis",
          timestamp: "2024-01-01T00:00:00Z",
        },
        librarian: {
          agentId: "librarian",
          status: "success",
          content: "Literature analysis",
          timestamp: "2024-01-01T00:00:00Z",
        },
      },
      completedAt: "2024-01-01T00:00:00Z",
    };

    const parsed = EvidenceSchema.parse(evidence);
    expect(parsed.query).toBe(evidence.query);
  });

  it("validates agent evidence schema", () => {
    const evidence = {
      agentId: "biologist",
      status: "failure",
      content: "",
      error: "Timeout",
      timestamp: "2024-01-01T00:00:00Z",
    };

    const parsed = AgentEvidenceSchema.parse(evidence);
    expect(parsed.status).toBe("failure");
  });
});

describe("Research Pipeline Workflow", () => {
  it("workflow is defined with correct ID", () => {
    expect(researchPipelineWorkflow.id).toBe("research-pipeline");
  });

  it("includes a parallel step in the graph", () => {
    const graph = researchPipelineWorkflow.serializedStepGraph;
    const hasParallel = graph.some((entry) => entry.type === "parallel");
    expect(hasParallel).toBe(true);
  });
});

describe("Evidence merge logic", () => {
  it("merges successful agent outputs into evidence", () => {
    const evidence = buildEvidence({
      plannerResult: plannerOutput,
      parallelResults: {
        biologist: { status: "success", output: { text: "Bio" } },
        "clinical-scout": { status: "success", output: { text: "Clin" } },
        "hawk-safety": { status: "success", output: { text: "Hawk" } },
        librarian: { status: "success", output: { text: "Lib" } },
      },
      timestamp: "2024-01-01T00:00:00Z",
    });

    expect(evidence.agents.biologist.status).toBe("success");
    expect(evidence.agents.hawk.content).toBe("Hawk");
  });

  it("records a failure when one agent fails", () => {
    const evidence = buildEvidence({
      plannerResult: plannerOutput,
      parallelResults: {
        biologist: { status: "failed", error: new Error("Boom") },
        "clinical-scout": { status: "success", output: { text: "Clin" } },
        "hawk-safety": { status: "success", output: { text: "Hawk" } },
        librarian: { status: "success", output: { text: "Lib" } },
      },
      timestamp: "2024-01-01T00:00:00Z",
    });

    expect(evidence.agents.biologist.status).toBe("failure");
    expect(evidence.agents.biologist.error).toBe("Boom");
    expect(evidence.agents.clinicalScout.status).toBe("success");
  });
});
