import { getNeo4jSession } from "./neo4j-client.js";
import type {
  GraphNode,
  GraphEdge,
  Workspace,
  Query,
} from "../schemas/graph-schema.js";
import { randomUUID } from "crypto";

export class GraphRepository {
  // Workspace operations
  async createWorkspace(
    data: Omit<Workspace, "id" | "createdAt" | "updatedAt">,
  ): Promise<Workspace> {
    const session = getNeo4jSession();
    const now = new Date();
    const id = randomUUID();

    try {
      const result = await session.run(
        `
        CREATE (w:Workspace {
          id: $id,
          name: $name,
          description: $description,
          mode: $mode,
          indiaLens: $indiaLens,
          createdAt: datetime($createdAt),
          updatedAt: datetime($updatedAt)
        })
        RETURN w
        `,
        {
          id,
          name: data.name,
          description: data.description || null,
          mode: data.mode || null,
          indiaLens: data.indiaLens || false,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      );

      const workspace = result.records[0].get("w").properties;
      return {
        ...workspace,
        createdAt: new Date(workspace.createdAt),
        updatedAt: new Date(workspace.updatedAt),
      };
    } finally {
      await session.close();
    }
  }

  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    const session = getNeo4jSession();

    try {
      const result = await session.run(
        "MATCH (w:Workspace {id: $id}) RETURN w",
        { id: workspaceId },
      );

      if (result.records.length === 0) return null;

      const workspace = result.records[0].get("w").properties;
      return {
        ...workspace,
        createdAt: new Date(workspace.createdAt),
        updatedAt: new Date(workspace.updatedAt),
      };
    } finally {
      await session.close();
    }
  }

  // Node operations
  async addNodesToWorkspace(
    workspaceId: string,
    nodes: Omit<GraphNode, "id">[],
    queryId?: string,
  ): Promise<GraphNode[]> {
    const session = getNeo4jSession();

    try {
      const nodesWithIds = nodes.map((node) => ({
        ...node,
        id: (node.metadata.id as string) || randomUUID(),
      }));

      const result = await session.run(
        `
        UNWIND $nodes AS nodeData
        MERGE (n:GraphNode {id: nodeData.id})
        ON CREATE SET
          n.label = nodeData.label,
          n.type = nodeData.type,
          n.source = nodeData.source,
          n.metadata = nodeData.metadata,
          n.evidenceScore = nodeData.evidenceScore,
          n.indiaRelevant = nodeData.indiaRelevant,
          n.createdAt = datetime()
        ON MATCH SET
          n.updatedAt = datetime()
        WITH n
        MATCH (w:Workspace {id: $workspaceId})
        MERGE (w)-[:CONTAINS]->(n)
        RETURN n
        `,
        {
          workspaceId,
          nodes: nodesWithIds.map((node) => ({
            ...node,
            metadata: JSON.stringify(node.metadata),
          })),
        },
      );

      // If queryId provided, link nodes to query
      if (queryId) {
        await session.run(
          `
          MATCH (q:Query {id: $queryId})
          MATCH (n:GraphNode) WHERE n.id IN $nodeIds
          MERGE (q)-[:CONTRIBUTED]->(n)
          `,
          {
            queryId,
            nodeIds: nodesWithIds.map((n) => n.id),
          },
        );
      }

      return nodesWithIds;
    } finally {
      await session.close();
    }
  }

  // Edge operations
  async addEdges(
    workspaceId: string,
    edges: Omit<GraphEdge, "id">[],
  ): Promise<GraphEdge[]> {
    const session = getNeo4jSession();

    try {
      const edgesWithIds = edges.map((edge) => ({
        ...edge,
        id: randomUUID(),
      }));

      await session.run(
        `
        UNWIND $edges AS edgeData
        MATCH (source:GraphNode {id: edgeData.source})
        MATCH (target:GraphNode {id: edgeData.target})
        MATCH (w:Workspace {id: $workspaceId})-[:CONTAINS]->(source)
        MATCH (w)-[:CONTAINS]->(target)
        MERGE (source)-[r:RELATES_TO {
          id: edgeData.id,
          type: edgeData.type
        }]->(target)
        ON CREATE SET
          r.confidence = edgeData.confidence,
          r.metadata = edgeData.metadata,
          r.inferredBy = edgeData.inferredBy,
          r.reasoning = edgeData.reasoning,
          r.createdAt = datetime()
        RETURN r
        `,
        {
          workspaceId,
          edges: edgesWithIds.map((edge) => ({
            ...edge,
            metadata: JSON.stringify(edge.metadata),
          })),
        },
      );

      return edgesWithIds;
    } finally {
      await session.close();
    }
  }

  // Get full graph
  async getWorkspaceGraph(
    workspaceId: string,
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const session = getNeo4jSession();

    try {
      // Get nodes
      const nodesResult = await session.run(
        `
        MATCH (w:Workspace {id: $workspaceId})-[:CONTAINS]->(n:GraphNode)
        RETURN n
        `,
        { workspaceId },
      );

      const nodes = nodesResult.records.map((record) => {
        const node = record.get("n").properties;
        return {
          ...node,
          metadata: JSON.parse(node.metadata || "{}"),
        };
      });

      // Get edges
      const edgesResult = await session.run(
        `
        MATCH (w:Workspace {id: $workspaceId})-[:CONTAINS]->(source:GraphNode)
        MATCH (source)-[r:RELATES_TO]->(target:GraphNode)
        MATCH (w)-[:CONTAINS]->(target)
        RETURN r, source.id as source, target.id as target
        `,
        { workspaceId },
      );

      const edges = edgesResult.records.map((record) => {
        const edge = record.get("r").properties;
        return {
          ...edge,
          source: record.get("source"),
          target: record.get("target"),
          metadata: JSON.parse(edge.metadata || "{}"),
        };
      });

      return { nodes, edges };
    } finally {
      await session.close();
    }
  }

