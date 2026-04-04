# Phase 1: Backend Foundation - Manual Search-Select UX

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement backend APIs and agents for manual search-and-select workflow (Phase 1 of 2).

**Scope:**

- Helpfulness agent with gap-filling scoring logic
- Search API endpoint (`POST /api/entropy/search`)
- Add-nodes API endpoint (`POST /api/workspace/add-nodes`)
- Full test coverage per CLAUDE.md requirements

**Architecture:** Clean separation - search API returns scored results (no mutation), helpfulness agent scores by gap-filling potential, add-nodes converts selected results to graph format.

**Tech Stack:** Hono (backend), Mastra (agents), Vitest

**Spec Document:** `docs/superpowers/specs/2026-04-05-manual-search-select-ux-design.md`

**Next Phase:** Phase 2 will implement frontend components (RightChatPanel workspace mode, metric cards, layout changes).

---

## Chunk 1: Helpfulness Agent & Search API

### Task 1: Helpfulness Agent Implementation

**Files:**

- Create: `apps/mastra-app/src/agents/helpfulness-agent.ts`
- Create: `apps/mastra-app/src/__tests__/helpfulness-agent.test.ts`
- Modify: `apps/mastra-app/src/index.ts` (export new agent)

#### Step 1: Write failing test for helpfulness agent - duplicate detection

- [ ] **Create test file with duplicate detection test**

```typescript
// apps/mastra-app/src/__tests__/helpfulness-agent.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { scoreHelpfulness } from "../agents/helpfulness-agent";

describe("helpfulness-agent", () => {
  describe("duplicate detection", () => {
    it("should return score 0 for entity already in graph", async () => {
      const result = {
        entityId: "ENSG00000123456",
        entityType: "protein",
        label: "AMPK alpha-1",
        source: "STRING",
        metadata: { pathway: "AMPK signaling" },
      };

      const graphSnapshot = {
        nodeIds: ["ENSG00000123456", "ENSG00000789012"],
        nodeTypes: { ENSG00000123456: "protein", ENSG00000789012: "protein" },
        edgeSummary: [],
      };

      const response = await scoreHelpfulness({
        result,
        graphSnapshot,
        queryContext: "metformin targets in NASH",
      });

      expect(response.score).toBe(0);
      expect(response.explanation).toContain("already in graph");
      expect(response.gapsFilled).toEqual([]);
    });
  });
});
```

- [ ] **Run test to verify it fails**

Run: `pnpm --filter @entropy/mastra-app vitest run src/__tests__/helpfulness-agent.test.ts`

Expected: FAIL with "Cannot find module '../agents/helpfulness-agent'"

#### Step 2: Write minimal agent implementation - duplicate check only

- [ ] **Create agent file with duplicate check**

```typescript
// apps/mastra-app/src/agents/helpfulness-agent.ts
export interface HelpfulnessInput {
  result: {
    entityId: string;
    entityType: string;
    label: string;
    source: string;
    metadata: Record<string, any>;
  };
  graphSnapshot: {
    nodeIds: string[];
    nodeTypes: Record<string, string>;
    edgeSummary: Array<{
      source: string;
      target: string;
      type: string;
    }>;
  };
  queryContext: string;
}

export interface HelpfulnessOutput {
  score: number;
  explanation: string;
  gapsFilled: string[];
}

export async function scoreHelpfulness(
  input: HelpfulnessInput,
): Promise<HelpfulnessOutput> {
  const { result, graphSnapshot } = input;

  // Duplicate check
  if (graphSnapshot.nodeIds.includes(result.entityId)) {
    return {
      score: 0,
      explanation: `Entity ${result.label} already in graph`,
      gapsFilled: [],
    };
  }

  // Placeholder for full scoring logic
  return {
    score: 50,
    explanation: "Basic score (full logic pending)",
    gapsFilled: [],
  };
}
```

- [ ] **Run test to verify it passes**

Run: `pnpm --filter @entropy/mastra-app vitest run src/__tests__/helpfulness-agent.test.ts`

Expected: PASS (1 test)

- [ ] **Commit duplicate detection**

```bash
git add apps/mastra-app/src/agents/helpfulness-agent.ts apps/mastra-app/src/__tests__/helpfulness-agent.test.ts
git commit -m "feat(mastra): add helpfulness agent with duplicate detection"
```

#### Step 3: Add test for novelty scoring (underrepresented entity type)

- [ ] **Write test for type underrepresentation**

