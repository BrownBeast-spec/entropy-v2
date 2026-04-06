import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getNeo4jDriver, closeNeo4jDriver } from "../lib/neo4j-client";

describe("Neo4j Client", () => {
  afterAll(async () => {
    await closeNeo4jDriver();
  });

  it("should return a singleton driver instance", () => {
    const driver1 = getNeo4jDriver();
    const driver2 = getNeo4jDriver();
    expect(driver1).toBe(driver2);
  });

  it("should successfully connect to Neo4j", async () => {
    const driver = getNeo4jDriver();
    const session = driver.session();
    const result = await session.run("RETURN 1 AS num");
    expect(result.records[0].get("num").toNumber()).toBe(1);
    await session.close();
  });
});
