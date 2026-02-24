# Entropy Engine

Entropy is an autonomous multi-agent drug-repurposing research platform built on [Mastra](https://mastra.ai) and TypeScript. Given a research query (e.g., "Can metformin be repurposed for Alzheimer's disease?"), it orchestrates a pipeline of specialised AI agents to produce a fully cited LaTeX/PDF research dossier with a human-in-the-loop review step.

## Architecture

The system is a **pnpm monorepo** with the following packages:

```
apps/
  mastra-app/   — Core pipeline: agents, workflows, report generator
  api/          — Hono REST API exposing the pipeline over HTTP
packages/
  mcp-biology/  — MCP server: Open Targets, UniProt, NCBI biology tools
  mcp-clinical/ — MCP server: ClinicalTrials.gov tools
  mcp-safety/   — MCP server: OpenFDA drug safety tools
  mcp-commercial/ — MCP server: commercial/market data tools
  audit/        — PostgreSQL-backed audit trail (provenance logging)
  telemetry/    — OpenTelemetry instrumentation
```

### Research Pipeline (`apps/mastra-app`)

The pipeline is a **Mastra workflow** with these sequential steps:

1. **Planner** — Decomposes the query into a structured PPICO research plan
2. **Parallel agents** (run concurrently):
   - **Biologist** — Biological rationale via Open Targets / UniProt MCP tools
   - **Clinical Scout** — Clinical trial landscape via ClinicalTrials.gov MCP tools
   - **Hawk (Safety)** — Drug safety profile via OpenFDA MCP tools
   - **Librarian** — Literature review via PubMed
3. **Gap Analyst** — Identifies evidence gaps against a Target Product Profile (TPP)
4. **Verifier** — Fact-checks claims using an LLM judge
5. **Human Review (HITL)** — Suspends for a reviewer to approve or reject the dossier
6. **Report Generator** — Produces a `.tex` file and compiles a PDF via pandoc + xelatex

### REST API (`apps/api`)

A [Hono](https://hono.dev) server exposing the pipeline:

| Method | Endpoint                          | Description                                 |
| ------ | --------------------------------- | ------------------------------------------- |
| `POST` | `/api/research`                   | Submit a research query, returns session ID |
| `GET`  | `/api/research/:sessionId`        | Get session status and results              |
| `GET`  | `/api/research/:sessionId/agents` | Per-agent status                            |
| `POST` | `/api/research/:sessionId/review` | Submit HITL review decision                 |
| `GET`  | `/api/research/:sessionId/report` | Download the compiled LaTeX report          |
| `GET`  | `/api/research/:sessionId/audit`  | Get audit trail for a session               |
| `GET`  | `/api/health`                     | Health check                                |

Error responses follow a consistent format:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Session not found",
    "details": {}
  }
}
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- pandoc + xelatex (for PDF report generation)

```bash
# Install pandoc and xelatex (Ubuntu/Debian)
sudo apt install pandoc texlive-xetex
```

### Installation

```bash
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

Key variables:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=   # Gemini (primary LLM)
ANTHROPIC_API_KEY=              # Anthropic Claude (optional)
OPENAI_API_KEY=                 # OpenAI (optional)
DATABASE_URL=                   # PostgreSQL for audit trail
```

### Running

```bash
# Build all packages
pnpm -r build

# Start the API server (port 3001)
pnpm --filter @entropy/api start

# Start the Mastra dev playground
pnpm --filter @entropy/mastra-app dev
```

### Running with Docker

```bash
docker compose up
```

Services:

- `postgres` on port 5432
- `api` on port 3001
- `server` on port 5000
- `client` on port 5173

## Testing

Tests use [Vitest](https://vitest.dev). All packages have test coverage:

```bash
# Run all tests
pnpm -r test

# Run specific test file
npx vitest run "apps/api/src/__tests__/api.test.ts"
```

Current test coverage:

- `apps/mastra-app` — 44 tests (unit + real pandoc/xelatex PDF compilation)
- `apps/api` — 12 tests (all REST endpoints)

## License

Open-source for research purposes.
