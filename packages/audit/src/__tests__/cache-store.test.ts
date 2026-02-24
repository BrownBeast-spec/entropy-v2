import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import pg from "pg";
import { CacheStore, DEFAULT_TTL } from "../cache-store.js";
import { MIGRATION_SQL } from "../schema.js";

const { Pool } = pg;

describe("CacheStore", () => {
  let container: StartedTestContainer;
  let pool: pg.Pool;
  let cache: CacheStore;

  beforeAll(async () => {
    container = await new GenericContainer("postgres:16-alpine")
      .withExposedPorts(5432)
      .withEnvironment({
        POSTGRES_USER: "test",
        POSTGRES_PASSWORD: "test",
        POSTGRES_DB: "cache_test",
      })
      .start();

    const connectionString = `postgresql://test:test@${container.getHost()}:${container.getMappedPort(5432)}/cache_test`;
    pool = new Pool({ connectionString });
    cache = new CacheStore(pool);

    // Run migration to create tables
    await pool.query(MIGRATION_SQL);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it("generates deterministic cache keys", () => {
    const key1 = CacheStore.generateKey("search_targets", { query: "BRCA1" });
    const key2 = CacheStore.generateKey("search_targets", { query: "BRCA1" });
    expect(key1).toBe(key2);
  });

  it("generates different keys for different parameters", () => {
    const key1 = CacheStore.generateKey("search_targets", { query: "BRCA1" });
    const key2 = CacheStore.generateKey("search_targets", { query: "TP53" });
    expect(key1).not.toBe(key2);
  });

  it("stores and retrieves cached data", async () => {
    const params = { query: "metformin" };
    const response = { results: [{ drug: "metformin" }] };

    await cache.set("search_targets", params, response, 3600);
    const cached = await cache.get("search_targets", params);

    expect(cached).toEqual(response);
  });

  it("returns null for uncached data", async () => {
    const cached = await cache.get("nonexistent_tool", { q: "test" });
    expect(cached).toBeNull();
  });

  it("invalidates specific cache entry", async () => {
    const params = { query: "aspirin" };
    await cache.set("get_drug_info", params, { name: "aspirin" }, 3600);

    await cache.invalidate("get_drug_info", params);
    const cached = await cache.get("get_drug_info", params);
    expect(cached).toBeNull();
  });

  it("invalidates all entries for a tool", async () => {
    await cache.set("search_literature", { q: "a" }, { r: 1 }, 3600);
    await cache.set("search_literature", { q: "b" }, { r: 2 }, 3600);

    const count = await cache.invalidateByTool("search_literature");
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("flushes all entries", async () => {
    await cache.set("tool_a", { x: 1 }, { y: 1 }, 3600);
    await cache.set("tool_b", { x: 2 }, { y: 2 }, 3600);

    const count = await cache.flush();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it("tracks metrics", async () => {
    cache.resetMetrics();

    await cache.set("metric_tool", { m: 1 }, { data: "test" }, 3600);
    await cache.get("metric_tool", { m: 1 }); // hit
    await cache.get("metric_tool", { m: 999 }); // miss

    const metrics = cache.getMetrics();
    expect(metrics.hits).toBe(1);
    expect(metrics.misses).toBe(1);
  });

  it("has default TTLs for known tools", () => {
    expect(DEFAULT_TTL["search_targets"]).toBe(86400);
    expect(DEFAULT_TTL["search_adverse_events"]).toBe(3600);
    expect(DEFAULT_TTL["search_preprints"]).toBe(21600);
  });
});
