# Entropy V2 — Gap Analysis: Current State vs. Proposed Architecture

> **Date**: February 21, 2026  
> **Scope**: Mastra + MCP + CopilotKit (AG-UI) full-stack integration

---

## TL;DR

The current implementation is a **well-built Phase 1 research data layer** — essentially a FastAPI REST service wrapping five specialized data-source agents. It is roughly **18–20% of the way** toward the complete Mastra + MCP + CopilotKit production architecture. The data access foundation is solid and correct; everything above it (orchestration, workflows, HITL, streaming frontend, and strategic intelligence) is not yet built.

---

## What IS Built (✅ Done)

| Layer | Component | Status |
|---|---|---|
| **Data Agents** | `OpenFDAAgent` (Regulatory Scout) | ✅ Complete — 6 endpoints, rate-limited |
| **Data Agents** | `OpenTargetsAgent` (Biologist) | ✅ Complete — 5 endpoints, GraphQL |
| **Data Agents** | `PubMedAgent` (Librarian) | ✅ Complete — PubMed + preprints |
| **Data Agents** | `PubChemAgent` (Chemist) | ✅ Complete — multi-input, bioassays |
| **Data Agents** | `EnsemblAgent` (Genomics) | ✅ Complete — variants, homology, xrefs |
| **Data Core** | `ClinicalTrialsV2` | ✅ Complete — ClinicalTrials.gov |
| **Data Core** | `UniProtClient` | ✅ Complete — used by target validation |
| **API Server** | FastAPI with 26 REST endpoints | ✅ Complete — Swagger docs, Pydantic models |
| **Infrastructure** | Docker + `docker-compose.yml` | ✅ Exists (basic) |
| **Infrastructure** | Rate limiting across all agents | ✅ Implemented |
| **Infrastructure** | Async/await patterns throughout | ✅ Implemented |

---

## What is NOT Built (❌ Missing)

### Layer 1: MCP Protocol Wrapping (0%)
The five agents are called as **direct Python class methods**. There is no MCP server wrapping them. The proposed architecture requires each data source to be exposed as a proper **Model Context Protocol server** so that Mastra agents can call them as `tool-use` via a standardized, type-safe interface (Zod schemas on the JS side, or equivalently a JSON-RPC MCP server on the Python side).

### Layer 2: AI LLM Orchestration (0%)
There is no LLM layer at all. The current system returns raw structured JSON from APIs. No agent is "reasoning" or "synthesizing" — there is no:
- Orchestrator agent that interprets a user's research question
- Biologist, Clinical Scout, Gap Analyst, or Critic specialized LLM agents
- Strategist Agent (IQVIA + Perplexity Sonar Pro integration)
- LLM calls to Gemini, GPT-4o, or Claude anywhere in the codebase

### Layer 3: Mastra Workflow Engine (0%)
The `engine/mastra/workflows/__init__.py` file exists but is **completely empty** (`__all__ = []`). There is no:
- `createWorkflow()` equivalent pipeline
- Sequential `.then()` chaining of agent steps
- Output→input mapping between agents
- Workflow state management or persistence

### Layer 4: Human-in-the-Loop (HITL) (0%)
There is no `suspend()` / approval checkpoint anywhere. The system returns data immediately with no concept of:
- Pausing for human researcher review
- Storing intermediate workflow state to a persistent DB
- Resuming a paused workflow after approval/rejection

### Layer 5: State Persistence / Database (0%)
The Node.js `server/` has a skeleton Express + Mongoose setup but routes are commented out. There is no:
- PostgreSQL or Turso store for workflow state
- Session management for multi-step research runs
- Audit log / provenance trail for compliance

### Layer 6: AG-UI / SSE Streaming Layer (0%)
There is no `/api/copilotkit` or equivalent endpoint. No:
- `EventEncoder` implementation for Server-Sent Events
- `STATE_SNAPSHOT` / `STATE_DELTA` events
- Streaming of agent progress to the frontend

### Layer 7: Frontend (0%)
The `client/src/app.jsx` is the **Preact/Vite default boilerplate** — a counter component. There is no:
- `<CopilotKit>` provider
- `<CopilotChat>` interface
- `useCoAgentStateRender` for live data tables
- `useCopilotAction` for HITL Accept/Reject UI
- Any application-specific UI at all

### Layer 8: Missing Data Sources (0%)
Proposed but not integrated:
- **ClinicalTrials MCP server** (the ClinicalTrialsV2 client exists but is not MCP-wrapped)
- **IQVIA** commercial data (HCP networks, prescription trends)
- **Perplexity Sonar Pro** for market/trade intelligence

### Layer 9: Observability / Compliance (0%)
No OpenTelemetry (OTEL) setup, no Langfuse/Datadog integration, no immutable audit trail for pharma compliance.

---

## Gap Summary

```
Completed  [████░░░░░░░░░░░░░░░░]  ~18%
Remaining  [░░░░████████████████]  ~82%
```

| Phase | Description | % Done |
|---|---|---|
| **Phase 1 (Data Layer)** | 5 specialized API agents + REST server | ✅ 100% |
| **Phase 2 (MCP Wrapping)** | Convert agents into MCP servers | 0% |
| **Phase 3 (LLM Agents)** | Orchestrator + 5 reasoning agents | 0% |
| **Phase 4 (Workflow)** | Mastra `createWorkflow()` pipeline | 0% |
| **Phase 5 (HITL)** | `suspend()` + PostgreSQL state | 0% |
| **Phase 6 (AG-UI)** | SSE streaming endpoint | 0% |
| **Phase 7 (Frontend)** | CopilotKit React app | 0% |
| **Phase 8 (Strategist)** | IQVIA + Perplexity vertical | 0% |
| **Phase 9 (Observability)** | OTEL + Langfuse | 0% |
