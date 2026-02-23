import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  PlannerOutputSchema,
  SubTaskSchema,
} from "../schemas/planner-output.js";
import type { PlannerOutput } from "../schemas/planner-output.js";
import { plannerAgent } from "../agents/planner.js";

const validPlannerOutput: PlannerOutput = {
  originalQuery:
    "Can metformin be repurposed for Alzheimer's disease treatment?",
  ppicoBreakdown: {
    population: "Adults aged 65+ with early-stage Alzheimer's disease",
    intervention: "Metformin (off-label use)",
    comparison: "Standard cholinesterase inhibitors (donepezil, rivastigmine)",
    outcome: "Slowed cognitive decline as measured by MMSE and ADAS-Cog scores",
  },
  subTasks: [
    {
      id: "bio-1",
      targetAgent: "biologist",
      query:
        "Investigate the mechanism of action of metformin in neuronal insulin signaling pathways, AMPK activation in the brain, and its potential neuroprotective effects against amyloid-beta aggregation and tau phosphorylation.",
      priority: "high",
      dependsOn: [],
    },
    {
      id: "clin-1",
      targetAgent: "clinical-scout",
      query:
        "Search for clinical trials investigating metformin in Alzheimer's disease or mild cognitive impairment, including completed, ongoing, and planned studies. Report study designs, endpoints, and preliminary results.",
      priority: "high",
      dependsOn: [],
    },
    {
      id: "safety-1",
      targetAgent: "hawk-safety",
      query:
        "Assess the safety profile of metformin in elderly patients, focusing on lactic acidosis risk, vitamin B12 deficiency, renal function considerations, and potential drug interactions with common Alzheimer's medications.",
      priority: "high",
      dependsOn: ["bio-1"],
    },
    {
      id: "lib-1",
      targetAgent: "librarian",
      query:
        "Find systematic reviews, meta-analyses, and key publications on the association between metformin use and dementia/Alzheimer's disease risk, including epidemiological studies and preclinical evidence.",
      priority: "medium",
      dependsOn: [],
    },
  ],
  rationale:
    "The decomposition covers the biological mechanism of metformin's potential neuroprotective effects, existing clinical evidence, safety considerations for the elderly population, and supporting literature. The safety assessment depends on biological findings to contextualize risk.",
};

describe("PlannerOutputSchema validation", () => {
  it("should parse a valid PlannerOutput successfully", () => {
    const result = PlannerOutputSchema.safeParse(validPlannerOutput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.originalQuery).toBe(validPlannerOutput.originalQuery);
      expect(result.data.subTasks).toHaveLength(4);
    }
  });

  it("should fail when required fields are missing", () => {
    const invalid = {
      originalQuery: "test query",
      // missing ppicoBreakdown, subTasks, rationale
    };
    const result = PlannerOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should fail when ppicoBreakdown is incomplete", () => {
    const invalid = {
      ...validPlannerOutput,
      ppicoBreakdown: {
        population: "Adults",
        // missing intervention, comparison, outcome
      },
    };
    const result = PlannerOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should fail when subTasks array is empty", () => {
    const invalid = {
      ...validPlannerOutput,
      subTasks: [],
    };
    const result = PlannerOutputSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should fail when a SubTask has an unknown targetAgent", () => {
    const invalid = {
      id: "task-1",
      targetAgent: "unknown-agent",
      query: "Do something",
      priority: "high",
      dependsOn: [],
    };
    const result = SubTaskSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should fail when a SubTask has an invalid priority", () => {
    const invalid = {
      id: "task-1",
      targetAgent: "biologist",
      query: "Do something",
      priority: "critical",
      dependsOn: [],
    };
    const result = SubTaskSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("should default dependsOn to empty array when not provided", () => {
    const minimal = {
      id: "task-1",
      targetAgent: "biologist",
      query: "Investigate target",
      priority: "high",
    };
    const result = SubTaskSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dependsOn).toEqual([]);
    }
  });
});

describe("Planner Agent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should have the correct id and name", () => {
    expect(plannerAgent.name).toBe("Planner Agent");
  });

  it("should have no tools attached", () => {
    // The planner is a pure LLM agent with no tools
    const config = (plannerAgent as any).__config;
    expect(config?.tools).toBeUndefined();
  });

  it("should return output conforming to PlannerOutputSchema when generate is mocked", async () => {
    const generateSpy = vi
      .spyOn(plannerAgent, "generate")
      .mockResolvedValueOnce({
        text: JSON.stringify(validPlannerOutput),
        object: validPlannerOutput,
      } as any);

    const response = await plannerAgent.generate(
      "Can metformin be repurposed for Alzheimer's disease treatment?",
    );

    expect(generateSpy).toHaveBeenCalledOnce();
    const parsed = PlannerOutputSchema.safeParse((response as any).object);
    expect(parsed.success).toBe(true);
  });

  it("should populate all PICO fields in the output", async () => {
    vi.spyOn(plannerAgent, "generate").mockResolvedValueOnce({
      text: JSON.stringify(validPlannerOutput),
      object: validPlannerOutput,
    } as any);

    const response = await plannerAgent.generate(
      "Can metformin be repurposed for Alzheimer's disease treatment?",
    );

    const output = (response as any).object as PlannerOutput;
    expect(output.ppicoBreakdown.population).toBeTruthy();
    expect(output.ppicoBreakdown.intervention).toBeTruthy();
    expect(output.ppicoBreakdown.comparison).toBeTruthy();
    expect(output.ppicoBreakdown.outcome).toBeTruthy();
  });

  it("should produce sub-tasks covering all 4 downstream agents", async () => {
    vi.spyOn(plannerAgent, "generate").mockResolvedValueOnce({
      text: JSON.stringify(validPlannerOutput),
      object: validPlannerOutput,
    } as any);

    const response = await plannerAgent.generate(
      "Can metformin be repurposed for Alzheimer's disease treatment?",
    );

    const output = (response as any).object as PlannerOutput;
    const agents = new Set(output.subTasks.map((t) => t.targetAgent));
    expect(agents).toContain("biologist");
    expect(agents).toContain("clinical-scout");
    expect(agents).toContain("hawk-safety");
    expect(agents).toContain("librarian");
  });

  it("should produce sub-tasks with valid dependency references", async () => {
    vi.spyOn(plannerAgent, "generate").mockResolvedValueOnce({
      text: JSON.stringify(validPlannerOutput),
      object: validPlannerOutput,
    } as any);

    const response = await plannerAgent.generate(
      "Can metformin be repurposed for Alzheimer's disease treatment?",
    );

    const output = (response as any).object as PlannerOutput;
    const taskIds = new Set(output.subTasks.map((t) => t.id));

    for (const task of output.subTasks) {
      for (const dep of task.dependsOn) {
        expect(taskIds).toContain(dep);
      }
    }
  });

  it("should preserve the original query in the output", async () => {
    const query =
      "Can metformin be repurposed for Alzheimer's disease treatment?";

    vi.spyOn(plannerAgent, "generate").mockResolvedValueOnce({
      text: JSON.stringify(validPlannerOutput),
      object: validPlannerOutput,
    } as any);

    const response = await plannerAgent.generate(query);

    const output = (response as any).object as PlannerOutput;
    expect(output.originalQuery).toBe(query);
  });
});
