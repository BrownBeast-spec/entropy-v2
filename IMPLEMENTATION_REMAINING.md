# Entropy V2 — Technical Implementation Remaining

> **Date**: February 21, 2026  
> **Prerequisite**: Read `GAP_ANALYSIS.md` first

---

## Architecture Decision: Python vs. JavaScript/TypeScript

> [!IMPORTANT]
> The Mastra framework is a **TypeScript/JavaScript** library. Your current engine is in **Python**. There are two valid paths:
>
> **Option A (Recommended):** Keep the Python FastAPI layer as a self-contained **MCP server** and build the Mastra orchestration layer in TypeScript as a separate `engine-ts/` service. This gives you the full Mastra ecosystem (typed tools, `suspend()`, workflow engine) while keeping your existing Python data agents intact.
>
> **Option B:** Rewrite the Python agents in TypeScript using the Mastra native tool system with Zod schemas. This is a larger rewrite but produces a single-language stack.
>
> This document assumes **Option A** as it preserves all existing Phase 1 work.

---

## Phase 2: MCP Server Wrapping (Python)

### Goal
Expose the existing FastAPI endpoints as a proper **Model Context Protocol (MCP) server** so the Mastra TypeScript layer can call them as LLM tools.

### What to build: `engine/mcp_server.py`

Use the `mcp` Python SDK (`pip install mcp`). Create a single MCP server that exposes each agent capability as a `tool`. Example structure:

```python
# engine/mcp_server.py
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
import json

app = Server("entropy-engine")

@app.list_tools()
async def list_tools():
    return [
        Tool(
            name="check_drug_safety",
            description="Check FDA drug safety, boxed warnings, recalls for a given drug name",
            inputSchema={
                "type": "object",
                "properties": {"drug": {"type": "string", "description": "Brand name of the drug"}},
                "required": ["drug"]
            }
        ),
        Tool(name="validate_gene_target", ...),
        Tool(name="search_literature", ...),
        Tool(name="get_compound_properties", ...),
        Tool(name="search_clinical_trials", ...),
        # ... one Tool per agent method
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "check_drug_safety":
        result = await openfda_agent.check_safety(arguments["drug"])
        return [TextContent(type="text", text=json.dumps(result))]
    # ... route all 26 endpoints
```

Run it as: `python engine/mcp_server.py` (uses stdio transport for Mastra to connect).

### Alternatively: HTTP/SSE MCP transport
For production, use `mcp.server.fastapi` to expose the MCP server over HTTP. The Mastra TypeScript layer then connects to `http://localhost:8001/mcp`.

---

## Phase 3: Mastra TypeScript Orchestration Layer

### Setup: `engine-ts/` directory

```bash
mkdir engine-ts && cd engine-ts
npm init -y
npm install @mastra/core @mastra/mcp zod
```

### 3.1 MCP Client + Tool Registration

```typescript
// engine-ts/src/tools/pharma-tools.ts
import { MCPClient } from "@mastra/mcp";
import { z } from "zod";

export const entropyMcp = new MCPClient({
  servers: {
    entropy: {
      transport: {
        type: "stdio",                         // or "http" for production
        command: "python",
        args: ["../engine/mcp_server.py"]
      }
    }
  }
});
// Returns Mastra Tool objects that wrap every MCP tool from the Python server
export const pharmaTools = await entropyMcp.getTools();
```

### 3.2 Specialized LLM Agents

```typescript
// engine-ts/src/agents/biologist.ts
import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";          // or openai, anthropic

export const biologistAgent = new Agent({
  name: "Biologist",
  instructions: `You are a molecular biologist specializing in target validation.
    Given a gene symbol, use your tools to:
    1. Validate the target using OpenTargets and UniProt
    2. Retrieve genomic sequences and variants from Ensembl
    3. Summarize the target's druggability, key pathways, and disease associations.
    Return a structured JSON summary.`,
  model: google("gemini-2.0-flash"),
  tools: {
    validate_gene_target: pharmaTools.validate_gene_target,
    get_gene_info: pharmaTools.get_gene_info,
    get_variation: pharmaTools.get_variation,
  }
});

// Repeat pattern for:
// clinicalScoutAgent  → search_clinical_trials, get_disease_info
// hawkAgent           → check_drug_safety, search_drugs_fda, get_adverse_events
// chemistAgent        → get_compound_properties, get_bioassays, search_chembl
// librarianAgent      → search_literature, search_preprints
// gapAnalystAgent     → (no tools, pure LLM synthesis over prior agents' outputs)
// criticAgent         → (validates the dossier against regulatory standards)
// strategistAgent     → perplexityTool, iqviaTool (custom tools, see Phase 8)
```

