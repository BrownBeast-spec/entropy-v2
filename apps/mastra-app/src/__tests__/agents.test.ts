import { describe, it, expect, vi, beforeEach } from "vitest";
import { biologistAgent } from "../agents/biologist.js";
import { clinicalScoutAgent } from "../agents/clinical-scout.js";
import { hawkAgent } from "../agents/hawk.js";
import { librarianAgent } from "../agents/librarian.js";
import { mastra } from "../mastra/index.js";
import {
  getBiologyTools,
  getClinicalTrialsTools,
  getPubMedTools,
  getSafetyTools,
  resetToolCaches,
} from "../lib/mcp-client.js";

// ─── Agent Definition Tests ─────────────────────────────────────────────

describe("Biologist Agent", () => {
  it("should have the correct id and name", () => {
    expect(biologistAgent.id).toBe("biologist");
    expect(biologistAgent.name).toBe("Biologist Agent");
  });

  it("should be registered with the Mastra instance", () => {
    const agent = mastra.getAgent("biologistAgent");
    expect(agent).toBeDefined();
    expect(agent.id).toBe("biologist");
  });

  it("should return structured output when generate is mocked", async () => {
    const mockOutput = {
      summary:
        "EGFR is a well-validated target for non-small cell lung cancer with multiple approved therapies.",
      targetValidation: {
        druggability: "High",
        pathways: ["EGFR signaling", "RAS/MAPK", "PI3K/AKT"],
        diseaseAssociations: ["NSCLC", "Glioblastoma", "Colorectal cancer"],
      },
      sources: [
        {
          database: "Open Targets",
          endpoint: "/graphql",
          retrievedAt: "2026-02-23T12:00:00Z",
        },
      ],
    };

    const generateSpy = vi
      .spyOn(biologistAgent, "generate")
      .mockResolvedValueOnce({
        text: JSON.stringify(mockOutput),
        object: mockOutput,
      } as any);

    const response = await biologistAgent.generate(
      "Validate EGFR for lung cancer",
    );

    expect(generateSpy).toHaveBeenCalledOnce();
    expect((response as any).text).toContain("EGFR");
  });
});

describe("Clinical Scout Agent", () => {
  it("should have the correct id and name", () => {
    expect(clinicalScoutAgent.id).toBe("clinical-scout");
    expect(clinicalScoutAgent.name).toBe("Clinical Scout Agent");
  });

  it("should be registered with the Mastra instance", () => {
    const agent = mastra.getAgent("clinicalScoutAgent");
    expect(agent).toBeDefined();
    expect(agent.id).toBe("clinical-scout");
  });

  it("should return structured output when generate is mocked", async () => {
    const mockOutput = {
      summary: "Found 15 clinical trials for metformin in Alzheimer's disease.",
      trialLandscape: {
        totalTrials: 15,
        phases: { "Phase 1": 3, "Phase 2": 8, "Phase 3": 4 },
        sponsors: ["NIA", "Academic Medical Centers"],
      },
      sources: [
        {
          database: "ClinicalTrials.gov",
          nctId: "NCT04098666",
          retrievedAt: "2026-02-23T12:00:00Z",
        },
      ],
    };

    const generateSpy = vi
      .spyOn(clinicalScoutAgent, "generate")
      .mockResolvedValueOnce({
        text: JSON.stringify(mockOutput),
        object: mockOutput,
      } as any);

    const response = await clinicalScoutAgent.generate(
      "Find clinical trials for metformin in Alzheimer's",
    );

    expect(generateSpy).toHaveBeenCalledOnce();
    expect((response as any).text).toContain("metformin");
  });
});

describe("Hawk Safety Agent", () => {
  it("should have the correct id and name", () => {
    expect(hawkAgent.id).toBe("hawk-safety");
    expect(hawkAgent.name).toBe("Hawk Safety Agent");
  });

  it("should be registered with the Mastra instance", () => {
    const agent = mastra.getAgent("hawkAgent");
    expect(agent).toBeDefined();
    expect(agent.id).toBe("hawk-safety");
  });

  it("should return structured output when generate is mocked", async () => {
    const mockOutput = {
      summary:
        "Metformin has a well-characterized safety profile with primary concerns around lactic acidosis.",
      riskEvaluation: {
        overallRisk: "Moderate",
        boxedWarnings: ["Lactic acidosis risk in renal impairment"],
        contraindications: ["eGFR < 30 mL/min", "Acute metabolic acidosis"],
      },
      sources: [
        {
          database: "OpenFDA",
          endpoint: "/drug/label",
          retrievedAt: "2026-02-23T12:00:00Z",
        },
      ],
    };

    const generateSpy = vi
      .spyOn(hawkAgent, "generate")
      .mockResolvedValueOnce({
        text: JSON.stringify(mockOutput),
        object: mockOutput,
      } as any);

    const response = await hawkAgent.generate(
      "Assess safety profile of metformin for elderly patients",
    );

    expect(generateSpy).toHaveBeenCalledOnce();
    expect((response as any).text).toContain("Metformin");
  });
});

