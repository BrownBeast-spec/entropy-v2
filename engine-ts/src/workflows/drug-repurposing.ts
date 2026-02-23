import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { coPharmaAgent } from "../agents/co-pharma.js";

// ─── Input / Resume Schemas ─────────────────────────────────────────────────

const WorkflowInput = z.object({
    drug_name: z.string(),
    gene_target: z.string(),
    indication: z.string(),
});

// ─── Step 1: Gather Biology (Biologist Agent) ────────────────────────────────
// Receives the workflow trigger input directly via `inputData`.

const gatherBiologyStep = createStep({
    id: "gather-biology",
    inputSchema: WorkflowInput,
    outputSchema: z.object({ biology: z.string(), drug_name: z.string() }),
    execute: async ({ inputData }) => {
        const result = await coPharmaAgent.generate(
            `Validate target ${inputData.gene_target} for ${inputData.indication}`
        );
        return {
            biology: result.text,
            drug_name: inputData.drug_name,
        };
    }
});

// ─── Step 2: Gap Analysis ────────────────────────────────────────────────────

const gapAnalysisStep = createStep({
    id: "gap-analysis",
    inputSchema: z.object({
        biology: z.string(),
        drug_name: z.string(),
    }),
    outputSchema: z.object({
        gaps: z.string(),
        dossier_draft: z.string(),
        biology: z.string(),
    }),
    execute: async ({ inputData }) => {
        const dossierDraft = `# Draft Dossier — ${inputData.drug_name}

## Biologist Findings
${inputData.biology}

## Gaps
- Missing clinical trial data
- Missing safety / adverse-event analysis
`;
        return {
            gaps: "Missing trial and safety data.",
            dossier_draft: dossierDraft,
            biology: inputData.biology,
        };
    }
});

// ─── Step 3: HITL — suspend for human review ──────────────────────────────────
// On first run  → suspend() pauses the workflow; the dossier preview is stored
//                 as suspendData so it's available when the run is resumed.
// On resume     → resumeData holds { approved, notes } from the reviewer.

const humanReviewStep = createStep({
    id: "human-review",
    inputSchema: z.object({
        dossier_draft: z.string(),
        biology: z.string(),
    }),
    outputSchema: z.object({
        approved: z.boolean(),
        reviewer_notes: z.string(),
        dossier_draft: z.string(),
    }),
    resumeSchema: z.object({
        approved: z.boolean(),
        notes: z.string().optional(),
    }),
    suspendSchema: z.object({
        dossier_preview: z.string(),
    }),
    execute: async ({ inputData, resumeData, suspend }) => {
        const { approved, notes } = resumeData ?? {};

        // First execution: suspend and surface the draft to the reviewer
        if (!approved) {
            return await suspend({ dossier_preview: inputData.dossier_draft });
        }

        // Resumed: the reviewer approved — continue
        return {
            approved: true,
            reviewer_notes: notes ?? "",
            dossier_draft: inputData.dossier_draft,
        };
    }
});

// ─── Step 4: Finalize Dossier ─────────────────────────────────────────────────

const finalizeDossierStep = createStep({
    id: "finalize-dossier",
    inputSchema: z.object({
        dossier_draft: z.string(),
        approved: z.boolean(),
        reviewer_notes: z.string(),
    }),
    outputSchema: z.object({ final_dossier: z.string() }),
    execute: async ({ inputData }) => {
        if (!inputData.approved) {
            throw new Error("Dossier rejected by reviewer");
        }

        const finalDossier = `# Final Approved Dossier

## Reviewer Notes
${inputData.reviewer_notes || "None"}

---

${inputData.dossier_draft}`;

        return { final_dossier: finalDossier };
    }
});

// ─── Assemble Workflow ────────────────────────────────────────────────────────

export const drugRepurposingWorkflow = createWorkflow({
    id: "drug-repurposing-dossier",
    inputSchema: WorkflowInput,
    outputSchema: z.object({ final_dossier: z.string() }),
})
    .then(gatherBiologyStep)
    .then(gapAnalysisStep)
    .then(humanReviewStep)
    .then(finalizeDossierStep)
    .commit();