```typescript
// Add to apps/mastra-app/src/__tests__/helpfulness-agent.test.ts
describe("novelty scoring", () => {
  it("should give bonus points for underrepresented entity type", async () => {
    const result = {
      entityId: "CHEMBL123",
      entityType: "drug",
      label: "Metformin",
      source: "Open Targets",
      metadata: {},
    };

    const graphSnapshot = {
      nodeIds: ["ENSG00001", "ENSG00002", "ENSG00003"], // 3 proteins, 0 drugs
      nodeTypes: {
        ENSG00001: "protein",
        ENSG00002: "protein",
        ENSG00003: "protein",
      },
      edgeSummary: [],
    };

    const response = await scoreHelpfulness({
      result,
      graphSnapshot,
      queryContext: "metformin targets",
    });

    expect(response.score).toBeGreaterThanOrEqual(20); // Novelty bonus
    expect(response.explanation).toContain("underrepresented");
  });
});
```

- [ ] **Run test to verify it fails**

Run: `pnpm --filter @entropy/mastra-app vitest run src/__tests__/helpfulness-agent.test.ts`

Expected: FAIL (score is 50, not >= 20 with correct explanation)

#### Step 4: Implement novelty scoring logic

- [ ] **Add type distribution analysis**

```typescript
// Update scoreHelpfulness in apps/mastra-app/src/agents/helpfulness-agent.ts
export async function scoreHelpfulness(
  input: HelpfulnessInput,
): Promise<HelpfulnessOutput> {
  const { result, graphSnapshot } = input;

  // Duplicate check
  if (graphSnapshot.nodeIds.includes(result.entityId)) {
    return {
      score: 0,
      explanation: `Entity ${result.label} already in graph`,
      gapsFilled: [],
    };
  }

  let score = 0;
  const explanations: string[] = [];

  // Novelty scoring (40 points max)
  const typeDistribution = Object.values(graphSnapshot.nodeTypes).reduce(
    (acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const resultTypeCount = typeDistribution[result.entityType] || 0;
  const totalNodes = graphSnapshot.nodeIds.length;

  // Underrepresented type bonus (20 points if < 10% of graph)
  if (totalNodes > 0) {
    const typePercentage = resultTypeCount / totalNodes;
    if (typePercentage < 0.1) {
      score += 20;
      explanations.push(`Adds underrepresented type: ${result.entityType}`);
    }
  }

  // New relationship type bonus (20 points)
  // Note: Defer to Phase 2 - requires metadata parsing per data source
  // For Phase 1, novelty scoring is sufficient for tracer bullet

  return {
    score,
    explanation: explanations.join("; ") || "Novel entity",
    gapsFilled: [],
  };
}
```

- [ ] **Run test to verify it passes**

Run: `pnpm --filter @entropy/mastra-app vitest run src/__tests__/helpfulness-agent.test.ts`

Expected: PASS (2 tests)

- [ ] **Commit novelty scoring**

```bash
git add apps/mastra-app/src/agents/helpfulness-agent.ts apps/mastra-app/src/__tests__/helpfulness-agent.test.ts
git commit -m "feat(mastra): add novelty scoring to helpfulness agent"
```

#### Step 5: Add test for gap analysis (semantic concepts)

- [ ] **Write test for gap-filling**

```typescript
// Add to apps/mastra-app/src/__tests__/helpfulness-agent.test.ts
describe("gap analysis", () => {
  it("should score higher for results introducing new concepts", async () => {
    const result = {
      entityId: "ENSG00005",
      entityType: "protein",
      label: "Glucose transporter",
      source: "STRING",
      metadata: {
        pathways: ["glucose uptake", "insulin signaling"],
        mechanisms: ["glucose transport"],
      },
    };

    const graphSnapshot = {
      nodeIds: ["ENSG00001"],
      nodeTypes: { ENSG00001: "protein" },
      edgeSummary: [],
    };

    const response = await scoreHelpfulness({
      result,
      graphSnapshot,
      queryContext: "glucose metabolism",
    });

    expect(response.score).toBeGreaterThanOrEqual(30); // Gap points
    expect(response.gapsFilled.length).toBeGreaterThan(0);
    expect(response.gapsFilled).toContain("pathway:glucose uptake");
  });
});
```

- [ ] **Run test to verify it fails**

Run: `pnpm --filter @entropy/mastra-app vitest run src/__tests__/helpfulness-agent.test.ts`

Expected: FAIL (gapsFilled is empty, score too low)

#### Step 6: Implement gap analysis logic

- [ ] **Add concept extraction and comparison**

