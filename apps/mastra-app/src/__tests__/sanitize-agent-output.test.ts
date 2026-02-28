import { describe, it, expect } from "vitest";
import { sanitizeAgentOutput } from "../lib/sanitize-agent-output.js";

describe("sanitizeAgentOutput", () => {
  // ── Identity cases ──────────────────────────────────────────────────────────

  it("returns empty string unchanged", () => {
    expect(sanitizeAgentOutput("")).toBe("");
  });

  it("returns clean prose unchanged", () => {
    const prose = "Metformin activates AMPK via complex-I inhibition.";
    expect(sanitizeAgentOutput(prose)).toBe(prose);
  });

  // ── assistantfinal extraction ───────────────────────────────────────────────

  it("extracts only the text after assistantfinal", () => {
    const raw =
      "assistantcommentary some garbage\nassistantanalysis more garbage\nassistantfinalClean answer here.";
    const result = sanitizeAgentOutput(raw);
    expect(result).toBe("Clean answer here.");
    expect(result).not.toContain("assistantcommentary");
    expect(result).not.toContain("assistantanalysis");
    expect(result).not.toContain("assistantfinal");
  });

  it("uses the LAST assistantfinal occurrence", () => {
    const raw =
      "assistantfinalFirst answer\nassistantfinalFinal correct answer.";
    const result = sanitizeAgentOutput(raw);
    expect(result).toBe("Final correct answer.");
  });

  it("is case-insensitive for assistantfinal", () => {
    const raw = "AssistantFinalClean output.";
    expect(sanitizeAgentOutput(raw)).toBe("Clean output.");
  });

  // ── Tool-invocation lines ───────────────────────────────────────────────────

  it("strips to=functions.xxx json{...} lines", () => {
    const raw =
      'assistantfinalassistantcommentary to=functions.get_drug_info json{"drugId":"CHEMBL112"}\nMetformin is an AMPK activator.';
    const result = sanitizeAgentOutput(raw);
    expect(result).not.toContain("to=functions");
    expect(result).toContain("Metformin is an AMPK activator.");
  });

  // ── MCP tool-response JSON blobs ────────────────────────────────────────────

  it('strips {"content":[{"type":"text","text":"..."}]} blobs', () => {
    const blob = '{"content":[{"type":"text","text":"some tool result"}]}';
    const raw = `assistantfinal${blob}\nReal content here.`;
    const result = sanitizeAgentOutput(raw);
    expect(result).not.toContain('"content"');
    expect(result).toContain("Real content here.");
  });

  // ── Residual assistantcommentary/analysis ───────────────────────────────────

  it("strips residual assistantcommentary tokens", () => {
    const raw = "assistantfinalassistantcommentary noise\nActual answer.";
    const result = sanitizeAgentOutput(raw);
    expect(result).not.toContain("assistantcommentary");
    expect(result).toContain("Actual answer.");
  });

  it("strips residual assistantanalysis tokens", () => {
    const raw = "assistantfinalassistantanalysis noise\nActual answer.";
    const result = sanitizeAgentOutput(raw);
    expect(result).not.toContain("assistantanalysis");
    expect(result).toContain("Actual answer.");
  });

  // ── Realistic mixed input ───────────────────────────────────────────────────

  it("cleans a realistic gpt-oss-120b style dump", () => {
    const raw = [
      'assistantcommentary to=functions.get_drug_info json{"drugId":"CHEMBL1120"}',
      'assistantcommentary{"content":[{"type":"text","text":"{\\"agent\\":\\"OpenTargets\\"}"}]}',
      "assistantanalysisWe have the drug data. Now fetch protein.",
      'assistantcommentary to=functions.get_protein_data json{"accession":"Q13131"}',
      'assistantcommentary{"content":[{"type":"text","text":"{\\"agent\\":\\"UniProt\\"}"}]}',
      "assistantanalysisNow compile the final answer.",
      "assistantfinal**Metformin (CHEMBL112)** is an AMPK activator used in Alzheimer's research.",
      "",
      "It works via complex-I inhibition.",
    ].join("\n");

    const result = sanitizeAgentOutput(raw);

    // No internal tokens
    expect(result).not.toContain("assistantcommentary");
    expect(result).not.toContain("assistantanalysis");
    expect(result).not.toContain("assistantfinal");
    expect(result).not.toContain("to=functions");
    expect(result).not.toContain('"content"');

    // Actual prose preserved
    expect(result).toContain("Metformin (CHEMBL112)");
    expect(result).toContain("complex-I inhibition");
  });

  // ── Whitespace normalisation ────────────────────────────────────────────────

  it("collapses excessive blank lines", () => {
    const raw = "assistantfinalLine one.\n\n\n\n\nLine two.";
    const result = sanitizeAgentOutput(raw);
    // Should not have 3+ consecutive newlines
    expect(result).not.toMatch(/\n{3,}/);
    expect(result).toContain("Line one.");
    expect(result).toContain("Line two.");
  });

  it("trims leading and trailing whitespace", () => {
    const raw = "assistantfinal   \n\nClean content.\n\n  ";
    const result = sanitizeAgentOutput(raw);
    expect(result).toBe("Clean content.");
  });
});
