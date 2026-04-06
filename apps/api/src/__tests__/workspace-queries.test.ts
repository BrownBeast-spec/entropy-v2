import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { config } from "dotenv";
import { app } from "../index.js";
import { getGraphRepository } from "../lib/graph-repository.js";
import { getNeo4jDriver } from "../lib/neo4j-client.js";

config({ path: "../../.env" });

describe("Workspace query routes", () => {
  let workspaceId: string;

  beforeAll(async () => {
    const repo = getGraphRepository();
    const workspace = await repo.createWorkspace({
      name: "Workspace Query Route Test",
      description: "validates query creation/list",
      mode: "Researcher",
      indiaLens: false,
    });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      await session.run(
        "MATCH (w:Workspace {id: $workspaceId}) DETACH DELETE w",
        {
          workspaceId,
        },
      );
    } finally {
      await session.close();
    }
  });

  it("creates query under workspace via POST /api/workspace/:id/queries", async () => {
    const response = await app.request(
      `http://localhost/api/workspace/${workspaceId}/queries`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Assess metformin target landscape",
          mode: "Researcher",
          indiaLens: true,
          status: "pending",
        }),
      },
    );

    expect(response.status).toBe(201);
    const data = await response.json();

    expect(data.id).toBeDefined();
    expect(data.workspaceId).toBe(workspaceId);
    expect(data.text).toBe("Assess metformin target landscape");
    expect(data.mode).toBe("Researcher");
    expect(data.indiaLens).toBe(true);
    expect(data.status).toBe("pending");
  });

  it("lists workspace queries via GET /api/workspace/:id/queries", async () => {
    const createSecond = await app.request(
      `http://localhost/api/workspace/${workspaceId}/queries`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Map trial endpoints for India cohort",
          mode: "Strategist",
          indiaLens: true,
          status: "running",
        }),
      },
    );
    expect(createSecond.status).toBe(201);

    const response = await app.request(
      `http://localhost/api/workspace/${workspaceId}/queries`,
      {
        method: "GET",
      },
    );

    expect(response.status).toBe(200);
    const data = await response.json();

    expect(Array.isArray(data.queries)).toBe(true);
    expect(data.queries.length).toBeGreaterThanOrEqual(2);
    expect(
      data.queries.some((query: { text: string }) =>
        query.text.includes("metformin"),
      ),
    ).toBe(true);
    expect(
      data.queries.some((query: { text: string; mode: string }) =>
        query.text.includes("trial endpoints"),
      ),
    ).toBe(true);
  });

  it("returns 400 for invalid query payload", async () => {
    const response = await app.request(
      `http://localhost/api/workspace/${workspaceId}/queries`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "",
          mode: "Researcher",
          indiaLens: false,
          status: "pending",
        }),
      },
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});