describe("Librarian Agent", () => {
  it("should have the correct id and name", () => {
    expect(librarianAgent.id).toBe("librarian");
    expect(librarianAgent.name).toBe("Librarian Agent");
  });

  it("should be registered with the Mastra instance", () => {
    const agent = mastra.getAgent("librarianAgent");
    expect(agent).toBeDefined();
    expect(agent.id).toBe("librarian");
  });

  it("should return structured output when generate is mocked", async () => {
    const mockOutput = {
      summary:
        "Found 47 relevant publications on metformin and Alzheimer's disease.",
      keyPublications: [
        {
          title: "Metformin and cognitive function: a systematic review",
          authors: "Campbell JM et al.",
          journal: "Diabetologia",
          year: 2018,
          pmid: "29497813",
          doi: "10.1007/s00125-017-4513-8",
          relevance:
            "Comprehensive systematic review of metformin's cognitive effects.",
        },
      ],
      sources: [
        {
          database: "PubMed",
          pmid: "29497813",
          retrievedAt: "2026-02-23T12:00:00Z",
        },
      ],
    };

    const generateSpy = vi
      .spyOn(librarianAgent, "generate")
      .mockResolvedValueOnce({
        text: JSON.stringify(mockOutput),
        object: mockOutput,
      } as any);

    const response = await librarianAgent.generate(
      "Find literature on metformin for Alzheimer's disease",
    );

    expect(generateSpy).toHaveBeenCalledOnce();
    expect((response as any).text).toContain("metformin");
  });
});

// ─── MCP Client Wiring Tests ─────────────────────────────────────────────

describe("MCP Client Wiring", () => {
  beforeEach(() => {
    resetToolCaches();
  });

  it("should discover biology tools from mcp-biology server", async () => {
    const tools = await getBiologyTools();
    const toolNames = Object.keys(tools);

    expect(toolNames.length).toBeGreaterThanOrEqual(13);
    expect(toolNames).toContain("validate_target");
    expect(toolNames).toContain("get_gene_info");
    expect(toolNames).toContain("get_protein_data");
    expect(toolNames).toContain("get_disease_info");
  });

  it("should discover clinical trials tools from mcp-clinical server", async () => {
    const tools = await getClinicalTrialsTools();
    const toolNames = Object.keys(tools);

    expect(toolNames.length).toBe(3);
    expect(toolNames).toContain("search_studies");
    expect(toolNames).toContain("get_study_details");
    expect(toolNames).toContain("get_eligibility_criteria");
  });

  it("should discover PubMed tools from mcp-clinical server", async () => {
    const tools = await getPubMedTools();
    const toolNames = Object.keys(tools);

    expect(toolNames.length).toBe(4);
    expect(toolNames).toContain("search_literature");
    expect(toolNames).toContain("search_preprints");
    expect(toolNames).toContain("get_abstract");
    expect(toolNames).toContain("get_paper_metadata");
  });

  it("should discover safety tools from mcp-safety server", async () => {
    const tools = await getSafetyTools();
    const toolNames = Object.keys(tools);

    expect(toolNames.length).toBeGreaterThanOrEqual(7);
    expect(toolNames).toContain("check_drug_safety");
    expect(toolNames).toContain("check_adverse_events");
    expect(toolNames).toContain("get_drug_interactions");
  });

  it("should cache biology tools on subsequent calls", async () => {
    const tools1 = await getBiologyTools();
    const tools2 = await getBiologyTools();
    expect(tools1).toBe(tools2); // same reference
  });

  it("should cache safety tools on subsequent calls", async () => {
    const tools1 = await getSafetyTools();
    const tools2 = await getSafetyTools();
    expect(tools1).toBe(tools2);
  });
});

// ─── All Agents Registered ───────────────────────────────────────────────

describe("Mastra Instance", () => {
  it("should have all 5 agents registered", () => {
    expect(mastra.getAgent("plannerAgent")).toBeDefined();
    expect(mastra.getAgent("biologistAgent")).toBeDefined();
    expect(mastra.getAgent("clinicalScoutAgent")).toBeDefined();
    expect(mastra.getAgent("hawkAgent")).toBeDefined();
    expect(mastra.getAgent("librarianAgent")).toBeDefined();
  });
});