---

## Phase 4: Mastra Workflow (Drug Repurposing Dossier Pipeline)

### `engine-ts/src/workflows/drug-repurposing.ts`

```typescript
import { createWorkflow, createStep } from "@mastra/core/workflow";
import { z } from "zod";

// Input schema
const WorkflowInput = z.object({
  drug_name: z.string(),
  gene_target: z.string(),
  indication: z.string(),
});

// Step 1: Parallel data gathering
const gatherBiologyStep = createStep({
  id: "gather-biology",
  inputSchema: WorkflowInput,
  outputSchema: z.object({ biology: z.any() }),
  execute: async ({ inputData }) => {
    const result = await biologistAgent.generate(
      `Validate target ${inputData.gene_target} for ${inputData.indication}`
    );
    return { biology: result.text };
  }
});

const gatherTrialsStep = createStep({
  id: "gather-trials",
  inputSchema: WorkflowInput,
  outputSchema: z.object({ trials: z.any() }),
  execute: async ({ inputData }) => {
    const result = await clinicalScoutAgent.generate(
      `Find clinical trials for ${inputData.drug_name} in ${inputData.indication}`
    );
    return { trials: result.text };
  }
});

const safetyStep = createStep({
  id: "check-safety",
  inputSchema: WorkflowInput,
  outputSchema: z.object({ safety: z.any() }),
  execute: async ({ inputData }) => {
    const result = await hawkAgent.generate(
      `Run full safety profile for ${inputData.drug_name}`
    );
    return { safety: result.text };
  }
});

// Step 2: Gap Analysis (sequential — depends on Step 1 outputs)
const gapAnalysisStep = createStep({
  id: "gap-analysis",
  inputSchema: z.object({ biology: z.any(), trials: z.any(), safety: z.any() }),
  outputSchema: z.object({ gaps: z.string(), dossier_draft: z.string() }),
  execute: async ({ inputData }) => {
    const result = await gapAnalystAgent.generate(
      `Given the following research: Biology: ${inputData.biology}
       Trials: ${inputData.trials}, Safety: ${inputData.safety}
       Identify evidence gaps, missing data, and prepare a draft dossier.`
    );
    return { gaps: result.text, dossier_draft: result.text };
  }
});

// Step 3: HITL — SUSPEND for human review
const humanReviewStep = createStep({
  id: "human-review",
  inputSchema: z.object({ dossier_draft: z.string() }),
  outputSchema: z.object({ approved: z.boolean(), reviewer_notes: z.string() }),
  execute: async ({ inputData, suspend }) => {
    // This halts the workflow and persists state to PostgreSQL
    // The frontend's useCopilotAction hook surfaces the approve/reject UI
    const reviewDecision = await suspend({
      message: "Researcher review required before finalizing dossier",
      dossier_preview: inputData.dossier_draft,
    });
    return {
      approved: reviewDecision.approved,
      reviewer_notes: reviewDecision.notes ?? ""
    };
  }
});

// Step 4: Final output (only runs after human approval)
const finalizeDossierStep = createStep({
  id: "finalize-dossier",
  inputSchema: z.object({
    dossier_draft: z.string(),
    approved: z.boolean(),
    reviewer_notes: z.string()
  }),
  outputSchema: z.object({ final_dossier: z.string() }),
  execute: async ({ inputData }) => {
    if (!inputData.approved) throw new Error("Dossier rejected by reviewer");
    const result = await criticAgent.generate(
      `Finalize and format this dossier incorporating these reviewer notes:
       ${inputData.reviewer_notes}
       Draft: ${inputData.dossier_draft}`
    );
    return { final_dossier: result.text };
  }
});

// Wire the workflow
export const drugRepurposingWorkflow = createWorkflow({
  id: "drug-repurposing-dossier",
  inputSchema: WorkflowInput,
})
  .parallel([gatherBiologyStep, gatherTrialsStep, safetyStep])  // concurrent
  .then(gapAnalysisStep)
  .then(humanReviewStep)   // ← HITL pause here
  .then(finalizeDossierStep)
  .commit();
```

---

## Phase 5: State Persistence (PostgreSQL / Turso)

### Required: Swap default LibSQLStore for external DB

