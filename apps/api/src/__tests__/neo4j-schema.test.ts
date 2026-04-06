import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getNeo4jDriver, closeNeo4jDriver } from "../lib/neo4j-client";
import { initializeNeo4jSchema } from "../lib/neo4j-schema";

describe("Neo4j Schema", () => {
  beforeAll(async () => {
    await initializeNeo4jSchema();
  });

  afterAll(async () => {
    await closeNeo4jDriver();
  });

  it("should create constraints for unique IDs", async () => {
    const driver = getNeo4jDriver();
    const session = driver.session();

    const result = await session.run("SHOW CONSTRAINTS");
    const constraints = result.records.map((r) => ({
      name: r.get("name"),
      type: r.get("type"),
    }));

    expect(constraints.some((c) => c.name === "workspace_id_unique")).toBe(
      true,
    );
    expect(constraints.some((c) => c.name === "graph_node_id_unique")).toBe(
      true,
    );
    expect(constraints.some((c) => c.name === "query_id_unique")).toBe(true);

    await session.close();
  });

  it("should create indexes for common queries", async () => {
    const driver = getNeo4jDriver();
    const session = driver.session();

    const result = await session.run("SHOW INDEXES");
    const indexes = result.records.map((r) => r.get("name"));

    expect(indexes).toContain("graph_node_type_index");
    expect(indexes).toContain("graph_node_source_index");
    expect(indexes).toContain("graph_node_updated_at_index");

    await session.close();
  });
});
