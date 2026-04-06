import neo4j, { Driver, Session } from "neo4j-driver";

let driver: Driver | null = null;

/**
 * Get or create a Neo4j driver singleton instance.
 * Uses environment variables for connection details:
 * - NEO4J_URI: Connection URI (default: bolt://localhost:7687)
 * - NEO4J_USER: Username (default: neo4j)
 * - NEO4J_PASSWORD: Password (required)
 */
export function getNeo4jDriver(): Driver {
  if (driver) {
    return driver;
  }

  const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
  const user = process.env.NEO4J_USER || "neo4j";
  const password = process.env.NEO4J_PASSWORD;

  if (!password) {
    throw new Error("NEO4J_PASSWORD environment variable is required");
  }

  driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
  });

  return driver;
}

/**
 * Get a new Neo4j session.
 * Caller is responsible for closing the session.
 */
export function getNeo4jSession(): Session {
  return getNeo4jDriver().session();
}

/**
 * Close the Neo4j driver connection.
 * Should be called during application shutdown.
 */
export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