```typescript
// engine-ts/src/mastra.ts
import { Mastra } from "@mastra/core";
import { PostgresStore } from "@mastra/pg";     // npm install @mastra/pg
import { drugRepurposingWorkflow } from "./workflows/drug-repurposing";

export const mastra = new Mastra({
  agents: { biologistAgent, clinicalScoutAgent, hawkAgent, ... },
  workflows: { drugRepurposingWorkflow },
  storage: new PostgresStore({
    connectionString: process.env.DATABASE_URL,  // Postgres or Turso
  }),
  // Workflow state survives server restarts — critical for HITL pause/resume
});
```

This is mandatory because:
- The `suspend()` call in `humanReviewStep` serializes the entire execution graph to the database
- If you use the default SQLite/LibSQL store and the server restarts, suspended workflows are lost
- For pharma compliance, the state store IS the audit log

---

## Phase 6: AG-UI Streaming Endpoint

### Create `/api/copilotkit` in `engine-ts/src/routes/copilotkit.ts`

```typescript
import { CopilotRuntime, ExperimentalEmptyAdapter } from "@copilotkit/runtime";
import { MastraAgent } from "@copilotkit/runtime-mastra";   // adapter package

const orchestratorAgent = mastra.getAgent("Orchestrator");

export const copilotHandler = async (req: Request, res: Response) => {
  const runtime = new CopilotRuntime({
    agents: [new MastraAgent(orchestratorAgent)],
  });

  return runtime.handleRequest(req, res);
  // Returns: SSE stream of AG-UI events:
  // RUN_STARTED, TOOL_CALL_START, TOOL_CALL_END, TEXT_MESSAGE_CONTENT,
  // STATE_SNAPSHOT, STATE_DELTA, STEP_FINISHED, RUN_FINISHED
};
```

For the HITL suspend flow specifically, the AG-UI protocol sends a `STEP_FINISHED` event with a `suspended: true` flag. The frontend's `useCopilotAction` hook detects this and renders the review UI.

---

## Phase 7: Frontend — CopilotKit React App

### Replace the Preact boilerplate in `client/src/`

```
client/
├── package.json         ← add @copilotkit/react-core, @copilotkit/react-ui
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── TrialsTable.tsx       ← renders live trial data from STATE_DELTA
│   │   ├── SafetyCard.tsx        ← renders safety profile in real-time
│   │   ├── DossierReview.tsx     ← HITL: Accept/Reject buttons
│   │   └── DossierOutput.tsx     ← final formatted dossier
│   └── hooks/
│       └── useDrugResearch.ts    ← custom hook wrapping CopilotKit hooks
```

### Core Provider Setup

```tsx
// src/main.tsx
import { CopilotKit } from "@copilotkit/react-core";

root.render(
  <CopilotKit runtimeUrl="/api/copilotkit" agent="Orchestrator">
    <App />
  </CopilotKit>
);
```

### Live State Rendering (AG-UI → UI Components)

```tsx
// src/App.tsx
import { useCoAgentStateRender } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { TrialsTable } from "./components/TrialsTable";

export function App() {
  // Renders custom UI inside the chat thread as workflow state arrives
  useCoAgentStateRender({
    name: "drug_repurposing_state",
    render: ({ state }) => {
      if (state.trials) return <TrialsTable data={state.trials} />;
      if (state.safety) return <SafetyCard data={state.safety} />;
      return null;
    }
  });

  return <CopilotChat placeholder="Enter drug name, target gene, and indication..." />;
}
```

### HITL Accept/Reject (Critical)

```tsx
// src/components/DossierReview.tsx
import { useCopilotAction } from "@copilotkit/react-core";

export function DossierReview() {
  useCopilotAction({
    name: "review_dossier",              // matches suspend() event name from Mastra
    description: "Request human researcher approval for the generated dossier",
    parameters: [
      { name: "dossier_preview", type: "string", description: "Draft dossier text" }
    ],
    renderAndWaitForResponse: ({ args, respond }) => (
      <div className="hitl-review-panel">
        <h2>Researcher Review Required</h2>
        <pre className="dossier-preview">{args.dossier_preview}</pre>
        <textarea
          placeholder="Add reviewer notes..."
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="review-actions">
          <button
            className="btn-approve"
            onClick={() => respond({ approved: true, notes })}
          >
            ✓ Approve — Finalize Dossier
          </button>
          <button
            className="btn-reject"
            onClick={() => respond({ approved: false, notes })}
          >
            ✗ Reject — Send Back
          </button>
        </div>
      </div>
    )
  });

  return null;  // Renders inline in the CopilotChat thread when triggered
}
```

---

## Phase 8: Strategist Agent (IQVIA + Perplexity Sonar Pro)

### Custom Tools to Build