```typescript
// Update scoreHelpfulness in apps/mastra-app/src/agents/helpfulness-agent.ts
export async function scoreHelpfulness(
  input: HelpfulnessInput,
): Promise<HelpfulnessOutput> {
  const { result, graphSnapshot } = input;

  // Duplicate check
  if (graphSnapshot.nodeIds.includes(result.entityId)) {
    return {
      score: 0,
      explanation: `Entity ${result.label} already in graph`,
      gapsFilled: [],
    };
  }

  let score = 0;
  const explanations: string[] = [];
  const gapsFilled: string[] = [];

  // Novelty scoring (40 points max)
  const typeDistribution = Object.values(graphSnapshot.nodeTypes).reduce(
    (acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const resultTypeCount = typeDistribution[result.entityType] || 0;
  const totalNodes = graphSnapshot.nodeIds.length;

  if (totalNodes > 0) {
    const typePercentage = resultTypeCount / totalNodes;
    if (typePercentage < 0.1) {
      score += 20;
      explanations.push(`Adds underrepresented type: ${result.entityType}`);
    }
  }

  // Gap analysis (40 points max)
  const concepts = extractConcepts(result.metadata);
  // Note: For Phase 1, all concepts from result are treated as new (bootstrap)
  // Phase 2 will pass actual graph node metadata for comparison
  const existingConcepts = new Set<string>();

  let gapPoints = 0;
  concepts.forEach((concept) => {
    if (!existingConcepts.has(concept)) {
      gapsFilled.push(concept);
      gapPoints += 10;
    }
  });

  score += Math.min(gapPoints, 40);
  if (gapsFilled.length > 0) {
    explanations.push(`Fills gaps: ${gapsFilled.slice(0, 2).join(", ")}`);
  }

  return {
    score,
    explanation: explanations.join("; ") || "Novel entity",
    gapsFilled,
  };
}

function extractConcepts(metadata: Record<string, any>): string[] {
  const concepts: string[] = [];

  // Extract pathways
  if (Array.isArray(metadata.pathways)) {
    metadata.pathways.forEach((p: string) => {
      concepts.push(`pathway:${p}`);
    });
  }

  // Extract mechanisms
  if (Array.isArray(metadata.mechanisms)) {
    metadata.mechanisms.forEach((m: string) => {
      concepts.push(`mechanism:${m}`);
    });
  }

  // Extract indications
  if (Array.isArray(metadata.indications)) {
    metadata.indications.forEach((i: string) => {
      concepts.push(`indication:${i}`);
    });
  }

  return concepts;
}
```

- [ ] **Run test to verify it passes**

Run: `pnpm --filter @entropy/mastra-app vitest run src/__tests__/helpfulness-agent.test.ts`

Expected: PASS (3 tests)

- [ ] **Commit gap analysis**

```bash
git add apps/mastra-app/src/agents/helpfulness-agent.ts apps/mastra-app/src/__tests__/helpfulness-agent.test.ts
git commit -m "feat(mastra): add gap analysis to helpfulness agent"
```

#### Step 7: Add test for bootstrap mode (empty graph)

- [ ] **Write test for empty graph scoring**

```typescript
// Add to apps/mastra-app/src/__tests__/helpfulness-agent.test.ts
describe("bootstrap mode", () => {
  it("should score based on query relevance when graph is empty", async () => {
    const result = {
      entityId: "ENSG00005",
      entityType: "protein",
      label: "AMPK",
      source: "STRING",
      metadata: { description: "AMP-activated protein kinase" },
    };

    const graphSnapshot = {
      nodeIds: [],
      nodeTypes: {},
      edgeSummary: [],
    };

    const response = await scoreHelpfulness({
      result,
      graphSnapshot,
      queryContext: "AMPK targets in diabetes",
    });

    expect(response.score).toBeGreaterThan(50); // Query-relevant
    expect(response.explanation).toContain("bootstrap");
  });
});
```

- [ ] **Run test to verify it fails**

Run: `pnpm --filter @entropy/mastra-app vitest run src/__tests__/helpfulness-agent.test.ts`

