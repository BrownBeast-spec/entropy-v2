import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { config } from "dotenv";
import { app } from "../index.js";
import { getGraphRepository } from "../lib/graph-repository.js";
import { getNeo4jDriver } from "../lib/neo4j-client.js";

// Load .env file from repository root
config({ path: "../../.env" });

describe("POST /workflow/synthesize", () => {
  let workspaceId: string;

  beforeAll(async () => {
    // Create test workspace
    const repo = getGraphRepository();
    const workspace = await repo.createWorkspace({
      name: "Workflow Test Workspace",
      mode: "Researcher",
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      await session.run("MATCH (n) DETACH DELETE n");
    } finally {
      await session.close();
      await driver.close();
    }
  });

  it("should reject requests with invalid JSON body", async () => {
    const response = await app.request("http://localhost/api/workflow/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid json",
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("BAD_REQUEST");
  });

  it("should reject requests with missing required fields", async () => {
    const response = await app.request("http://localhost/api/workflow/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        // Missing queryText, mode, searchResults
      }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details.issues).toBeDefined();
  });

  it("should reject requests with invalid mode", async () => {
    const response = await app.request("http://localhost/api/workflow/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        queryText: "Test query",
        mode: "InvalidMode",
        searchResults: [],
      }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject requests with empty searchResults when performSearch is false", async () => {
    const response = await app.request("http://localhost/api/workflow/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        queryText: "Test query",
        mode: "Researcher",
        performSearch: false,
        searchResults: [],
      }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    // The error message comes from the Zod refine function
    expect(body.error.details.issues[0].message).toContain("searchResults");
  });

  it("should execute workflow successfully with provided search results", async () => {
    const searchResults = [
      {
        id: "test-paper-1",
        title: "Metformin mechanism in diabetes",
        snippet: "Metformin activates AMPK pathway",
        type: "paper",
        source: "PubMed",
      },
      {
        id: "test-paper-2",
        title: "AMPK pathway regulation",
        snippet: "AMPK regulates glucose metabolism",
        type: "paper",
        source: "PubMed",
      },
    ];

    const response = await app.request("http://localhost/api/workflow/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        queryText: "What is the mechanism of metformin?",
        mode: "Researcher",
        indiaLens: false,
        searchTypes: [],
        reportSections: [],
        performSearch: false,
        searchResults,
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      queryId: expect.any(String),
      addedNodesCount: expect.any(Number),
      addedEdgesCount: expect.any(Number),
      synthesis: {
        sections: expect.any(Array),
      },
    });

    // Verify synthesis structure
    expect(body.synthesis.sections.length).toBeGreaterThan(0);
    body.synthesis.sections.forEach((section: any) => {
      expect(section).toHaveProperty("title");
      expect(section).toHaveProperty("content");
      expect(section).toHaveProperty("citations");
      expect(typeof section.title).toBe("string");
      expect(typeof section.content).toBe("string");
      expect(Array.isArray(section.citations)).toBe(true);
    });
  }, 180000); // 3 minutes timeout for LLM calls

  it("should accept search results with UniProt and PubChem sources", async () => {
    const searchResults = [
      {
        id: "uniprot-p31749",
        title: "AKT1 - RAC-alpha serine/threonine-protein kinase",
        snippet: "Protein kinase involved in glucose metabolism",
        type: "protein",
        source: "UniProt",
      },
      {
        id: "pubchem-4091",
        title: "Metformin",
        snippet: "Antidiabetic drug compound",
        type: "compound",
        source: "PubChem",
      },
      {
        id: "test-paper-1",
        title: "Metformin and AKT1 interaction",
        snippet: "Study of metformin effects on AKT1 pathway",
        type: "paper",
        source: "PubMed",
      },
    ];

    const response = await app.request("http://localhost/api/workflow/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        queryText: "How does metformin affect AKT1?",
        mode: "Researcher",
        indiaLens: false,
        searchTypes: ["protein", "compound", "paper"],
        reportSections: [],
        performSearch: false,
        searchResults,
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      queryId: expect.any(String),
      addedNodesCount: expect.any(Number),
      addedEdgesCount: expect.any(Number),
      synthesis: {
        sections: expect.any(Array),
      },
    });
    
    // Verify nodes were created for UniProt and PubChem sources
    // Note: helpfulness scoring may filter out some low-score nodes
    expect(body.addedNodesCount).toBeGreaterThanOrEqual(2);
  }, 180000);

  it("should preserve label and entityType when search results use entropy shape", async () => {
    const repo = getGraphRepository();
    const shapeWorkspace = await repo.createWorkspace({
      name: "Workflow Shape Mapping Test Workspace",
      mode: "Researcher",
    });

    const searchResults = [
      {
        id: "result_1",
        entityId: "NCT01864096",
        entityType: "trial",
        label: "Metformin Trial MAST",
        source: "ClinicalTrials.gov",
        metadata: {
          nct_id: "NCT01864096",
          title: "Metformin Trial MAST",
        },
      },
      {
        id: "result_2",
        entityId: "O15244",
        entityType: "protein",
        label: "Metformin transporter SLC22A2 protein",
        source: "UniProt",
        metadata: {
          accession: "O15244",
          protein_name: "Metformin transporter SLC22A2 protein",
          organism: "Homo sapiens",
        },
      },
    ];

    const response = await app.request("http://localhost/api/workflow/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: shapeWorkspace.id,
        queryText: "metformin trial protein",
        mode: "Researcher",
        indiaLens: false,
        searchTypes: ["trial", "protein"],
        reportSections: ["Overview"],
        performSearch: false,
        searchResults,
      }),
    });

    expect(response.status).toBe(200);

    const { nodes } = await repo.getWorkspaceGraph(shapeWorkspace.id);
    expect(nodes.length).toBeGreaterThanOrEqual(2);

    expect(
      nodes.some((n) => n.label === "Metformin Trial MAST" && n.type === "trial"),
    ).toBe(true);
    expect(
      nodes.some(
        (n) =>
          n.label === "Metformin transporter SLC22A2 protein" &&
          n.type === "protein",
      ),
    ).toBe(true);
    expect(nodes.every((n) => n.label !== "Unnamed")).toBe(true);
  }, 180000);

  it("should handle workflow execution errors gracefully", async () => {
    // Use invalid workspaceId to trigger error
    const response = await app.request("http://localhost/api/workflow/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: "non-existent-workspace",
        queryText: "Test query",
        mode: "Researcher",
        performSearch: false,
        searchResults: [
          {
            id: "test",
            title: "Test",
            type: "paper",
            source: "Test",
          },
        ],
      }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("WORKFLOW_ERROR");
    expect(body.error.message).toBeDefined();
  }, 180000);
});