  // Delete node (and its edges)
  async deleteNode(
    workspaceId: string,
    nodeId: string,
  ): Promise<{ success: boolean }> {
    const session = getNeo4jSession();

    try {
      // Check if workspace and node exist and are connected
      const checkResult = await session.run(
        `
        MATCH (w:Workspace {id: $workspaceId})-[:CONTAINS]->(n:GraphNode {id: $nodeId})
        RETURN n
        `,
        { workspaceId, nodeId },
      );

      if (checkResult.records.length === 0) {
        return { success: false };
      }

      // Delete node and all its edges (DETACH DELETE removes relationships)
      await session.run(
        `
        MATCH (w:Workspace {id: $workspaceId})-[:CONTAINS]->(n:GraphNode {id: $nodeId})
        DETACH DELETE n
        `,
        { workspaceId, nodeId },
      );

      return { success: true };
    } finally {
      await session.close();
    }
  }

  // Update node (partial update)
  async updateNode(
    workspaceId: string,
    nodeId: string,
    updates: Partial<
      Pick<
        GraphNode,
        "label" | "type" | "source" | "metadata" | "evidenceScore" | "indiaRelevant"
      >
    >,
  ): Promise<GraphNode | null> {
    const session = getNeo4jSession();

    try {
      // Check if node exists in workspace
      const checkResult = await session.run(
        `
        MATCH (w:Workspace {id: $workspaceId})-[:CONTAINS]->(n:GraphNode {id: $nodeId})
        RETURN n
        `,
        { workspaceId, nodeId },
      );

      if (checkResult.records.length === 0) {
        return null;
      }

      // Build SET clause dynamically for provided fields
      const setFields: string[] = [];
      const params: Record<string, any> = { workspaceId, nodeId };

      if (updates.label !== undefined) {
        setFields.push("n.label = $label");
        params.label = updates.label;
      }
      if (updates.type !== undefined) {
        setFields.push("n.type = $type");
        params.type = updates.type;
      }
      if (updates.source !== undefined) {
        setFields.push("n.source = $source");
        params.source = updates.source;
      }
      if (updates.metadata !== undefined) {
        setFields.push("n.metadata = $metadata");
        params.metadata = JSON.stringify(updates.metadata);
      }
      if (updates.evidenceScore !== undefined) {
        setFields.push("n.evidenceScore = $evidenceScore");
        params.evidenceScore = updates.evidenceScore;
      }
      if (updates.indiaRelevant !== undefined) {
        setFields.push("n.indiaRelevant = $indiaRelevant");
        params.indiaRelevant = updates.indiaRelevant;
      }

      // Always update updatedAt
      setFields.push("n.updatedAt = datetime()");

      if (setFields.length === 1) {
        // Only updatedAt - no actual updates
        return null;
      }

      const result = await session.run(
        `
        MATCH (w:Workspace {id: $workspaceId})-[:CONTAINS]->(n:GraphNode {id: $nodeId})
        SET ${setFields.join(", ")}
        RETURN n
        `,
        params,
      );

      const node = result.records[0].get("n").properties;
      return {
        ...node,
        metadata: JSON.parse(node.metadata || "{}"),
      };
    } finally {
      await session.close();
    }
  }

  // Query operations
  async createQuery(data: Omit<Query, "id" | "submittedAt">): Promise<Query> {
    const session = getNeo4jSession();
    const id = randomUUID();
    const now = new Date();

    try {
      const result = await session.run(
        `
        MATCH (w:Workspace {id: $workspaceId})
        CREATE (q:Query {
          id: $id,
          workspaceId: $workspaceId,
          text: $text,
          mode: $mode,
          indiaLens: $indiaLens,
          status: $status,
          completenessScore: $completenessScore,
          iterations: $iterations,
          submittedAt: datetime($submittedAt)
        })
        MERGE (w)-[:HAS_QUERY]->(q)
        RETURN q
        `,
        {
          workspaceId: data.workspaceId,
          id,
          text: data.text,
          mode: data.mode,
          indiaLens: data.indiaLens,
          status: data.status,
          completenessScore: data.completenessScore ?? null,
          iterations: data.iterations ?? null,
          submittedAt: now.toISOString(),
        },
      );

      const query = result.records[0].get("q").properties;
      return {
        ...query,
        submittedAt: new Date(query.submittedAt),
      };
    } finally {
      await session.close();
    }
  }

  async getQueriesByWorkspace(workspaceId: string): Promise<Query[]> {
    const session = getNeo4jSession();

    try {
      const result = await session.run(
        `
        MATCH (w:Workspace {id: $workspaceId})-[:HAS_QUERY]->(q:Query)
        RETURN q
        ORDER BY q.submittedAt DESC
        `,
        { workspaceId },
      );

      return result.records.map((record) => {
        const query = record.get("q").properties;
        return {
          ...query,
          submittedAt: new Date(query.submittedAt),
        };
      });
    } finally {
      await session.close();
    }
  }
}

// Singleton
let repository: GraphRepository | null = null;

export function getGraphRepository(): GraphRepository {
  if (!repository) {
    repository = new GraphRepository();
  }
  return repository;
}