```typescript
// engine-ts/src/tools/perplexity.ts
import { createTool } from "@mastra/core/tool";

export const perplexitySonarTool = createTool({
  id: "perplexity-sonar-market-intelligence",
  description: "Real-time market intelligence: trade data, import/export, competitor landscape",
  inputSchema: z.object({
    query: z.string(),
    focus: z.enum(["market", "trade", "competition", "regulatory"])
  }),
  execute: async ({ context }) => {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [{ role: "user", content: context.query }],
        search_recency_filter: "month",
        return_citations: true
      })
    });
    return response.json();
  }
});

// engine-ts/src/tools/iqvia.ts
// IQVIA requires commercial licensing. Tool wraps their RESTful API or SFTP data feeds.
// Fields: prescriber_data, market_share, hcp_network_map, rx_trends
export const iqviaTool = createTool({ ... });
```

The `strategistAgent` receives outputs from all research agents and synthesizes a **commercial viability blueprint** using these tools.

---

## Phase 9: Observability (OTEL + Langfuse)

```typescript
// engine-ts/src/mastra.ts
import { LangfuseExporter } from "langfuse-vercel";

export const mastra = new Mastra({
  ...,
  telemetry: {
    serviceName: "entropy-pharma",
    enabled: true,
    export: {
      type: "custom",
      exporter: new LangfuseExporter({
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY,
      })
    }
  }
});
```

Every agent execution, tool call, and workflow step transition is recorded with:
- Input/output payloads
- Latency
- Token usage
- Which human approved/rejected which dossier

This satisfies pharma GxP audit trail requirements.

---

## Full Directory Structure (Target State)

```
entropy-v2/
├── engine/                       # ✅ Existing Python FastAPI (Phase 1)
│   ├── main.py                   # REST API (26 endpoints)
│   ├── mcp_server.py             # ← NEW: MCP server wrapping agents (Phase 2)
│   └── mastra/
│       ├── agents/               # ✅ 5 data agents
│       ├── tools/                # ✅ UniProt client
│       ├── core/                 # ✅ ClinicalTrialsV2
│       └── scorers/
│
├── engine-ts/                    # ← NEW: Mastra TypeScript layer (Phases 3-5, 8-9)
│   ├── src/
│   │   ├── mastra.ts             # Mastra instance + PostgreSQL store
│   │   ├── agents/               # LLM orchestration agents (Biologist, Scout, etc.)
│   │   ├── workflows/            # drugRepurposingWorkflow with HITL
│   │   ├── tools/                # Perplexity, IQVIA, custom tools
│   │   └── routes/
│   │       └── copilotkit.ts     # AG-UI SSE endpoint (Phase 6)
│   └── package.json
│
├── client/                       # Frontend (Phase 7)
│   └── src/
│       ├── App.tsx               # CopilotKit provider + CopilotChat
│       └── components/
│           ├── TrialsTable.tsx
│           ├── SafetyCard.tsx
│           ├── DossierReview.tsx # HITL interface
│           └── DossierOutput.tsx
│
├── server/                       # Node.js Express (currently skeleton)
│   └── index.js                  # ← Potentially merge into engine-ts
│
├── docker-compose.yml            # ← Update: add postgres, engine-ts services
├── GAP_ANALYSIS.md               # ← This analysis
└── IMPLEMENTATION_REMAINING.md   # ← This document
```

---

## Dependency Packages to Install

### Python (engine/)
```bash
pip install mcp                  # MCP server SDK
```

### TypeScript (engine-ts/)
```bash
npm install @mastra/core @mastra/mcp @mastra/pg
npm install @copilotkit/runtime @copilotkit/runtime-mastra
npm install @ai-sdk/google zod
npm install hono                 # Mastra build output, or Express
```

### Frontend (client/)
```bash
npm install @copilotkit/react-core @copilotkit/react-ui
# Switch from preact to React (CopilotKit requires React)
npm install react react-dom
```

---

## Implementation Order (Recommended)

```mermaid
graph TD
    A[Phase 2: mcp_server.py] --> B[Phase 3: Mastra agents + tools in TS]
    B --> C[Phase 4: Workflow with suspend()]
    C --> D[Phase 5: PostgreSQL persistence]
    D --> E[Phase 6: /api/copilotkit SSE endpoint]
    E --> F[Phase 7: CopilotKit React frontend]
    F --> G[Phase 8: Strategist Agent]
    G --> H[Phase 9: OTEL + Langfuse]
```

> [!TIP]
> You can validate Phases 2–4 entirely via the Mastra playground (`mastra dev`) before touching the frontend. This lets you verify the workflow, suspend/resume, and agent reasoning completely independently.