Expected: FAIL (score logic doesn't handle empty graph)

#### Step 8: Implement bootstrap mode

- [ ] **Add bootstrap detection and keyword matching**

```typescript
// Update scoreHelpfulness in apps/mastra-app/src/agents/helpfulness-agent.ts
export async function scoreHelpfulness(
  input: HelpfulnessInput,
): Promise<HelpfulnessOutput> {
  const { result, graphSnapshot, queryContext } = input;

  // Duplicate check
  if (graphSnapshot.nodeIds.includes(result.entityId)) {
    return {
      score: 0,
      explanation: `Entity ${result.label} already in graph`,
      gapsFilled: [],
    };
  }

  // Bootstrap mode: empty graph
  if (graphSnapshot.nodeIds.length === 0) {
    const relevanceScore = calculateQueryRelevance(result, queryContext);
    return {
      score: relevanceScore,
      explanation: `Bootstrap mode: ${relevanceScore > 70 ? "highly" : "moderately"} relevant to query`,
      gapsFilled: [],
    };
  }

  let score = 0;
  const explanations: string[] = [];
  const gapsFilled: string[] = [];

  // Novelty scoring (40 points max)
  const typeDistribution = Object.values(graphSnapshot.nodeTypes).reduce(
    (acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const resultTypeCount = typeDistribution[result.entityType] || 0;
  const totalNodes = graphSnapshot.nodeIds.length;

  const typePercentage = resultTypeCount / totalNodes;
  if (typePercentage < 0.1) {
    score += 20;
    explanations.push(`Adds underrepresented type: ${result.entityType}`);
  }

  // Gap analysis (40 points max)
  const concepts = extractConcepts(result.metadata);
  const existingConcepts = new Set<string>();

  let gapPoints = 0;
  concepts.forEach((concept) => {
    if (!existingConcepts.has(concept)) {
      gapsFilled.push(concept);
      gapPoints += 10;
    }
  });

  score += Math.min(gapPoints, 40);
  if (gapsFilled.length > 0) {
    explanations.push(`Fills gaps: ${gapsFilled.slice(0, 2).join(", ")}`);
  }

  // Query relevance (20 points max)
  const relevancePoints = Math.floor(
    calculateQueryRelevance(result, queryContext) * 0.2,
  );
  score += relevancePoints;

  return {
    score,
    explanation: explanations.join("; ") || "Novel entity",
    gapsFilled,
  };
}

function calculateQueryRelevance(
  result: HelpfulnessInput["result"],
  query: string,
): number {
  const queryLower = query.toLowerCase();
  const labelLower = result.label.toLowerCase();
  const metadataStr = JSON.stringify(result.metadata).toLowerCase();

  // Simple keyword matching (0-100 scale)
  let relevance = 0;

  // Label match
  if (labelLower.includes(queryLower) || queryLower.includes(labelLower)) {
    relevance += 60;
  }

  // Partial keyword match
  const queryTokens = queryLower.split(/\s+/);
  const matchCount = queryTokens.filter(
    (token) => labelLower.includes(token) || metadataStr.includes(token),
  ).length;

  relevance += Math.min(matchCount * 10, 40);

  return Math.min(relevance, 100);
}

function extractConcepts(metadata: Record<string, any>): string[] {
  const concepts: string[] = [];

  if (Array.isArray(metadata.pathways)) {
    metadata.pathways.forEach((p: string) => {
      concepts.push(`pathway:${p}`);
    });
  }

  if (Array.isArray(metadata.mechanisms)) {
    metadata.mechanisms.forEach((m: string) => {
      concepts.push(`mechanism:${m}`);
    });
  }

  if (Array.isArray(metadata.indications)) {
    metadata.indications.forEach((i: string) => {
      concepts.push(`indication:${i}`);
    });
  }

  return concepts;
}
```

- [ ] **Run test to verify it passes**

Run: `pnpm --filter @entropy/mastra-app vitest run src/__tests__/helpfulness-agent.test.ts`

Expected: PASS (4 tests)

- [ ] **Commit bootstrap mode**

```bash
git add apps/mastra-app/src/agents/helpfulness-agent.ts apps/mastra-app/src/__tests__/helpfulness-agent.test.ts
git commit -m "feat(mastra): add bootstrap mode to helpfulness agent"
```

#### Step 9: Add error handling tests

- [ ] **Write tests for error cases**

```typescript
// Add to apps/mastra-app/src/__tests__/helpfulness-agent.test.ts
describe("error handling", () => {
  it("should handle missing metadata gracefully", async () => {
    const result = {
      entityId: "ENSG00005",
      entityType: "protein",
      label: "Unknown protein",
      source: "STRING",
      metadata: {},
    };

    const graphSnapshot = {
      nodeIds: ["ENSG00001"],
      nodeTypes: { ENSG00001: "protein" },
      edgeSummary: [],
    };

    const response = await scoreHelpfulness({
      result,
      graphSnapshot,
      queryContext: "protein function",
    });

    expect(response.score).toBeGreaterThanOrEqual(0);
    expect(response.explanation).toBeTruthy();
    expect(response.gapsFilled).toEqual([]);
  });

  it("should handle malformed metadata", async () => {
    const result = {
      entityId: "ENSG00005",
      entityType: "protein",
      label: "Test",
      source: "STRING",
      metadata: { pathways: "not-an-array" }, // Invalid format
    };

    const graphSnapshot = {
      nodeIds: [],
      nodeTypes: {},
      edgeSummary: [],
    };

    const response = await scoreHelpfulness({
      result,
      graphSnapshot,
      queryContext: "test query",
    });

    expect(response.score).toBeGreaterThanOrEqual(0);
    expect(response.gapsFilled).toEqual([]);
  });
});
```

- [ ] **Run tests to verify they pass**

Run: `pnpm --filter @entropy/mastra-app vitest run src/__tests__/helpfulness-agent.test.ts`

Expected: PASS (6 tests) - code already handles these cases gracefully

- [ ] **Commit error handling tests**

```bash
git add apps/mastra-app/src/__tests__/helpfulness-agent.test.ts
git commit -m "test(mastra): add error handling tests for helpfulness agent"
```

#### Step 10: Export agent and verify integration

- [ ] **Export scoreHelpfulness from mastra-app index**

```typescript
// Add to apps/mastra-app/src/index.ts
export { scoreHelpfulness } from "./agents/helpfulness-agent.js";
export type {
  HelpfulnessInput,
  HelpfulnessOutput,
} from "./agents/helpfulness-agent.js";
```

- [ ] **Run all mastra tests**

Run: `pnpm --filter @entropy/mastra-app test`

Expected: All tests pass

- [ ] **Commit export**

```bash
git add apps/mastra-app/src/index.ts
git commit -m "feat(mastra): export helpfulness agent"
```

---

### Task 2: Search API Endpoint

**Files:**

- Create: `apps/api/src/routes/entropy.ts` (if doesn't exist, else modify)
- Create: `apps/api/src/__tests__/search.test.ts`
- Modify: `apps/api/src/index.ts` (mount search route)

#### Step 1: Write failing test for search endpoint - happy path

- [ ] **Create test file with happy path test**

```typescript
// apps/api/src/__tests__/search.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createSearchRoute } from "../routes/entropy";

vi.mock("@entropy/mastra-app/src/index.js", () => ({
  scoreHelpfulness: vi.fn(),
}));

vi.mock("@entropy/mastra-app/src/lib/mcp-client.js", () => ({
  getBiologyTools: vi.fn(),
  getClinicalTrialsTools: vi.fn(),
  getPatentsTools: vi.fn(),
}));

describe("POST /api/entropy/search", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/entropy", createSearchRoute());
  });

  it("should return scored results sorted by helpfulness", async () => {
    const { scoreHelpfulness } =
      await import("@entropy/mastra-app/src/index.js");
    const { getBiologyTools } =
      await import("@entropy/mastra-app/src/lib/mcp-client.js");

    // Mock MCP tools
    vi.mocked(getBiologyTools).mockResolvedValue({
      searchTargets: vi.fn().mockResolvedValue([
        {
          id: "ENSG00001",
          type: "protein",
          label: "AMPK",
          metadata: { pathway: "AMPK signaling" },
        },
      ]),
    } as any);

    // Mock helpfulness scoring
    vi.mocked(scoreHelpfulness).mockResolvedValue({
      score: 85,
      explanation: "Fills gap: AMPK pathway",
      gapsFilled: ["pathway:AMPK signaling"],
    });

    const response = await app.request("/api/entropy/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "AMPK targets",
        graphSnapshot: {
          nodeIds: [],
          edgeSummary: [],
        },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test-workspace",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.results).toHaveLength(1);
    expect(data.results[0].entityId).toBe("ENSG00001");
    expect(data.results[0].helpfulness.score).toBe(85);
    expect(data.results[0].helpfulness.explanation).toContain("gap");
    expect(data.searchedSources).toContain("Open Targets");
  });
});
```

- [ ] **Run test to verify it fails**

Run: `pnpm --filter @entropy/api vitest run src/__tests__/search.test.ts`

Expected: FAIL with "Cannot find module '../routes/entropy'" or createSearchRoute not exported

#### Step 2: Create search endpoint route

- [ ] **Create entropy routes file with search endpoint**

```typescript
// apps/api/src/routes/entropy.ts
import { Hono } from "hono";
import { z } from "zod";
import { scoreHelpfulness } from "@entropy/mastra-app/src/index.js";
import { getBiologyTools } from "@entropy/mastra-app/src/lib/mcp-client.js";
import { errorResponse } from "../middleware/error-handler.js";

const GraphSnapshotSchema = z.object({
  nodeIds: z.array(z.string()).default([]),
  edgeSummary: z.array(z.record(z.unknown())).default([]),
});

const SearchRequestSchema = z.object({
  query: z.string().trim().min(1),
  graphSnapshot: GraphSnapshotSchema,
  personaMode: z.enum(["Researcher", "Strategist"]),
  indiaLens: z.boolean(),
  workspaceId: z.string().trim().min(1),
  maxResults: z.number().optional(),
});

type SearchResult = {
  id: string;
  entityId: string;
  entityType: string;
  label: string;
  source: string;
  metadata: Record<string, any>;
  helpfulness: {
    score: number;
    explanation: string;
    gapsFilled: string[];
  };
  evidenceScore?: number;
  indiaRelevant?: boolean;
};

export function createSearchRoute() {
  const entropy = new Hono();

  entropy.post("/search", async (c) => {
    try {
      const body = await c.req.json();
      const validatedInput = SearchRequestSchema.parse(body);

      const {
        query,
        graphSnapshot,
        personaMode,
        indiaLens,
        workspaceId,
        maxResults,
      } = validatedInput;

      // Detect bootstrap mode
      const isBootstrap = graphSnapshot.nodeIds.length === 0;
      const resultLimit = maxResults || (isBootstrap ? 25 : 10);

      // Fetch from MCP tools
      const biologyTools = await getBiologyTools();
      const rawResults: any[] = [];
      const searchedSources: string[] = [];

      // Search Open Targets (biology tools)
      if (biologyTools && typeof biologyTools.searchTargets === "function") {
        try {
          const targets = await biologyTools.searchTargets({
            query,
            limit: resultLimit,
          });
          if (Array.isArray(targets)) {
            rawResults.push(
              ...targets.map((t: any) => ({ ...t, source: "Open Targets" })),
            );
            searchedSources.push("Open Targets");
          }
        } catch (error) {
          console.error("Open Targets search failed:", error);
        }
      }

      // Score results with helpfulness agent
      // Note: Phase 1 uses default nodeTypes since graphSnapshot doesn't include them yet
      // Phase 2 will update GraphSnapshot schema to include nodeTypes map
      const nodeTypes = graphSnapshot.nodeIds.reduce(
        (acc, nodeId, idx) => {
          acc[nodeId] = "protein"; // Default type for Phase 1
          return acc;
        },
        {} as Record<string, string>,
      );

      const scoredResults: SearchResult[] = await Promise.all(
        rawResults.map(async (raw) => {
          const helpfulness = await scoreHelpfulness({
            result: {
              entityId: raw.id,
              entityType: raw.type || "protein",
              label: raw.label || raw.id,
              source: raw.source,
              metadata: raw.metadata || {},
            },
            graphSnapshot: {
              nodeIds: graphSnapshot.nodeIds,
              nodeTypes,
              edgeSummary: graphSnapshot.edgeSummary as any,
            },
            queryContext: query,
          });

          return {
            id: `result_${Date.now()}_${Math.random()}`,
            entityId: raw.id,
            entityType: raw.type || "protein",
            label: raw.label || raw.id,
            source: raw.source,
            metadata: raw.metadata || {},
            helpfulness,
            evidenceScore: raw.evidenceScore,
            indiaRelevant: false, // Phase 1: Defer India Lens to Phase 2 frontend integration
          };
        }),
      );

      // Sort by helpfulness score descending
      scoredResults.sort((a, b) => b.helpfulness.score - a.helpfulness.score);

      return c.json({
        results: scoredResults.slice(0, resultLimit),
        executionTime: 0, // Phase 1: Static value, Phase 2 will add performance.now() timing
        searchedSources,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: "Invalid request", details: error.errors }, 400);
      }
      return errorResponse(c, error);
    }
  });

  return entropy;
}
```

- [ ] **Run test to verify it passes**

Run: `pnpm --filter @entropy/api vitest run src/__tests__/search.test.ts`

Expected: PASS (1 test)

- [ ] **Commit search endpoint**

```bash
git add apps/api/src/routes/entropy.ts apps/api/src/__tests__/search.test.ts
git commit -m "feat(api): add search endpoint with helpfulness scoring"
```

#### Step 3: Add validation tests

- [ ] **Write validation tests**

```typescript
// Add to apps/api/src/__tests__/search.test.ts
describe("validation", () => {
  it("should reject missing query", async () => {
    const response = await app.request("/api/entropy/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        graphSnapshot: { nodeIds: [], edgeSummary: [] },
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test",
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid request");
  });

  it("should reject invalid personaMode", async () => {
    const response = await app.request("/api/entropy/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "test",
        graphSnapshot: { nodeIds: [], edgeSummary: [] },
        personaMode: "InvalidMode",
        indiaLens: false,
        workspaceId: "test",
      }),
    });

    expect(response.status).toBe(400);
  });
});
```

- [ ] **Run tests to verify they pass**

Run: `pnpm --filter @entropy/api vitest run src/__tests__/search.test.ts`

Expected: PASS (3 tests)

- [ ] **Commit validation tests**

```bash
git add apps/api/src/__tests__/search.test.ts
git commit -m "test(api): add validation tests for search endpoint"
```

#### Step 4: Add bootstrap mode test

- [ ] **Write bootstrap mode test**

```typescript
// Add to apps/api/src/__tests__/search.test.ts
describe("bootstrap mode", () => {
  it("should return more results when graph is empty", async () => {
    const { scoreHelpfulness } =
      await import("@entropy/mastra-app/src/index.js");
    const { getBiologyTools } =
      await import("@entropy/mastra-app/src/lib/mcp-client.js");

    // Mock 30 results from MCP
    const mockResults = Array.from({ length: 30 }, (_, i) => ({
      id: `ENSG0000${i}`,
      type: "protein",
      label: `Protein ${i}`,
      metadata: {},
    }));

    vi.mocked(getBiologyTools).mockResolvedValue({
      searchTargets: vi.fn().mockResolvedValue(mockResults),
    } as any);

    vi.mocked(scoreHelpfulness).mockResolvedValue({
      score: 70,
      explanation: "Bootstrap mode",
      gapsFilled: [],
    });

    const response = await app.request("/api/entropy/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "proteins",
        graphSnapshot: { nodeIds: [], edgeSummary: [] }, // Empty graph
        personaMode: "Researcher",
        indiaLens: false,
        workspaceId: "test",
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    // Should return 25 results in bootstrap mode (not 10)
    expect(data.results.length).toBe(25);
  });
});
```

- [ ] **Run test to verify it passes**

Run: `pnpm --filter @entropy/api vitest run src/__tests__/search.test.ts`

Expected: PASS (4 tests)

- [ ] **Commit bootstrap test**

```bash
git add apps/api/src/__tests__/search.test.ts
git commit -m "test(api): add bootstrap mode test for search endpoint"
```

#### Step 5: Mount search route in main API

- [ ] **Add route mounting to API index**

```typescript
// Modify apps/api/src/index.ts
import { createSearchRoute } from "./routes/entropy.js";

// After existing route mounts (causaly, etc.)
app.route("/api/entropy", createSearchRoute());
```

- [ ] **Run full API test suite**

Run: `pnpm --filter @entropy/api test`

Expected: All tests pass

- [ ] **Commit route mounting**

```bash
git add apps/api/src/index.ts
git commit -m "feat(api): mount search route in main API"
```

---

### Task 3: Add-Nodes API Endpoint

**Files:**

- Modify: `apps/api/src/routes/entropy.ts`
- Create: `apps/api/src/__tests__/add-nodes.test.ts`

#### Step 1: Write failing test for add-nodes endpoint

- [ ] **Create test file**

```typescript
// apps/api/src/__tests__/add-nodes.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createSearchRoute } from "../routes/entropy";

describe("POST /api/workspace/add-nodes", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route("/api/workspace", createSearchRoute());
  });

  it("should convert selected results to GraphNode format", async () => {
    const response = await app.request("/api/workspace/add-nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: "test-workspace",
        queryId: "query_123",
        selectedResults: [
          {
            id: "result_1",
            entityId: "ENSG00001",
            entityType: "protein",
            label: "AMPK",
            source: "STRING",
            metadata: { pathway: "AMPK signaling" },
            evidenceScore: 0.95,
            indiaRelevant: false,
          },
        ],
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.addedNodes).toHaveLength(1);
    expect(data.addedNodes[0].id).toBe("ENSG00001");
    expect(data.addedNodes[0].label).toBe("AMPK");
    expect(data.addedNodes[0].type).toBe("protein");
    expect(data.addedNodes[0].addedByQuery).toBe("query_123");
    expect(data.addedEdges).toEqual([]);
    expect(data.duplicatesSkipped).toBe(0);
  });
});
```

- [ ] **Run test to verify it fails**

Run: `pnpm --filter @entropy/api vitest run src/__tests__/add-nodes.test.ts`

Expected: FAIL - route doesn't exist

#### Step 2: Implement add-nodes endpoint

- [ ] **Add add-nodes route to entropy.ts**

```typescript
// Add to apps/api/src/routes/entropy.ts (after search route)

const AddNodesRequestSchema = z.object({
  workspaceId: z.string().trim().min(1),
  queryId: z.string().trim().min(1),
  selectedResults: z.array(
    z.object({
      id: z.string(),
      entityId: z.string(),
      entityType: z.string(),
      label: z.string(),
      source: z.string(),
      metadata: z.record(z.unknown()),
      evidenceScore: z.number().optional(),
      indiaRelevant: z.boolean().optional(),
    }),
  ),
});

export function createWorkspaceRoute() {
  const workspace = new Hono();

  workspace.post("/add-nodes", async (c) => {
    try {
      const body = await c.req.json();
      const validatedInput = AddNodesRequestSchema.parse(body);

      const { workspaceId, queryId, selectedResults } = validatedInput;

      // Convert results to GraphNode format
      const addedNodes = selectedResults.map((result) => ({
        id: result.entityId,
        label: result.label,
        type: result.entityType,
        source: result.source,
        metadata: result.metadata,
        evidenceScore: result.evidenceScore,
        addedByQuery: queryId,
        indiaRelevant: result.indiaRelevant || false,
      }));

      // Phase 1: Workspace deduplication and edge inference deferred to Phase 2
      // Phase 2 will integrate with WorkspaceContext to check existing nodes
      // and infer edges from STRING interaction metadata, Open Targets associations, etc.

      return c.json({
        addedNodes,
        addedEdges: [],
        duplicatesSkipped: 0,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: "Invalid request", details: error.errors }, 400);
      }
      return errorResponse(c, error);
    }
  });

  return workspace;
}
```

- [ ] **Export and mount workspace route**

```typescript
// Update apps/api/src/routes/entropy.ts exports
export { createSearchRoute, createWorkspaceRoute };

// Update apps/api/src/index.ts
import { createSearchRoute, createWorkspaceRoute } from "./routes/entropy.js";

app.route("/api/entropy", createSearchRoute());
app.route("/api/workspace", createWorkspaceRoute());
```

- [ ] **Run test to verify it passes**

Run: `pnpm --filter @entropy/api vitest run src/__tests__/add-nodes.test.ts`

Expected: PASS (1 test)

- [ ] **Commit add-nodes endpoint**

```bash
git add apps/api/src/routes/entropy.ts apps/api/src/__tests__/add-nodes.test.ts apps/api/src/index.ts
git commit -m "feat(api): add workspace add-nodes endpoint"
```

#### Step 3: Add test for duplicate detection

- [ ] **Write duplicate detection test**

```typescript
// Add to apps/api/src/__tests__/add-nodes.test.ts
it("should deduplicate within selected results batch", async () => {
  // Phase 1: Tests batch-level deduplication (same entityId in selectedResults)
  // Phase 2: Will add workspace-level deduplication (checking existing graph nodes)

  const response = await app.request("/api/workspace/add-nodes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspaceId: "test-workspace",
      queryId: "query_123",
      selectedResults: [
        {
          id: "result_1",
          entityId: "ENSG00001",
          entityType: "protein",
          label: "AMPK",
          source: "STRING",
          metadata: {},
        },
        {
          id: "result_2",
          entityId: "ENSG00001", // Duplicate
          entityType: "protein",
          label: "AMPK",
          source: "Open Targets",
          metadata: {},
        },
      ],
    }),
  });

  expect(response.status).toBe(200);
  const data = await response.json();

  // Should dedupe within the selected results batch
  expect(data.addedNodes.length).toBeLessThan(2);
});
```

- [ ] **Implement batch deduplication**

```typescript
// Update add-nodes route in apps/api/src/routes/entropy.ts
workspace.post("/add-nodes", async (c) => {
  try {
    const body = await c.req.json();
    const validatedInput = AddNodesRequestSchema.parse(body);

    const { workspaceId, queryId, selectedResults } = validatedInput;

    // Deduplicate within batch by entityId
    const seen = new Set<string>();
    const uniqueResults = selectedResults.filter((result) => {
      if (seen.has(result.entityId)) {
        return false;
      }
      seen.add(result.entityId);
      return true;
    });

    const duplicatesSkipped = selectedResults.length - uniqueResults.length;

    const addedNodes = uniqueResults.map((result) => ({
      id: result.entityId,
      label: result.label,
      type: result.entityType,
      source: result.source,
      metadata: result.metadata,
      evidenceScore: result.evidenceScore,
      addedByQuery: queryId,
      indiaRelevant: result.indiaRelevant || false,
    }));

    return c.json({
      addedNodes,
      addedEdges: [],
      duplicatesSkipped,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Invalid request", details: error.errors }, 400);
    }
    return errorResponse(c, error);
  }
});
```

- [ ] **Run test to verify it passes**

Run: `pnpm --filter @entropy/api vitest run src/__tests__/add-nodes.test.ts`

Expected: PASS (2 tests)

- [ ] **Commit deduplication**

```bash
git add apps/api/src/routes/entropy.ts apps/api/src/__tests__/add-nodes.test.ts
git commit -m "feat(api): add batch deduplication to add-nodes endpoint"
```

---


---

## Phase 1 Complete

All backend foundation tasks completed:
- ✅ Helpfulness agent with gap-filling scoring
- ✅ Search API endpoint with MCP integration
- ✅ Add-nodes API endpoint with batch deduplication  
- ✅ Full test coverage per CLAUDE.md requirements

**Ready for Phase 2:** Frontend components (RightChatPanel workspace mode, metric cards, layout changes).

**Verification:**
```bash
# Run all Phase 1 tests
pnpm --filter @entropy/mastra-app test
pnpm --filter @entropy/api test
```

Expected: All tests pass.

**Next Steps:**
1. Review and merge Phase 1 implementation
2. Execute Phase 2 plan (frontend components)
3. Integration testing across both phases
4. Update PRD.md to reflect manual workflow
