# Entropy-v2 Architecture and Working Pipeline

Entropy is an autonomous multi-agent drug-repurposing research platform built on the Mastra framework and TypeScript. When a user submits a research query (e.g., "Can metformin be repurposed for Alzheimer's disease?"), Entropy orchestrates a pipeline of specialized AI agents to gather evidence, analyze gaps, verify claims, and produce a fully cited research dossier with a human-in-the-loop (HITL) review step.

Below is the complete working pipeline, orchestration flow, and details on how individual agents operate.

---

## 1. The Core Research Pipeline (Orchestration)

The core orchestration resides in `apps/mastra-app/src/workflows/research-pipeline.ts`. The pipeline steps are executed sequentially, except for the parallel data-gathering agents.

### Step-by-Step Flow

1. **Session Initialization & Audit Trail**
   * Before any generation occurs, an audit session is created (backed by PostgreSQL) storing the initial query.
   * Every subsequent step logs input prompts and agent outputs to this audit store (`auditStore.logAgentTrace`).

2. **Planner Step (`plannerStep`)**
   * The user's query is passed to the **Planner Agent**.
   * It decomposes the query into a structured PPICO format (Population, Intervention, Comparison, Outcome) and assigns specific sub-tasks to the downstream parallel agents.

3. **Parallel Agents Execution**
   * The workflow uses `.parallel()` to run four specialized worker agents concurrently:
     * `biologistStep`
     * `clinicalScoutStep`
     * `hawkStep` (Safety)
     * `librarianStep`
   * Each agent receives the original query, the PICO breakdown, and their specific sub-tasks assigned by the Planner.

4. **Evidence Merging (`mergeEvidenceStep`)**
   * The results from the four parallel agents are aggregated into a single `Evidence` object. Wait times are minimized by the parallel execution.
   * The results are sanitized and formatted sequentially with timestamps and success/failure statuses.

5. **Gap Analysis (`gapAnalystStep`)**
   * The aggregated evidence is passed to the **Gap Analyst Agent** along with a baseline Target Product Profile (TPP) checklist.
   * The analyst identifies areas where evidence is lacking or contrary to the TPP.

6. **Verification (`verifierStep`)**
   * All previous outputs (merged evidence + gap analysis) are passed to the **Verifier Agent**.
   * The Verifier fact-checks the claims, ensuring that biological, clinical, and safety claims are backed by the citations provided by the tools.

7. **Human-in-the-Loop Review (`humanReviewStep`)**
   * The workflow **suspends** execution at this step.
   * An HTML preview of the report is generated and the system waits for a human reviewer's input (via the REST API).
   * **Reviewer Actions**:
     * **Approve**: The workflow resumes and proceeds to the report generation.
     * **Request Changes**: The reviewer provides suggestions. The workflow dynamically feeds these suggestions back into the Verifier Agent to iteratively refine the report, then suspends again for another review.
     * **Reject**: Fails/halts the iteration as requested.

8. **Report Generation (`reportStep`)**
   * Once approved, a final HTML report and a standalone LaTeX/PDF dossier (compiled via `pandoc` + `xelatex`) are generated.
   * The workflow marks the session as `completed` in the audit store.

---

## 2. Agent Details and Responsibilities

Agents define explicit personas, instructions, and have access to unique Model Context Protocol (MCP) tools for interacting with real-world databases.

### 1. Planner Agent
* **Role**: The orchestrator of sub-tasks.
* **Function**: Uses the PICO framework to parse the natural-language request. Creates an execution plan by dynamically generating sub-tasks, priorities, and dependency chains for the Biologist, Clinical Scout, Hawk, and Librarian.
* **Output**: Structured JSON containing the breakdown and task assignments.

### 2. Biologist Agent
* **Role**: Molecular biologist focusing on target validation.
* **Tools Used**: `mcp-biology` tools (Open Targets, UniProt, NCBI, Ensembl).
* **Function**: Investigates gene targets, protein interactions, mechanism of action, pathway analysis, and druggability assessment.
* **Constraint**: Must provide source citations with database names, endpoints, and retrieval timestamps.

### 3. Clinical Scout Agent
* **Role**: Clinical trial researcher.
* **Tools Used**: `mcp-clinical` tools (ClinicalTrials.gov).
* **Function**: Scours the clinical trial landscape to find study designs, endpoints, patient populations, and recruitment statuses relevant to the repurposed drug.

### 4. Hawk Agent (Safety)
* **Role**: Pharmacovigilance and drug safety expert.
* **Tools Used**: `mcp-safety` tools (OpenFDA).
* **Function**: Assesses safety profiles, adverse events, contraindications, drug interactions, and FDA safety alerts.

### 5. Librarian Agent
* **Role**: Literature reviewer.
* **Tools Used**: PubMed, preprints, and citation networks.
* **Function**: Retrieves supporting or contradicting academic literature to ground the findings in published science.

### 6. Gap Analyst Agent
* **Role**: Strategic assessor.
* **Function**: Compares the retrieved evidence against a Target Product Profile (TPP) checklist. Highlights weak clinical signals, IP risks (to be fully integrated later), missing comparative efficacy data, or biological uncertainties.

### 7. Verifier Agent
* **Role**: The fact-checking judge/editor.
* **Function**: Cross-references the generated claims. It ensures no hallucinations occur by verifying that every biological or clinical claim is explicitly backed by an MCP tool citation. Re-runs iteratively based on Human Reviewer suggestions.

---

## 3. Technology Stack & API Orchestration

The system operates as a **pnpm monorepo**:

* **`apps/mastra-app`**: Contains the Mastra workflows, schemas, and agents described above.
* **`apps/api`**: A Hono REST API server exposing the Mastra pipeline.
  * Start Session: `POST /api/research`
  * Check Status: `GET /api/research/:sessionId`
  * Submit HITL Decision: `POST /api/research/:sessionId/review`
* **`packages/mcp-*`**: Isolated packages acting as MCP servers to connect to third-party endpoints (e.g., Open Targets, OpenFDA).
* **Audit & Telemetry**: PostgreSQL database ensures session states and exact LLM prompts/responses are persisted for traceability.

## 4. Future Additions (per Product Direction)
According to the current `entropy-direction.md`, the architecture will soon include:
* **Patent Landscape Agent**: For Freedom-To-Operate (FTO) and expiry checks via USPTO.
* **IQVIA / EXIM Agents**: For market sizing and import/export trend analysis.
* **Internal Knowledge Agent**: RAG over internal pharmaceutical intelligence decks.
