import { getNeo4jDriver } from "./neo4j-client.js";

/**
 * Initialize Neo4j schema: constraints and indexes.
 * Creates:
 * - Unique constraints on :Workspace(id), :GraphNode(id), :Query(id)
 * - Indexes on GraphNode.type, GraphNode.source, GraphNode.updatedAt
 */
export async function initializeNeo4jSchema(): Promise<void> {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // Create constraints (also creates backing indexes automatically)
    await session.run(`
      CREATE CONSTRAINT workspace_id_unique IF NOT EXISTS
      FOR (w:Workspace) REQUIRE w.id IS UNIQUE
    `);

    await session.run(`
      CREATE CONSTRAINT graph_node_id_unique IF NOT EXISTS
      FOR (n:GraphNode) REQUIRE n.id IS UNIQUE
    `);

    await session.run(`
      CREATE CONSTRAINT query_id_unique IF NOT EXISTS
      FOR (q:Query) REQUIRE q.id IS UNIQUE
    `);

    // Create indexes for common queries
    await session.run(`
      CREATE INDEX graph_node_type_index IF NOT EXISTS
      FOR (n:GraphNode) ON (n.type)
    `);

    await session.run(`
      CREATE INDEX graph_node_source_index IF NOT EXISTS
      FOR (n:GraphNode) ON (n.source)
    `);

    await session.run(`
      CREATE INDEX graph_node_updated_at_index IF NOT EXISTS
      FOR (n:GraphNode) ON (n.updatedAt)
    `);

    console.log("[neo4j-schema] Schema initialized successfully");
  } catch (error) {
    console.error("[neo4j-schema] Failed to initialize schema:", error);
    throw error;
  } finally {
    await session.close();
  }
}
