FINAL IMPLEMENTATION PLAN: Graph-Grounded Synthesis System
Executive Summary
Goal: Build a demoable backend-powered knowledge graph system with:
- Neo4j graph database (local Docker)
- Real-time edge inference on every add-nodes operation
- Deep LLM-powered synthesis with streaming output
- Nvidia NIM gpt-oss-120b integration with rate limiting
- Full pipeline Mastra workflow orchestration
Architecture:
User Query → Search → Helpfulness Scoring → Add Nodes to Neo4j
                                                    ↓
                                            Edge Inference (LLM)
                                                    ↓
                                            Synthesis (Streaming LLM)
                                                    ↓
                                            Report with Citations
---
Phase 1: Infrastructure Setup
1.1 Neo4j Docker Container
File: docker-compose.neo4j.yml (NEW)
version: '3.8'
services:
  neo4j:
    image: neo4j:5.15-community
    container_name: entropy-neo4j
    ports:
      - "7474:7474"  # HTTP
      - "7687:7687"  # Bolt
    environment:
      - NEO4J_AUTH=neo4j/entropy-dev-password
      - NEO4J_PLUGINS=["apoc"]
      - NEO4J_dbms_memory_heap_max__size=2G
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
    healthcheck:
      test: ["CMD", "cypher-shell", "-u", "neo4j", "-p", "entropy-dev-password", "RETURN 1"]
      interval: 10s
      timeout: 5s
      retries: 5
volumes:
  neo4j_data:
  neo4j_logs:
Commands to document:
# Start Neo4j
docker-compose -f docker-compose.neo4j.yml up -d
# Access Neo4j Browser
open http://localhost:7474
# Stop Neo4j
docker-compose -f docker-compose.neo4j.yml down
# Reset database (fresh start)
docker-compose -f docker-compose.neo4j.yml down -v
Environment variables to add:
File: .env.example (UPDATE)
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=entropy-dev-password
# Nvidia NIM Configuration
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
# Nvidia NIM Rate Limits (placeholder - tune later)
NVIDIA_RATE_LIMIT_RPM=60
NVIDIA_RATE_LIMIT_TPM=100000
NVIDIA_RATE_LIMIT_CONCURRENT=5
# Agent LLM Configuration
SYNTHESIS_AGENT_TEMPERATURE=0.8
SYNTHESIS_AGENT_MAX_TOKENS=3000
EDGE_AGENT_TEMPERATURE=0.4
EDGE_AGENT_MAX_TOKENS=500
File: apps/mastra-app/.env.example (UPDATE - same vars)
---
1.2 Neo4j Client & Repository
File: apps/api/package.json (UPDATE)
{
  "dependencies": {
    "neo4j-driver": "^5.15.0"
  }
}
File: apps/api/src/lib/neo4j-client.ts (NEW)
import neo4j, { Driver, Session } from 'neo4j-driver';
let driver: Driver | null = null;
export function getNeo4jDriver(): Driver {
  if (driver) return driver;
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD;
  if (!password) {
    throw new Error('NEO4J_PASSWORD not configured');
  }
  driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 60000,
  });
  return driver;
}
export async function getNeo4jSession(): Promise<Session> {
  const driver = getNeo4jDriver();
  return driver.session({ database: 'neo4j' });
}
export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
// Health check
export async function checkNeo4jConnection(): Promise<boolean> {
  try {
    const session = await getNeo4jSession();
    const result = await session.run('RETURN 1 as status');
    await session.close();
    return result.records.length > 0;
  } catch {
    return false;
  }
}
Test: apps/api/src/__tests__/neo4j-client.test.ts (NEW)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getNeo4jDriver, getNeo4jSession, closeNeo4jDriver, checkNeo4jConnection } from '../lib/neo4j-client';
describe('Neo4j Client', () => {
  beforeAll(async () => {
    // Ensure test Neo4j is running
  });
  afterAll(async () => {
    await closeNeo4jDriver();
  });
  it('should connect to Neo4j', async () => {
    const connected = await checkNeo4jConnection();
    expect(connected).toBe(true);
  });
  it('should create session', async () => {
    const session = await getNeo4jSession();
    expect(session).toBeDefined();
    await session.close();
  });
  it('should reuse driver singleton', () => {
    const driver1 = getNeo4jDriver();
    const driver2 = getNeo4jDriver();
    expect(driver1).toBe(driver2);
  });
});
---
1.3 Graph Schema & Constraints
File: apps/api/src/lib/neo4j-schema.ts (NEW)
import { getNeo4jSession } from './neo4j-client.js';
export async function initializeNeo4jSchema(): Promise<void> {
  const session = await getNeo4jSession();
  try {
    // Create constraints (also creates indexes)
    await session.run(`
      CREATE CONSTRAINT workspace_id IF NOT EXISTS
      FOR (w:Workspace) REQUIRE w.id IS UNIQUE
    `);
    await session.run(`
      CREATE CONSTRAINT node_id IF NOT EXISTS
      FOR (n:GraphNode) REQUIRE n.id IS UNIQUE
    `);
    await session.run(`
      CREATE CONSTRAINT query_id IF NOT EXISTS
      FOR (q:Query) REQUIRE q.id IS UNIQUE
    `);
    // Create indexes for common queries
    await session.run(`
      CREATE INDEX node_type_index IF NOT EXISTS
      FOR (n:GraphNode) ON (n.type)
    `);
    await session.run(`
      CREATE INDEX node_source_index IF NOT EXISTS
      FOR (n:GraphNode) ON (n.source)
    `);
    await session.run(`
      CREATE INDEX workspace_updated_index IF NOT EXISTS
      FOR (w:Workspace) ON (w.updatedAt)
    `);
    console.log('[neo4j-schema] Schema initialized successfully');
  } catch (error) {
    console.error('[neo4j-schema] Failed to initialize schema:', error);
    throw error;
  } finally {
    await session.close();
  }
}
Run schema initialization on app startup:
File: apps/api/src/index.ts (UPDATE - add at startup)
import { initializeNeo4jSchema } from './lib/neo4j-schema.js';
// After server creation, before listen:
await initializeNeo4jSchema();
---
1.4 Nvidia NIM Provider
File: apps/mastra-app/src/lib/nvidia-nim-provider.ts (NEW)
import { createOpenAI } from '@ai-sdk/openai';
export interface NvidiaNimConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
export function getNvidiaNimProvider() {
  const apiKey = process.env.NVIDIA_API_KEY;
  const baseURL = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY not configured in environment');
  }
  return createOpenAI({
    apiKey,
    baseURL,
    compatibility: 'strict', // OpenAI-compatible mode
  });
}
export function nvidiaNimModel(config?: Partial<NvidiaNimConfig>) {
  const provider = getNvidiaNimProvider();
  const model = config?.model || 'openai/gpt-oss-120b';
  
  return provider(model, {
    structuredOutputs: true, // Enable JSON mode
  });
}
// Agent-specific model configurations
export function getSynthesisModel() {
  const temperature = parseFloat(process.env.SYNTHESIS_AGENT_TEMPERATURE || '0.8');
  const maxTokens = parseInt(process.env.SYNTHESIS_AGENT_MAX_TOKENS || '3000');
  return nvidiaNimModel({
    model: 'openai/gpt-oss-120b',
    temperature,
    maxTokens,
  });
}
export function getEdgeConstructorModel() {
  const temperature = parseFloat(process.env.EDGE_AGENT_TEMPERATURE || '0.4');
  const maxTokens = parseInt(process.env.EDGE_AGENT_MAX_TOKENS || '500');
  return nvidiaNimModel({
    model: 'openai/gpt-oss-120b',
    temperature,
    maxTokens,
  });
}
Test: apps/mastra-app/src/__tests__/nvidia-nim-provider.test.ts (NEW)
import { describe, it, expect, beforeAll } from 'vitest';
import { getNvidiaNimProvider, nvidiaNimModel, getSynthesisModel } from '../lib/nvidia-nim-provider';
describe('Nvidia NIM Provider', () => {
  beforeAll(() => {
    // Ensure NVIDIA_API_KEY is set in test env
    if (!process.env.NVIDIA_API_KEY) {
      process.env.NVIDIA_API_KEY = 'test-key';
    }
  });
  it('should create nvidia NIM provider', () => {
    const provider = getNvidiaNimProvider();
    expect(provider).toBeDefined();
  });
  it('should create model with default config', () => {
    const model = nvidiaNimModel();
    expect(model).toBeDefined();
  });
  it('should create synthesis model with env config', () => {
    process.env.SYNTHESIS_AGENT_TEMPERATURE = '0.9';
    process.env.SYNTHESIS_AGENT_MAX_TOKENS = '4000';
    
    const model = getSynthesisModel();
    expect(model).toBeDefined();
  });
  it('should throw if API key missing', () => {
    delete process.env.NVIDIA_API_KEY;
    
    expect(() => getNvidiaNimProvider()).toThrow('NVIDIA_API_KEY not configured');
  });
});
---
1.5 Rate Limiter
File: apps/mastra-app/src/lib/rate-limiter.ts (NEW)
import { setTimeout as sleep } from 'timers/promises';
export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  maxConcurrent: number;
  burstAllowance?: number;
}
interface QueuedRequest {
  estimatedTokens: number;
  resolve: () => void;
  reject: (error: Error) => void;
}
export class NvidiaRateLimiter {
  private config: RateLimitConfig;
  private requestTimestamps: number[] = [];
  private tokenUsage: Array<{ timestamp: number; tokens: number }> = [];
  private activeRequests = 0;
  private queue: QueuedRequest[] = [];
  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      requestsPerMinute: parseInt(process.env.NVIDIA_RATE_LIMIT_RPM || '60'),
      tokensPerMinute: parseInt(process.env.NVIDIA_RATE_LIMIT_TPM || '100000'),
      maxConcurrent: parseInt(process.env.NVIDIA_RATE_LIMIT_CONCURRENT || '5'),
      burstAllowance: 10,
      ...config,
    };
  }
  async acquire(estimatedTokens = 1000): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push({ estimatedTokens, resolve, reject });
      this.processQueue();
    });
  }
  release(actualTokens?: number): void {
    this.activeRequests--;
    
    if (actualTokens) {
      this.tokenUsage.push({
        timestamp: Date.now(),
        tokens: actualTokens,
      });
    }
    this.processQueue();
  }
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) return;
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    // Clean old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(ts => ts > oneMinuteAgo);
    this.tokenUsage = this.tokenUsage.filter(tu => tu.timestamp > oneMinuteAgo);
    // Check limits
    const requestsInLastMinute = this.requestTimestamps.length;
    const tokensInLastMinute = this.tokenUsage.reduce((sum, tu) => sum + tu.tokens, 0);
    const canProceed =
      this.activeRequests < this.config.maxConcurrent &&
      requestsInLastMinute < this.config.requestsPerMinute &&
      tokensInLastMinute + this.queue[0].estimatedTokens < this.config.tokensPerMinute;
    if (!canProceed) {
      // Wait and retry
      setTimeout(() => this.processQueue(), 1000);
      return;
    }
    // Process next request
    const request = this.queue.shift()!;
    this.activeRequests++;
    this.requestTimestamps.push(now);
    request.resolve();
  }
  getStats() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentRequests = this.requestTimestamps.filter(ts => ts > oneMinuteAgo).length;
    const recentTokens = this.tokenUsage
      .filter(tu => tu.timestamp > oneMinuteAgo)
      .reduce((sum, tu) => sum + tu.tokens, 0);
    return {
      activeRequests: this.activeRequests,
      queuedRequests: this.queue.length,
      requestsInLastMinute: recentRequests,
      tokensInLastMinute: recentTokens,
      limits: this.config,
    };
  }
}
// Singleton instance
let rateLimiter: NvidiaRateLimiter | null = null;
export function getNvidiaRateLimiter(): NvidiaRateLimiter {
  if (!rateLimiter) {
    rateLimiter = new NvidiaRateLimiter();
  }
  return rateLimiter;
}
Test: apps/mastra-app/src/__tests__/rate-limiter.test.ts (NEW)
import { describe, it, expect, beforeEach } from 'vitest';
import { NvidiaRateLimiter } from '../lib/rate-limiter';
describe('Nvidia Rate Limiter', () => {
  let limiter: NvidiaRateLimiter;
  beforeEach(() => {
    limiter = new NvidiaRateLimiter({
      requestsPerMinute: 10,
      tokensPerMinute: 10000,
      maxConcurrent: 2,
    });
  });
  it('should allow request within limits', async () => {
    await expect(limiter.acquire(100)).resolves.toBeUndefined();
    limiter.release(100);
  });
  it('should track concurrent requests', async () => {
    await limiter.acquire(100);
    await limiter.acquire(100);
    
    const stats = limiter.getStats();
    expect(stats.activeRequests).toBe(2);
    
    limiter.release(100);
    limiter.release(100);
  });
  it('should queue requests when concurrent limit reached', async () => {
    await limiter.acquire(100);
    await limiter.acquire(100);
    
    const promise = limiter.acquire(100);
    const stats = limiter.getStats();
    
    expect(stats.queuedRequests).toBe(1);
    
    limiter.release(100);
    await promise;
  });
  it('should return accurate stats', () => {
    const stats = limiter.getStats();
    
    expect(stats).toHaveProperty('activeRequests');
    expect(stats).toHaveProperty('queuedRequests');
    expect(stats).toHaveProperty('requestsInLastMinute');
    expect(stats).toHaveProperty('tokensInLastMinute');
    expect(stats).toHaveProperty('limits');
  });
});
---
Phase 2: Graph Repository Layer
2.1 Type Definitions
File: apps/api/src/schemas/graph-schema.ts (NEW)
import { z } from 'zod';
export const NodeTypeSchema = z.enum([
  'disease',
  'gene',
  'protein',
  'drug',
  'compound',
  'patent',
  'trial',
  'company',
  'paper',
]);
export const DataSourceSchema = z.enum([
  'Open Targets',
  'STRING',
  'PubMed',
  'PatentsView',
  'OpenFDA',
  'ClinicalTrials.gov',
  'Europe PMC',
]);
export const EdgeTypeSchema = z.enum([
  'association',
  'interaction',
  'binding',
  'ownership',
  'sponsorship',
  'inferred_relationship', // NEW for LLM-inferred edges
]);
export const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: NodeTypeSchema,
  source: DataSourceSchema,
  metadata: z.record(z.unknown()),
  evidenceScore: z.number().optional(),
  addedByQuery: z.string().optional(), // Query ID
  indiaRelevant: z.boolean().optional(),
});
export const GraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(), // Node ID
  target: z.string(), // Node ID
  type: EdgeTypeSchema,
  confidence: z.number().optional(),
  metadata: z.record(z.unknown()),
  inferredBy: z.enum(['LLM', 'heuristic', 'manual']).optional(),
  reasoning: z.string().optional(), // LLM reasoning trace
});
export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mode: z.enum(['Researcher', 'Strategist']).optional(),
  indiaLens: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export const QuerySchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  text: z.string(),
  mode: z.enum(['Researcher', 'Strategist']),
  indiaLens: z.boolean(),
  submittedAt: z.date(),
  status: z.enum(['pending', 'running', 'complete', 'failed']),
  completenessScore: z.number().optional(),
  iterations: z.number().optional(),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
export type Query = z.infer<typeof QuerySchema>;
export type NodeType = z.infer<typeof NodeTypeSchema>;
export type EdgeType = z.infer<typeof EdgeTypeSchema>;
---
2.2 Graph Repository
File: apps/api/src/lib/graph-repository.ts (NEW)
import { getNeo4jSession } from './neo4j-client.js';
import type { GraphNode, GraphEdge, Workspace, Query } from '../schemas/graph-schema.js';
import { randomUUID } from 'crypto';
export class GraphRepository {
  // Workspace operations
  async createWorkspace(data: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workspace> {
    const session = await getNeo4jSession();
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
        }
      );
      const workspace = result.records[0].get('w').properties;
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
    const session = await getNeo4jSession();
    try {
      const result = await session.run(
        'MATCH (w:Workspace {id: $id}) RETURN w',
        { id: workspaceId }
      );
      if (result.records.length === 0) return null;
      const workspace = result.records[0].get('w').properties;
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
    nodes: Omit<GraphNode, 'id'>[],
    queryId?: string
  ): Promise<GraphNode[]> {
    const session = await getNeo4jSession();
    try {
      const nodesWithIds = nodes.map(node => ({
        ...node,
        id: node.metadata.id || randomUUID(),
      }));
      const result = await session.run(
        `
        UNWIND $nodes AS nodeData
        MERGE (n:GraphNode {id: nodeData.id})
        ON CREATE SET
          n.label = nodeData.label,
          n.type = nodeData.type,
          n.source = nodeData.source,
          n.metadata = apoc.convert.toJson(nodeData.metadata),
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
          nodes: nodesWithIds.map(node => ({
            ...node,
            metadata: JSON.stringify(node.metadata),
          })),
        }
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
            nodeIds: nodesWithIds.map(n => n.id),
          }
        );
      }
      return nodesWithIds;
    } finally {
      await session.close();
    }
  }
  // Edge operations
  async addEdges(workspaceId: string, edges: Omit<GraphEdge, 'id'>[]): Promise<GraphEdge[]> {
    const session = await getNeo4jSession();
    try {
      const edgesWithIds = edges.map(edge => ({
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
          r.metadata = apoc.convert.toJson(edgeData.metadata),
          r.inferredBy = edgeData.inferredBy,
          r.reasoning = edgeData.reasoning,
          r.createdAt = datetime()
        RETURN r
        `,
        {
          workspaceId,
          edges: edgesWithIds.map(edge => ({
            ...edge,
            metadata: JSON.stringify(edge.metadata),
          })),
        }
      );
      return edgesWithIds;
    } finally {
      await session.close();
    }
  }
  // Get full graph
  async getWorkspaceGraph(workspaceId: string): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const session = await getNeo4jSession();
    try {
      // Get nodes
      const nodesResult = await session.run(
        `
        MATCH (w:Workspace {id: $workspaceId})-[:CONTAINS]->(n:GraphNode)
        RETURN n
        `,
        { workspaceId }
      );
      const nodes = nodesResult.records.map(record => {
        const node = record.get('n').properties;
        return {
          ...node,
          metadata: JSON.parse(node.metadata || '{}'),
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
        { workspaceId }
      );
      const edges = edgesResult.records.map(record => {
        const edge = record.get('r').properties;
        return {
          ...edge,
          source: record.get('source'),
          target: record.get('target'),
          metadata: JSON.parse(edge.metadata || '{}'),
        };
      });
      return { nodes, edges };
    } finally {
      await session.close();
    }
  }
  // Query operations
  async createQuery(data: Omit<Query, 'id' | 'submittedAt'>): Promise<Query> {
    const session = await getNeo4jSession();
    const id = randomUUID();
    const now = new Date();
    try {
      const result = await session.run(
        `
        MATCH (w:Workspace {id: $workspaceId})
        CREATE (q:Query {
          id: $id,
          text: $text,
          mode: $mode,
          indiaLens: $indiaLens,
          status: $status,
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
          submittedAt: now.toISOString(),
        }
      );
      const query = result.records[0].get('q').properties;
      return {
        ...query,
        submittedAt: new Date(query.submittedAt),
      };
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
Test: apps/api/src/__tests__/graph-repository.test.ts (NEW) - Full CRUD test suite (200+ lines)
---
Phase 3: Edge Construction Agent
3.1 Heuristic Candidate Selection
File: apps/mastra-app/src/lib/edge-heuristics.ts (NEW)
import type { GraphNode } from '@entropy/api/src/schemas/graph-schema';
export interface EdgeCandidate {
  sourceId: string;
  targetId: string;
  heuristicScore: number;
  reasoning: string;
}
// Type compatibility matrix
const TYPE_COMPATIBILITY: Record<string, string[]> = {
  protein: ['protein', 'gene', 'drug', 'compound', 'disease'],
  gene: ['protein', 'disease', 'gene'],
  drug: ['protein', 'disease', 'compound', 'trial'],
  compound: ['protein', 'drug', 'patent'],
  disease: ['gene', 'protein', 'drug', 'trial'],
  trial: ['drug', 'compound', 'disease', 'company'],
  patent: ['compound', 'company'],
  company: ['patent', 'trial'],
  paper: ['disease', 'gene', 'protein', 'drug', 'compound'],
};
export function findEdgeCandidates(
  newNodes: GraphNode[],
  existingNodes: GraphNode[],
  maxCandidates = 20
): EdgeCandidate[] {
  const candidates: EdgeCandidate[] = [];
  const allNodes = [...existingNodes, ...newNodes];
  // Check new nodes against all nodes
  for (const newNode of newNodes) {
    for (const otherNode of allNodes) {
      if (newNode.id === otherNode.id) continue;
      const score = calculateHeuristicScore(newNode, otherNode);
      
      if (score > 0.3) { // Threshold
        candidates.push({
          sourceId: newNode.id,
          targetId: otherNode.id,
          heuristicScore: score,
          reasoning: generateHeuristicReasoning(newNode, otherNode, score),
        });
      }
    }
  }
  // Sort by score and take top N
  return candidates
    .sort((a, b) => b.heuristicScore - a.heuristicScore)
    .slice(0, maxCandidates);
}
function calculateHeuristicScore(node1: GraphNode, node2: GraphNode): number {
  let score = 0;
  // Type compatibility (0.4 weight)
  const compatible = TYPE_COMPATIBILITY[node1.type]?.includes(node2.type) || false;
  if (compatible) score += 0.4;
  // Same source (0.2 weight)
  if (node1.source === node2.source) score += 0.2;
  // Shared concepts in metadata (0.4 weight)
  const sharedConcepts = findSharedConcepts(node1.metadata, node2.metadata);
  score += Math.min(sharedConcepts * 0.1, 0.4);
  return Math.min(score, 1.0);
}
function findSharedConcepts(meta1: Record<string, unknown>, meta2: Record<string, unknown>): number {
  const concepts1 = extractConcepts(meta1);
  const concepts2 = extractConcepts(meta2);
  
  const shared = concepts1.filter(c => concepts2.includes(c));
  return shared.length;
}
function extractConcepts(metadata: Record<string, unknown>): string[] {
  const concepts: string[] = [];
  
  for (const value of Object.values(metadata)) {
    if (typeof value === 'string') {
      concepts.push(...value.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    } else if (Array.isArray(value)) {
      concepts.push(...value.map(String).map(s => s.toLowerCase()));
    }
  }
  
  return [...new Set(concepts)];
}
function generateHeuristicReasoning(node1: GraphNode, node2: GraphNode, score: number): string {
  const reasons: string[] = [];
  
  if (TYPE_COMPATIBILITY[node1.type]?.includes(node2.type)) {
    reasons.push(`Type compatibility: ${node1.type} ↔ ${node2.type}`);
  }
  
  if (node1.source === node2.source) {
    reasons.push(`Same source: ${node1.source}`);
  }
  
  const sharedConcepts = findSharedConcepts(node1.metadata, node2.metadata);
  if (sharedConcepts > 0) {
    reasons.push(`${sharedConcepts} shared concept(s)`);
  }
  
  return reasons.join('; ');
}
Test: apps/mastra-app/src/__tests__/edge-heuristics.test.ts (NEW)
---
3.2 LLM Edge Constructor Agent
File: apps/mastra-app/src/agents/edge-constructor-agent.ts (NEW)
import { Agent } from '@mastra/core';
import { z } from 'zod';
import { getEdgeConstructorModel } from '../lib/nvidia-nim-provider.js';
import { getNvidiaRateLimiter } from '../lib/rate-limiter.js';
import type { GraphNode } from '@entropy/api/src/schemas/graph-schema';
import type { EdgeCandidate } from '../lib/edge-heuristics.js';
const InferredEdgeSchema = z.object({
  sourceId: z.string(),
  targetId: z.string(),
  type: z.enum(['association', 'interaction', 'binding', 'ownership', 'sponsorship', 'inferred_relationship']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});
const EdgeInferenceOutputSchema = z.object({
  edges: z.array(InferredEdgeSchema),
});
export type InferredEdge = z.infer<typeof InferredEdgeSchema>;
export type EdgeInferenceOutput = z.infer<typeof EdgeInferenceOutputSchema>;
export const edgeConstructorAgent = new Agent({
  name: 'edge-constructor',
  instructions: `You are a scientific knowledge graph expert specializing in biomedical and pharmaceutical relationships.
Your task: Analyze pairs of entities (genes, proteins, diseases, drugs, compounds, patents, trials, companies) and infer semantic relationships between them.
For each candidate pair, determine:
1. Whether a meaningful relationship exists
2. The type of relationship (association, interaction, binding, ownership, sponsorship, or inferred_relationship)
3. Confidence score (0-1, only return edges with confidence > 0.7)
4. Clear reasoning explaining the relationship
Consider:
- Biological mechanisms (protein-protein interaction, gene-disease association)
- Clinical relevance (drug-target binding, trial enrollment criteria)
- Patent/IP landscape (company ownership, competitive positioning)
- Literature evidence and co-occurrence patterns
Return ONLY high-confidence relationships (>0.7) with clear, concise reasoning.`,
  model: getEdgeConstructorModel(),
});
export async function inferEdgesFromCandidates(
  candidates: EdgeCandidate[],
  allNodes: GraphNode[],
  context: {
    workspaceMode: 'Researcher' | 'Strategist';
    domain?: string;
  }
): Promise<InferredEdge[]> {
  if (candidates.length === 0) return [];
  const rateLimiter = getNvidiaRateLimiter();
  // Build node lookup
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));
  // Build prompt
  const candidateDescriptions = candidates.map(c => {
    const source = nodeMap.get(c.sourceId);
    const target = nodeMap.get(c.targetId);
    
    return {
      sourceId: c.sourceId,
      source: source ? `${source.label} (${source.type}, ${source.source})` : 'Unknown',
      targetId: c.targetId,
      target: target ? `${target.label} (${target.type}, ${target.source})` : 'Unknown',
      heuristicScore: c.heuristicScore,
      heuristicReasoning: c.reasoning,
    };
  });
  const prompt = `
Mode: ${context.workspaceMode}
${context.domain ? `Domain: ${context.domain}` : ''}
Analyze these candidate entity pairs and infer high-confidence relationships:
${JSON.stringify(candidateDescriptions, null, 2)}
Return edges in JSON format: { "edges": [{ "sourceId", "targetId", "type", "confidence", "reasoning" }] }
Only include relationships with confidence > 0.7.
`;
  // Rate limiting
  const estimatedTokens = prompt.length / 4 + 500; // Rough estimate
  await rateLimiter.acquire(estimatedTokens);
  try {
    const result = await edgeConstructorAgent.generate(
      [{ role: 'user', content: prompt }],
      { structuredOutput: { schema: EdgeInferenceOutputSchema } }
    );
    rateLimiter.release(estimatedTokens);
    const output = result.object as EdgeInferenceOutput;
    return output.edges.filter(e => e.confidence > 0.7);
  } catch (error) {
    rateLimiter.release(estimatedTokens);
    
    console.error('[edge-constructor] LLM inference failed:', error);
    
    // Fail fast (no fallback to Gemini)
    throw new Error(`Edge inference failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
Test: apps/mastra-app/src/__tests__/edge-constructor-agent.test.ts (NEW)
---
3.3 Integration into Add-Nodes Flow
File: apps/api/src/routes/workspace.ts (NEW)
import { Hono } from 'hono';
import { z } from 'zod';
import { getGraphRepository } from '../lib/graph-repository.js';
import { GraphNodeSchema, GraphEdgeSchema } from '../schemas/graph-schema.js';
import { findEdgeCandidates } from '@entropy/mastra-app/src/lib/edge-heuristics.js';
import { inferEdgesFromCandidates } from '@entropy/mastra-app/src/agents/edge-constructor-agent.js';
import { errorResponse } from '../middleware/error-handler.js';
const workspace = new Hono();
const CreateWorkspaceSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  mode: z.enum(['Researcher', 'Strategist']).optional(),
  indiaLens: z.boolean().optional(),
});
const AddNodesRequestSchema = z.object({
  nodes: z.array(GraphNodeSchema.omit({ id: true })),
  queryId: z.string().optional(),
  inferEdges: z.boolean().default(true), // Enable edge inference by default
});
workspace.post('/create', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, 'BAD_REQUEST', 'Invalid JSON body');
  }
  const parsed = CreateWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid request', {
      issues: parsed.error.issues,
    });
  }
  const repo = getGraphRepository();
  const workspace = await repo.createWorkspace(parsed.data);
  return c.json(workspace, 201);
});
workspace.get('/:id', async (c) => {
  const workspaceId = c.req.param('id');
  const repo = getGraphRepository();
  const workspace = await repo.getWorkspace(workspaceId);
  if (!workspace) {
    return errorResponse(c, 404, 'NOT_FOUND', 'Workspace not found');
  }
  return c.json(workspace);
});
workspace.post('/:id/nodes', async (c) => {
  const workspaceId = c.req.param('id');
  
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, 'BAD_REQUEST', 'Invalid JSON body');
  }
  const parsed = AddNodesRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid request', {
      issues: parsed.error.issues,
    });
  }
  const repo = getGraphRepository();
  // 1. Add nodes to Neo4j
  const addedNodes = await repo.addNodesToWorkspace(
    workspaceId,
    parsed.data.nodes,
    parsed.data.queryId
  );
  let addedEdges: any[] = [];
  // 2. Infer edges if requested
  if (parsed.data.inferEdges) {
    try {
      const { nodes: existingNodes } = await repo.getWorkspaceGraph(workspaceId);
      
      // Heuristic candidate selection
      const candidates = findEdgeCandidates(addedNodes, existingNodes, 20);
      
      if (candidates.length > 0) {
        // LLM edge inference
        const workspace = await repo.getWorkspace(workspaceId);
        const inferredEdges = await inferEdgesFromCandidates(
          candidates,
          [...existingNodes, ...addedNodes],
          {
            workspaceMode: workspace?.mode || 'Researcher',
          }
        );
        
        // Store edges in Neo4j
        if (inferredEdges.length > 0) {
          addedEdges = await repo.addEdges(
            workspaceId,
            inferredEdges.map(e => ({
              source: e.sourceId,
              target: e.targetId,
              type: e.type,
              confidence: e.confidence,
              metadata: {},
              inferredBy: 'LLM' as const,
              reasoning: e.reasoning,
            }))
          );
        }
      }
    } catch (error) {
      console.error('[add-nodes] Edge inference failed:', error);
      // Continue without edges (don't fail the whole request)
    }
  }
  return c.json({
    addedNodes,
    addedEdges,
  });
});
workspace.get('/:id/graph', async (c) => {
  const workspaceId = c.req.param('id');
  const repo = getGraphRepository();
  const graph = await repo.getWorkspaceGraph(workspaceId);
  return c.json(graph);
});
export default workspace;
File: apps/api/src/index.ts (UPDATE - mount workspace routes)
import workspace from './routes/workspace.js';
app.route('/api/workspace', workspace);
Test: apps/api/src/__tests__/workspace-add-nodes.test.ts (NEW - test edge inference integration)
---

Phase 4: Deep Synthesis Agent with Streaming
4.1 Synthesis Agent with Multi-Step Reasoning
File: apps/mastra-app/src/agents/synthesis-agent.ts (REPLACE existing placeholder)
import { Agent } from '@mastra/core';
import { z } from 'zod';
import { getSynthesisModel } from '../lib/nvidia-nim-provider.js';
import { getNvidiaRateLimiter } from '../lib/rate-limiter.js';
import type { GraphNode, GraphEdge } from '@entropy/api/src/schemas/graph-schema';
// Keep existing schemas
const CitationSchema = z.object({
  source: z.string().trim().min(1),
  label: z.string().trim().min(1),
  nodeId: z.string().trim().min(1),
});
const SectionSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  citations: z.array(CitationSchema).default([]),
  reasoningTrace: z.string().optional(), // NEW: nvidia NIM reasoning_content
});
const SynthesisResultSchema = z.object({
  sections: z.array(SectionSchema).default([]),
});
export type SynthesisCitation = z.infer<typeof CitationSchema>;
export type SynthesisSection = z.infer<typeof SectionSchema>;
export type SynthesisResult = z.infer<typeof SynthesisResultSchema>;
type SynthesisInput = {
  graphSnapshot: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  personaMode: 'Researcher' | 'Strategist';
  reportSections: string[];
  indiaLens?: boolean;
};
// Graph analysis schemas
const GraphInsightsSchema = z.object({
  centralNodes: z.array(z.object({
    nodeId: z.string(),
    importance: z.number(),
    reasoning: z.string(),
  })),
  nodeClusters: z.array(z.object({
    theme: z.string(),
    nodeIds: z.array(z.string()),
    edgeTypes: z.array(z.string()),
  })),
  keyPatterns: z.array(z.object({
    pattern: z.string(),
    evidence: z.array(z.string()), // Node IDs
  })),
  gaps: z.array(z.string()),
});
const PatternAnalysisSchema = z.object({
  mechanisticPathways: z.array(z.object({
    pathway: z.string(),
    nodes: z.array(z.string()),
    confidence: z.number(),
  })),
  clinicalImplications: z.array(z.object({
    implication: z.string(),
    supportingNodes: z.array(z.string()),
  })),
  competitiveLandscape: z.array(z.object({
    insight: z.string(),
    companies: z.array(z.string()),
    patents: z.array(z.string()),
  })).optional(),
});
type GraphInsights = z.infer<typeof GraphInsightsSchema>;
type PatternAnalysis = z.infer<typeof PatternAnalysisSchema>;
// Agent for graph analysis
const graphAnalysisAgent = new Agent({
  name: 'graph-analyzer',
  instructions: `You are a knowledge graph analyst. Analyze the provided graph structure and extract key insights.
Identify:
1. Central nodes (highest degree/importance) - explain why they're central
2. Node clusters (groups of related entities) - describe the theme
3. Key patterns (recurring relationship types, pathways)
4. Gaps (missing connections, underexplored areas)
Focus on actionable insights, not just statistics.`,
  model: getSynthesisModel(),
});
// Agent for pattern identification
const patternAnalysisAgent = new Agent({
  name: 'pattern-analyzer',
  instructions: `You are a scientific pattern recognition expert. Based on graph analysis, identify meaningful patterns.
For Researcher mode:
- Mechanistic pathways (disease → gene → protein → drug)
- Clinical implications from trials and evidence
- Literature-supported connections
For Strategist mode:
- Competitive landscape (company patents, trial sponsorship)
- Market positioning and IP clusters
- Strategic gaps and opportunities
Provide specific node IDs as evidence for each pattern.`,
  model: getSynthesisModel(),
});
// Agent for section synthesis (will be used with streaming)
const sectionSynthesisAgent = new Agent({
  name: 'section-synthesizer',
  instructions: `You are a scientific writer creating high-quality report sections.
CRITICAL RULES:
1. Use ONLY information from provided graph nodes and edges
2. Cite EVERY claim with node IDs in [nodeId] format
3. Write clear, concise, professional prose
4. For Researcher mode: focus on scientific mechanisms and evidence
5. For Strategist mode: focus on competitive intelligence and opportunities
6. If India Lens is enabled: prioritize India-relevant nodes and highlight India-specific insights
Format citations as: "Protein X shows strong binding affinity [protein-123] in multiple trials [trial-456, trial-789]."`,
  model: getSynthesisModel(),
});
// Step 1: Analyze graph structure
async function analyzeGraph(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Promise<GraphInsights> {
  const rateLimiter = getNvidiaRateLimiter();
  
  const prompt = `Analyze this knowledge graph:
Nodes: ${nodes.length}
${nodes.slice(0, 20).map(n => `- ${n.id}: ${n.label} (${n.type}, ${n.source})`).join('\n')}
${nodes.length > 20 ? `... and ${nodes.length - 20} more` : ''}
Edges: ${edges.length}
${edges.slice(0, 20).map(e => `- ${e.source} → ${e.target} (${e.type}, confidence: ${e.confidence || 'N/A'})`).join('\n')}
${edges.length > 20 ? `... and ${edges.length - 20} more` : ''}
Provide graph insights in JSON format.`;
  const estimatedTokens = prompt.length / 4 + 1000;
  await rateLimiter.acquire(estimatedTokens);
  try {
    const result = await graphAnalysisAgent.generate(
      [{ role: 'user', content: prompt }],
      { structuredOutput: { schema: GraphInsightsSchema } }
    );
    rateLimiter.release(estimatedTokens);
    return result.object as GraphInsights;
  } catch (error) {
    rateLimiter.release(estimatedTokens);
    throw error;
  }
}
// Step 2: Identify patterns
async function identifyPatterns(
  insights: GraphInsights,
  nodes: GraphNode[],
  edges: GraphEdge[],
  mode: 'Researcher' | 'Strategist'
): Promise<PatternAnalysis> {
  const rateLimiter = getNvidiaRateLimiter();
  const prompt = `Mode: ${mode}
Graph insights:
${JSON.stringify(insights, null, 2)}
Available nodes:
${nodes.map(n => `${n.id}: ${n.label} (${n.type})`).join('\n')}
Identify meaningful patterns based on the mode. Return JSON format.`;
  const estimatedTokens = prompt.length / 4 + 1000;
  await rateLimiter.acquire(estimatedTokens);
  try {
    const result = await patternAnalysisAgent.generate(
      [{ role: 'user', content: prompt }],
      { structuredOutput: { schema: PatternAnalysisSchema } }
    );
    rateLimiter.release(estimatedTokens);
    return result.object as PatternAnalysis;
  } catch (error) {
    rateLimiter.release(estimatedTokens);
    throw error;
  }
}
// Step 3: Synthesize section with streaming
async function synthesizeSection(
  sectionTitle: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  patterns: PatternAnalysis,
  mode: 'Researcher' | 'Strategist',
  indiaLens: boolean,
  onChunk?: (chunk: string) => void, // Streaming callback
  onReasoningChunk?: (reasoning: string) => void // Reasoning trace callback
): Promise<SynthesisSection> {
  const rateLimiter = getNvidiaRateLimiter();
  // Filter nodes if India Lens enabled
  const relevantNodes = indiaLens 
    ? nodes.filter(n => n.indiaRelevant === true)
    : nodes;
  const prompt = `Write a "${sectionTitle}" section for a ${mode} report.
${indiaLens ? 'INDIA LENS ENABLED: Prioritize India-relevant insights and data.\n' : ''}
Available evidence:
Nodes (${relevantNodes.length}):
${relevantNodes.slice(0, 50).map(n => `[${n.id}] ${n.label} (${n.type}, ${n.source})${n.indiaRelevant ? ' [INDIA-RELEVANT]' : ''}`).join('\n')}
Patterns identified:
${JSON.stringify(patterns, null, 2)}
Write 2-4 paragraphs. Cite node IDs in [nodeId] format for EVERY claim.`;
  const estimatedTokens = prompt.length / 4 + 2000;
  await rateLimiter.acquire(estimatedTokens);
  try {
    let content = '';
    let reasoningContent = '';
    // Use nvidia NIM streaming API
    const stream = await sectionSynthesisAgent.generate(
      [{ role: 'user', content: prompt }],
      { 
        stream: true,
        temperature: parseFloat(process.env.SYNTHESIS_AGENT_TEMPERATURE || '0.8'),
        maxTokens: parseInt(process.env.SYNTHESIS_AGENT_MAX_TOKENS || '3000'),
      }
    );
    // Process stream chunks
    for await (const chunk of stream) {
      // Check for reasoning content (nvidia NIM specific)
      if (chunk.reasoning) {
        reasoningContent += chunk.reasoning;
        if (onReasoningChunk) {
          onReasoningChunk(chunk.reasoning);
        }
      }
      // Regular content
      if (chunk.text) {
        content += chunk.text;
        if (onChunk) {
          onChunk(chunk.text);
        }
      }
    }
    rateLimiter.release(estimatedTokens);
    // Extract citations from content
    const citations = extractCitations(content, relevantNodes);
    return {
      title: sectionTitle,
      content,
      citations,
      reasoningTrace: reasoningContent || undefined,
    };
  } catch (error) {
    rateLimiter.release(estimatedTokens);
    throw error;
  }
}
// Extract [nodeId] citations from text
function extractCitations(content: string, nodes: GraphNode[]): SynthesisCitation[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const citationRegex = /\[([a-zA-Z0-9_-]+)\]/g;
  const matches = [...content.matchAll(citationRegex)];
  
  const citations: SynthesisCitation[] = [];
  const seen = new Set<string>();
  for (const match of matches) {
    const nodeId = match[1];
    if (seen.has(nodeId)) continue;
    
    const node = nodeMap.get(nodeId);
    if (node) {
      citations.push({
        nodeId: node.id,
        source: node.source,
        label: node.label,
      });
      seen.add(nodeId);
    }
  }
  return citations;
}
// Main synthesis function (replaces fallbackSections)
export async function summariseFromGraph(
  input: SynthesisInput,
  callbacks?: {
    onSectionStart?: (sectionTitle: string) => void;
    onSectionChunk?: (sectionTitle: string, chunk: string) => void;
    onReasoningChunk?: (sectionTitle: string, reasoning: string) => void;
    onSectionComplete?: (section: SynthesisSection) => void;
  }
): Promise<SynthesisResult> {
  const { graphSnapshot, personaMode, reportSections, indiaLens = false } = input;
  // Step 1: Analyze graph (30s)
  const insights = await analyzeGraph(graphSnapshot.nodes, graphSnapshot.edges);
  // Step 2: Identify patterns (20s)
  const patterns = await identifyPatterns(
    insights,
    graphSnapshot.nodes,
    graphSnapshot.edges,
    personaMode
  );
  // Step 3: Synthesize sections with streaming (30s per section)
  const sections: SynthesisSection[] = [];
  
  const sectionTitles = reportSections.length > 0 
    ? reportSections 
    : getDefaultSections(personaMode);
  for (const title of sectionTitles) {
    if (callbacks?.onSectionStart) {
      callbacks.onSectionStart(title);
    }
    const section = await synthesizeSection(
      title,
      graphSnapshot.nodes,
      graphSnapshot.edges,
      patterns,
      personaMode,
      indiaLens,
      (chunk) => callbacks?.onSectionChunk?.(title, chunk),
      (reasoning) => callbacks?.onReasoningChunk?.(title, reasoning)
    );
    sections.push(section);
    if (callbacks?.onSectionComplete) {
      callbacks.onSectionComplete(section);
    }
  }
  return { sections };
}
function getDefaultSections(mode: 'Researcher' | 'Strategist'): string[] {
  if (mode === 'Researcher') {
    return [
      'Overview',
      'Mechanism of Action',
      'Clinical Evidence',
      'Safety Profile',
      'Literature Summary',
    ];
  } else {
    return [
      'Competitive Landscape Overview',
      'Patent Portfolio Analysis',
      'Clinical Trial Landscape',
      'Market Positioning',
      'Strategic Gaps',
    ];
  }
}
Test: apps/mastra-app/src/__tests__/synthesis-agent.test.ts (UPDATE)
import { describe, it, expect, beforeAll } from 'vitest';
import { summariseFromGraph } from '../agents/synthesis-agent';
import type { GraphNode, GraphEdge } from '@entropy/api/src/schemas/graph-schema';
describe('Synthesis Agent (Deep Reasoning)', () => {
  const mockNodes: GraphNode[] = [
    {
      id: 'protein-123',
      label: 'CDK4/6',
      type: 'protein',
      source: 'Open Targets',
      metadata: { description: 'Cell cycle regulator' },
    },
    {
      id: 'drug-456',
      label: 'Palbociclib',
      type: 'drug',
      source: 'OpenFDA',
      metadata: { indication: 'Breast cancer' },
    },
  ];
  const mockEdges: GraphEdge[] = [
    {
      id: 'edge-1',
      source: 'drug-456',
      target: 'protein-123',
      type: 'binding',
      confidence: 0.9,
      metadata: {},
      inferredBy: 'LLM',
    },
  ];
  it('should generate synthesis with citations', async () => {
    const result = await summariseFromGraph({
      graphSnapshot: { nodes: mockNodes, edges: mockEdges },
      personaMode: 'Researcher',
      reportSections: ['Overview'],
    });
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].title).toBe('Overview');
    expect(result.sections[0].content).toContain('[');
    expect(result.sections[0].citations.length).toBeGreaterThan(0);
  });
  it('should support streaming callbacks', async () => {
    const chunks: string[] = [];
    const reasoningChunks: string[] = [];
    await summariseFromGraph(
      {
        graphSnapshot: { nodes: mockNodes, edges: mockEdges },
        personaMode: 'Strategist',
        reportSections: ['Competitive Landscape Overview'],
      },
      {
        onSectionChunk: (title, chunk) => chunks.push(chunk),
        onReasoningChunk: (title, reasoning) => reasoningChunks.push(reasoning),
      }
    );
    expect(chunks.length).toBeGreaterThan(0);
    // Reasoning chunks may or may not be present depending on nvidia NIM output
  });
  it('should filter nodes with India Lens', async () => {
    const indiaNodes: GraphNode[] = [
      { ...mockNodes[0], indiaRelevant: true },
      { ...mockNodes[1], indiaRelevant: false },
    ];
    const result = await summariseFromGraph({
      graphSnapshot: { nodes: indiaNodes, edges: mockEdges },
      personaMode: 'Researcher',
      reportSections: ['Overview'],
      indiaLens: true,
    });
    // Should only cite India-relevant nodes
    const citedNodeIds = result.sections[0].citations.map(c => c.nodeId);
    expect(citedNodeIds).toContain('protein-123');
    expect(citedNodeIds).not.toContain('drug-456');
  });
  it('should use persona-specific sections', async () => {
    const researcherResult = await summariseFromGraph({
      graphSnapshot: { nodes: mockNodes, edges: mockEdges },
      personaMode: 'Researcher',
      reportSections: [], // Use defaults
    });
    expect(researcherResult.sections.some(s => s.title === 'Mechanism of Action')).toBe(true);
    const strategistResult = await summariseFromGraph({
      graphSnapshot: { nodes: mockNodes, edges: mockEdges },
      personaMode: 'Strategist',
      reportSections: [], // Use defaults
    });
    expect(strategistResult.sections.some(s => s.title === 'Patent Portfolio Analysis')).toBe(true);
  });
});
---
4.2 Synthesis API Endpoint with Streaming
File: apps/api/src/routes/causaly.ts (UPDATE synthesis endpoint)
// Add streaming support to synthesis endpoint
import { stream } from 'hono/streaming';
causaly.post('/synthesise', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, 'BAD_REQUEST', 'Invalid JSON body');
  }
  const parsed = SynthesisRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid request', {
      issues: parsed.error.issues,
    });
  }
  const { graphSnapshot, personaMode, reportSections, indiaLens, streaming } = parsed.data;
  // Non-streaming (original behavior)
  if (!streaming) {
    const result = await summariseFromGraph({
      graphSnapshot,
      personaMode,
      reportSections,
      indiaLens,
    });
    return c.json(result);
  }
  // Streaming mode
  return stream(c, async (stream) => {
    await stream.writeSSE({
      event: 'start',
      data: JSON.stringify({ message: 'Starting synthesis' }),
    });
    try {
      const result = await summariseFromGraph(
        {
          graphSnapshot,
          personaMode,
          reportSections,
          indiaLens,
        },
        {
          onSectionStart: (title) => {
            stream.writeSSE({
              event: 'section_start',
              data: JSON.stringify({ title }),
            });
          },
          onSectionChunk: (title, chunk) => {
            stream.writeSSE({
              event: 'section_chunk',
              data: JSON.stringify({ title, chunk }),
            });
          },
          onReasoningChunk: (title, reasoning) => {
            stream.writeSSE({
              event: 'reasoning_chunk',
              data: JSON.stringify({ title, reasoning }),
            });
          },
          onSectionComplete: (section) => {
            stream.writeSSE({
              event: 'section_complete',
              data: JSON.stringify(section),
            });
          },
        }
      );
      await stream.writeSSE({
        event: 'complete',
        data: JSON.stringify(result),
      });
    } catch (error) {
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({
          error: error instanceof Error ? error.message : 'Synthesis failed',
        }),
      });
    }
    await stream.close();
  });
});
Update schema:
const SynthesisRequestSchema = z.object({
  graphSnapshot: z.object({
    nodes: z.array(z.unknown()),
    edges: z.array(z.unknown()),
  }),
  personaMode: z.enum(['Researcher', 'Strategist']),
  reportSections: z.array(z.string()).default([]),
  indiaLens: z.boolean().default(false),
  streaming: z.boolean().default(false), // NEW
});
---
Phase 5: Full Pipeline Workflow
5.1 Graph Synthesis Pipeline Workflow
File: apps/mastra-app/src/workflows/graph-synthesis-pipeline.ts (NEW)
import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { GraphNodeSchema, GraphEdgeSchema, NodeTypeSchema } from '@entropy/api/src/schemas/graph-schema';
import { getGraphRepository } from '@entropy/api/src/lib/graph-repository';
import { scoreHelpfulness } from '../agents/helpfulness-agent.js';
import { findEdgeCandidates } from '../lib/edge-heuristics.js';
import { inferEdgesFromCandidates } from '../agents/edge-constructor-agent.js';
import { summariseFromGraph, SynthesisResultSchema } from '../agents/synthesis-agent.js';
import { randomUUID } from 'crypto';
// Input schema
const GraphSynthesisPipelineInputSchema = z.object({
  workspaceId: z.string(),
  queryText: z.string(),
  mode: z.enum(['Researcher', 'Strategist']),
  indiaLens: z.boolean().default(false),
  searchTypes: z.array(NodeTypeSchema).default([]),
  reportSections: z.array(z.string()).default([]),
  searchResults: z.array(z.unknown()).optional(), // Pre-fetched results
});
// Output schema
const GraphSynthesisPipelineOutputSchema = z.object({
  queryId: z.string(),
  addedNodesCount: z.number(),
  addedEdgesCount: z.number(),
  synthesis: SynthesisResultSchema,
});
// Step 1: Score helpfulness (reuse existing agent)
const helpfulnessStep = createStep({
  id: 'score-helpfulness',
  inputSchema: GraphSynthesisPipelineInputSchema,
  outputSchema: z.object({
    scoredResults: z.array(z.unknown()),
  }),
  execute: async ({ inputData }) => {
    if (!inputData.searchResults || inputData.searchResults.length === 0) {
      throw new Error('No search results provided');
    }
    // Get workspace graph for context
    const repo = getGraphRepository();
    const { nodes: existingNodes } = await repo.getWorkspaceGraph(inputData.workspaceId);
    const nodeTypes = Object.fromEntries(
      existingNodes.map(n => [n.id, n.type])
    );
    const existingConcepts = existingNodes.flatMap(n =>
      Object.values(n.metadata)
        .filter((v): v is string => typeof v === 'string')
        .flatMap(v => v.toLowerCase().split(/\s+/))
    );
    // Score each result
    const scoredResults = await Promise.all(
      inputData.searchResults.map(async (result: any) => {
        const score = await scoreHelpfulness({
          snippet: result.snippet || result.title || '',
          queryText: inputData.queryText,
          nodeTypes,
          existingConcepts,
        });
        return { ...result, helpfulnessScore: score };
      })
    );
    return { scoredResults };
  },
});
// Step 2: Add nodes to graph
const addNodesToGraphStep = createStep({
  id: 'add-nodes',
  inputSchema: z.object({
    scoredResults: z.array(z.unknown()),
  }),
  outputSchema: z.object({
    queryId: z.string(),
    addedNodes: z.array(GraphNodeSchema),
  }),
  execute: async ({ inputData, getStepResult }) => {
    const pipelineInput = getStepResult<z.infer<typeof GraphSynthesisPipelineInputSchema>>('score-helpfulness');
    const repo = getGraphRepository();
    // Create query record
    const queryId = randomUUID();
    await repo.createQuery({
      workspaceId: pipelineInput.workspaceId,
      text: pipelineInput.queryText,
      mode: pipelineInput.mode,
      indiaLens: pipelineInput.indiaLens,
      status: 'running',
    });
    // Transform search results to GraphNode format
    const nodes = inputData.scoredResults
      .filter((r: any) => (r.helpfulnessScore || 0) > 0.5) // Filter by score
      .slice(0, 10) // Limit to top 10
      .map((r: any) => ({
        label: r.title || r.name || 'Unnamed',
        type: r.type || 'paper',
        source: r.source || 'Unknown',
        metadata: r,
        evidenceScore: r.helpfulnessScore,
        indiaRelevant: pipelineInput.indiaLens ? (r.indiaRelevant || false) : undefined,
      }));
    // Add to Neo4j
    const addedNodes = await repo.addNodesToWorkspace(
      pipelineInput.workspaceId,
      nodes,
      queryId
    );
    return { queryId, addedNodes };
  },
});
// Step 3: Construct edges
const constructEdgesStep = createStep({
  id: 'construct-edges',
  inputSchema: z.object({
    queryId: z.string(),
    addedNodes: z.array(GraphNodeSchema),
  }),
  outputSchema: z.object({
    addedEdges: z.array(GraphEdgeSchema),
  }),
  execute: async ({ inputData, getStepResult }) => {
    const pipelineInput = getStepResult<z.infer<typeof GraphSynthesisPipelineInputSchema>>('score-helpfulness');
    const repo = getGraphRepository();
    // Get existing nodes
    const { nodes: existingNodes } = await repo.getWorkspaceGraph(pipelineInput.workspaceId);
    // Find candidates
    const candidates = findEdgeCandidates(inputData.addedNodes, existingNodes, 20);
    if (candidates.length === 0) {
      return { addedEdges: [] };
    }
    // Infer edges with LLM
    const inferredEdges = await inferEdgesFromCandidates(
      candidates,
      [...existingNodes, ...inputData.addedNodes],
      {
        workspaceMode: pipelineInput.mode,
      }
    );
    // Store in Neo4j
    const addedEdges = await repo.addEdges(
      pipelineInput.workspaceId,
      inferredEdges.map(e => ({
        source: e.sourceId,
        target: e.targetId,
        type: e.type,
        confidence: e.confidence,
        metadata: {},
        inferredBy: 'LLM' as const,
        reasoning: e.reasoning,
      }))
    );
    // Link edges to query
    if (inputData.queryId) {
      // TODO: Implement query-edge linking in repository
    }
    return { addedEdges };
  },
});
// Step 4: Synthesize report
const synthesizeStep = createStep({
  id: 'synthesize',
  inputSchema: z.object({
    addedEdges: z.array(GraphEdgeSchema),
  }),
  outputSchema: SynthesisResultSchema,
  execute: async ({ getStepResult }) => {
    const pipelineInput = getStepResult<z.infer<typeof GraphSynthesisPipelineInputSchema>>('score-helpfulness');
    const repo = getGraphRepository();
    // Get full workspace graph
    const { nodes, edges } = await repo.getWorkspaceGraph(pipelineInput.workspaceId);
    // Synthesize with deep reasoning
    const synthesis = await summariseFromGraph({
      graphSnapshot: { nodes, edges },
      personaMode: pipelineInput.mode,
      reportSections: pipelineInput.reportSections,
      indiaLens: pipelineInput.indiaLens,
    });
    return synthesis;
  },
});
// Compose workflow
export const graphSynthesisPipeline = createWorkflow({
  id: 'graph-synthesis-pipeline',
  inputSchema: GraphSynthesisPipelineInputSchema,
  outputSchema: GraphSynthesisPipelineOutputSchema,
})
  .then(helpfulnessStep)
  .then(addNodesToGraphStep)
  .then(constructEdgesStep)
  .then(synthesizeStep)
  .map(async ({ inputData, getStepResult }) => {
    const addNodesResult = getStepResult<{ queryId: string; addedNodes: any[] }>('add-nodes');
    const edgesResult = getStepResult<{ addedEdges: any[] }>('construct-edges');
    const synthesis = getStepResult(synthesizeStep.id);
    return {
      queryId: addNodesResult.queryId,
      addedNodesCount: addNodesResult.addedNodes.length,
      addedEdgesCount: edgesResult.addedEdges.length,
      synthesis,
    };
  })
  .commit();
---
5.2 Workflow API Endpoint
File: apps/api/src/routes/workflow.ts (NEW)
import { Hono } from 'hono';
import { z } from 'zod';
import { mastra } from '@entropy/mastra-app/src/mastra/index.js';
import { errorResponse } from '../middleware/error-handler.js';
const workflow = new Hono();
const SynthesizeWorkflowRequestSchema = z.object({
  workspaceId: z.string(),
  queryText: z.string(),
  mode: z.enum(['Researcher', 'Strategist']),
  indiaLens: z.boolean().default(false),
  searchTypes: z.array(z.string()).default([]),
  reportSections: z.array(z.string()).default([]),
  searchResults: z.array(z.unknown()), // Pre-fetched from /search endpoint
});
workflow.post('/synthesize', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, 'BAD_REQUEST', 'Invalid JSON body');
  }
  const parsed = SynthesizeWorkflowRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, 'VALIDATION_ERROR', 'Invalid request', {
      issues: parsed.error.issues,
    });
  }
  try {
    const result = await mastra.workflows.graphSynthesisPipeline.execute(parsed.data);
    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[workflow/synthesize] Execution failed:', error);
    return errorResponse(c, 500, 'WORKFLOW_ERROR', 'Workflow execution failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
// Get workflow status (for long-running workflows)
workflow.get('/status/:executionId', async (c) => {
  const executionId = c.req.param('executionId');
  
  // TODO: Implement execution tracking in Mastra
  
  return c.json({
    executionId,
    status: 'unknown',
    message: 'Execution tracking not yet implemented',
  });
});
export default workflow;
File: apps/api/src/index.ts (UPDATE - mount workflow routes)
import workflow from './routes/workflow.js';
app.route('/api/workflow', workflow);
---
5.3 Register Workflow in Mastra
File: apps/mastra-app/src/mastra/index.ts (UPDATE)
import { graphSynthesisPipeline } from '../workflows/graph-synthesis-pipeline.js';
import { edgeConstructorAgent } from '../agents/edge-constructor-agent.js';
export const mastra = new Mastra({
  agents: {
    plannerAgent,
    biologistAgent,
    clinicalScoutAgent,
    hawkAgent,
    librarianAgent,
    gapAnalystAgent,
    verifierAgent,
    queryPlannerAgent,
    evidenceSummarizerAgent,
    edgeConstructorAgent, // NEW
  },
  workflows: {
    researchPipelineWorkflow,
    graphSynthesisPipeline, // NEW
  },
  storage: new InMemoryStore({ id: "entropy-storage" }),
});
File: apps/mastra-app/src/index.ts (UPDATE exports)
export { edgeConstructorAgent, inferEdgesFromCandidates } from './agents/edge-constructor-agent.js';
export { summariseFromGraph } from './agents/synthesis-agent.js';
export { graphSynthesisPipeline } from './workflows/graph-synthesis-pipeline.js';
---
Phase 6: Frontend Integration
6.1 Backend API Clients
File: entropy-research-hub/src/lib/api/workspace.ts (NEW)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';
export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  mode?: 'Researcher' | 'Strategist';
  indiaLens?: boolean;
}
export interface AddNodesRequest {
  nodes: any[];
  queryId?: string;
  inferEdges?: boolean;
}
export async function createWorkspace(data: CreateWorkspaceRequest) {
  const response = await fetch(`${API_BASE}/api/workspace/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to create workspace: ${response.statusText}`);
  }
  return response.json();
}
export async function getWorkspace(workspaceId: string) {
  const response = await fetch(`${API_BASE}/api/workspace/${workspaceId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch workspace: ${response.statusText}`);
  }
  return response.json();
}
export async function getWorkspaceGraph(workspaceId: string) {
  const response = await fetch(`${API_BASE}/api/workspace/${workspaceId}/graph`);
  if (!response.ok) {
    throw new Error(`Failed to fetch graph: ${response.statusText}`);
  }
  return response.json();
}
export async function addNodesToWorkspace(
  workspaceId: string,
  data: AddNodesRequest
) {
  const response = await fetch(`${API_BASE}/api/workspace/${workspaceId}/nodes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to add nodes: ${response.statusText}`);
  }
  return response.json();
}
File: entropy-research-hub/src/lib/api/workflow.ts (NEW)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';
export interface SynthesizeWorkflowRequest {
  workspaceId: string;
  queryText: string;
  mode: 'Researcher' | 'Strategist';
  indiaLens: boolean;
  searchTypes: string[];
  reportSections: string[];
  searchResults: any[];
}
export async function runSynthesisWorkflow(data: SynthesizeWorkflowRequest) {
  const response = await fetch(`${API_BASE}/api/workflow/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Workflow failed: ${response.statusText}`);
  }
  return response.json();
}
File: entropy-research-hub/src/lib/api/synthesis.ts (UPDATE for streaming)
export interface SynthesisStreamCallbacks {
  onSectionStart?: (title: string) => void;
  onSectionChunk?: (title: string, chunk: string) => void;
  onReasoningChunk?: (title: string, reasoning: string) => void;
  onSectionComplete?: (section: any) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}
export async function synthesizeWithStreaming(
  data: any,
  callbacks: SynthesisStreamCallbacks
) {
  const response = await fetch(`${API_BASE}/api/causaly/synthesise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, streaming: true }),
  });
  if (!response.ok || !response.body) {
    throw new Error('Failed to start synthesis stream');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = JSON.parse(line.slice(6));
        const event = line.match(/event: (\w+)/)?.[1];
        if (event === 'section_start' && callbacks.onSectionStart) {
          callbacks.onSectionStart(data.title);
        } else if (event === 'section_chunk' && callbacks.onSectionChunk) {
          callbacks.onSectionChunk(data.title, data.chunk);
        } else if (event === 'reasoning_chunk' && callbacks.onReasoningChunk) {
          callbacks.onReasoningChunk(data.title, data.reasoning);
        } else if (event === 'section_complete' && callbacks.onSectionComplete) {
          callbacks.onSectionComplete(data);
        } else if (event === 'complete' && callbacks.onComplete) {
          callbacks.onComplete(data);
        } else if (event === 'error' && callbacks.onError) {
          callbacks.onError(data.error);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
---
6.2 Update WorkspaceContext
File: entropy-research-hub/src/contexts/WorkspaceContext.tsx (UPDATE)
import { getWorkspace, getWorkspaceGraph, createWorkspace as createWorkspaceAPI } from '../lib/api/workspace';
// Add feature flag
const USE_BACKEND_STORAGE = true; // Hardcoded for demo
// Update loadWorkspace to fetch from backend
async function loadWorkspaceFromBackend(workspaceId: string) {
  const workspace = await getWorkspace(workspaceId);
  const { nodes, edges } = await getWorkspaceGraph(workspaceId);
  
  return {
    ...workspace,
    nodes,
    edges,
  };
}
// Update createWorkspace
async function createWorkspace(data: CreateWorkspaceRequest) {
  if (USE_BACKEND_STORAGE) {
    return createWorkspaceAPI(data);
  } else {
    // Fallback to IndexedDB
    return createWorkspaceLocal(data);
  }
}
// Update context provider to use backend
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function loadWorkspace() {
      if (!currentWorkspaceId) return;
      try {
        if (USE_BACKEND_STORAGE) {
          const ws = await loadWorkspaceFromBackend(currentWorkspaceId);
          setWorkspace(ws);
        } else {
          // Fallback to IndexedDB
          const ws = await loadWorkspaceLocal(currentWorkspaceId);
          setWorkspace(ws);
        }
      } catch (error) {
        console.error('Failed to load workspace:', error);
      } finally {
        setLoading(false);
      }
    }
    loadWorkspace();
  }, [currentWorkspaceId]);
  // ... rest of context
}
---
6.3 Update WorkspaceView for Streaming Synthesis
File: entropy-research-hub/src/pages/WorkspaceView.tsx (UPDATE)
import { synthesizeWithStreaming } from '../lib/api/synthesis';
export function WorkspaceView() {
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({});
  const [reasoningTraces, setReasoningTraces] = useState<Record<string, string>>({});
  async function handleGenerateReport() {
    setStreamingContent({});
    setReasoningTraces({});
    try {
      await synthesizeWithStreaming(
        {
          graphSnapshot: {
            nodes: workspace.nodes,
            edges: workspace.edges,
          },
          personaMode: workspace.mode || 'Researcher',
          reportSections: [],
          indiaLens: workspace.indiaLens || false,
        },
        {
          onSectionStart: (title) => {
            setStreamingContent(prev => ({ ...prev, [title]: '' }));
            setReasoningTraces(prev => ({ ...prev, [title]: '' }));
          },
          onSectionChunk: (title, chunk) => {
            setStreamingContent(prev => ({
              ...prev,
              [title]: (prev[title] || '') + chunk,
            }));
          },
          onReasoningChunk: (title, reasoning) => {
            setReasoningTraces(prev => ({
              ...prev,
              [title]: (prev[title] || '') + reasoning,
            }));
          },
          onSectionComplete: (section) => {
            // Update final section with citations
            updateWorkspaceReport(section);
          },
          onComplete: (result) => {
            console.log('Synthesis complete:', result);
          },
          onError: (error) => {
            console.error('Synthesis error:', error);
          },
        }
      );
    } catch (error) {
      console.error('Failed to synthesize:', error);
    }
  }
  // ... render with streaming content
  return (
    <div>
      {/* Show streaming content in real-time */}
      {Object.entries(streamingContent).map(([title, content]) => (
        <div key={title}>
          <h3>{title}</h3>
          <div>{content}</div>
          {/* Optional: Show reasoning trace */}
          {reasoningTraces[title] && (
            <details>
              <summary>AI Reasoning</summary>
              <pre>{reasoningTraces[title]}</pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
---
Phase 7: Testing, Documentation & Deployment
7.1 Integration Tests
File: apps/api/src/__tests__/integration/full-pipeline.test.ts (NEW)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getGraphRepository } from '../../lib/graph-repository';
import { mastra } from '@entropy/mastra-app/src/mastra/index';
describe('Full Pipeline Integration Test', () => {
  let workspaceId: string;
  beforeAll(async () => {
    const repo = getGraphRepository();
    const workspace = await repo.createWorkspace({
      name: 'Integration Test Workspace',
      mode: 'Researcher',
      indiaLens: false,
    });
    workspaceId = workspace.id;
  });
  it('should execute full graph synthesis pipeline', async () => {
    const mockSearchResults = [
      {
        title: 'CDK4/6 inhibitor study',
        snippet: 'Palbociclib shows efficacy...',
        type: 'paper',
        source: 'PubMed',
      },
      // ... more results
    ];
    const result = await mastra.workflows.graphSynthesisPipeline.execute({
      workspaceId,
      queryText: 'CDK4/6 inhibitors for breast cancer',
      mode: 'Researcher',
      indiaLens: false,
      searchTypes: [],
      reportSections: ['Overview'],
      searchResults: mockSearchResults,
    });
    expect(result.addedNodesCount).toBeGreaterThan(0);
    expect(result.addedEdgesCount).toBeGreaterThan(0);
    expect(result.synthesis.sections).toHaveLength(1);
    expect(result.synthesis.sections[0].citations.length).toBeGreaterThan(0);
  });
  it('should persist nodes and edges in Neo4j', async () => {
    const repo = getGraphRepository();
    const { nodes, edges } = await repo.getWorkspaceGraph(workspaceId);
    expect(nodes.length).toBeGreaterThan(0);
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.some(e => e.inferredBy === 'LLM')).toBe(true);
  });
  afterAll(async () => {
    // Cleanup test workspace
    // TODO: Implement deleteWorkspace in repository
  });
});
---
7.2 Documentation Updates
File: README.md (UPDATE - add setup section)
## Development Setup
### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Nvidia NIM API key
### Neo4j Setup
1. Start Neo4j container:
   ```bash
   docker-compose -f docker-compose.neo4j.yml up -d
2. Access Neo4j Browser at http://localhost:7474
   - Username: neo4j
   - Password: entropy-dev-password
3. Verify connection:
      docker-compose -f docker-compose.neo4j.yml ps
   
Environment Configuration
Copy .env.example to .env and configure:
# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=entropy-dev-password
# Nvidia NIM
NVIDIA_API_KEY=your_nvidia_api_key
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
# Rate Limits (adjust based on your NIM tier)
NVIDIA_RATE_LIMIT_RPM=60
NVIDIA_RATE_LIMIT_TPM=100000
NVIDIA_RATE_LIMIT_CONCURRENT=5
# Agent Configuration
SYNTHESIS_AGENT_TEMPERATURE=0.8
SYNTHESIS_AGENT_MAX_TOKENS=3000
EDGE_AGENT_TEMPERATURE=0.4
EDGE_AGENT_MAX_TOKENS=500
Running the Application
# Install dependencies
pnpm install
# Start backend API
cd apps/api && pnpm dev
# Start frontend (in another terminal)
cd entropy-research-hub && npm run dev
# Run tests
pnpm test
Resetting Neo4j Database
docker-compose -f docker-compose.neo4j.yml down -v
docker-compose -f docker-compose.neo4j.yml up -d
---
**File: `docs/ARCHITECTURE.md`** (NEW)
```markdown
# Entropy v2 Architecture
## System Overview
Entropy v2 is a graph-powered research intelligence platform that combines:
- Knowledge graph storage (Neo4j)
- LLM-powered edge inference (nvidia NIM)
- Deep synthesis with streaming (nvidia NIM)
- Multi-agent workflow orchestration (Mastra)
## Architecture Diagram
┌─────────────┐
│   Frontend  │
│   (React)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│  API Layer  │◄────►│  Mastra App  │
│   (Hono)    │      │   (Agents)   │
└──────┬──────┘      └──────┬───────┘
       │                    │
       ▼                    ▼
┌─────────────┐      ┌──────────────┐
│   Neo4j     │      │  Nvidia NIM  │
│  (Graph DB) │      │  (LLM API)   │
└─────────────┘      └──────────────┘
## Data Flow
### 1. Query Submission
1. User submits query in frontend
2. Frontend calls `/api/workflow/synthesize`
3. Workflow orchestrates: search → score → add nodes → infer edges → synthesize
### 2. Node Addition
1. Search results transformed to GraphNode format
2. Nodes persisted to Neo4j via `graph-repository`
3. Heuristic candidates selected for edge inference
4. LLM infers edges with confidence scores
5. Edges persisted to Neo4j with reasoning traces
### 3. Synthesis (Streaming)
1. Fetch full workspace graph from Neo4j
2. **Step 1**: LLM analyzes graph structure (central nodes, clusters, patterns)
3. **Step 2**: LLM identifies domain patterns (mechanisms, trials, IP landscape)
4. **Step 3**: LLM synthesizes each section with citations
5. Stream output to frontend via SSE
6. Extract citations and map to node IDs
## Key Components
### Backend (`apps/api`)
- **neo4j-client.ts**: Connection management
- **graph-repository.ts**: CRUD operations on graph
- **routes/workspace.ts**: Workspace + node/edge endpoints
- **routes/workflow.ts**: Workflow orchestration endpoint
### Mastra App (`apps/mastra-app`)
- **nvidia-nim-provider.ts**: LLM provider abstraction
- **rate-limiter.ts**: Token bucket rate limiting
- **edge-heuristics.ts**: Fast candidate selection
- **agents/edge-constructor-agent.ts**: LLM edge inference
- **agents/synthesis-agent.ts**: Deep multi-step synthesis
- **workflows/graph-synthesis-pipeline.ts**: Full orchestration
### Frontend (`entropy-research-hub`)
- **api/workspace.ts**: Backend API client
- **api/workflow.ts**: Workflow trigger client
- **api/synthesis.ts**: Streaming synthesis client
- **WorkspaceContext.tsx**: State management (backend-powered)
- **WorkspaceView.tsx**: Real-time streaming UI
## Neo4j Schema
### Node Labels
- `:Workspace` - User workspaces
- `:Query` - Search queries
- `:GraphNode` - Knowledge graph entities (genes, drugs, papers, etc.)
### Relationships
- `(:Workspace)-[:CONTAINS]->(:GraphNode)`
- `(:Workspace)-[:HAS_QUERY]->(:Query)`
- `(:Query)-[:CONTRIBUTED]->(:GraphNode)`
- `(:GraphNode)-[:RELATES_TO {type, confidence, inferredBy, reasoning}]->(:GraphNode)`
## Rate Limiting Strategy
- **Token Bucket Algorithm** with 3 dimensions:
  - Requests per minute (RPM)
  - Tokens per minute (TPM)
  - Concurrent requests
- **Configurable per environment**:
  ```bash
  NVIDIA_RATE_LIMIT_RPM=60
  NVIDIA_RATE_LIMIT_TPM=100000
  NVIDIA_RATE_LIMIT_CONCURRENT=5
- Fail-fast policy: No fallback to Gemini if nvidia NIM fails
Performance Targets
- Add nodes (5-10 nodes): 2-3s (including edge inference)
- Add nodes (20+ nodes): 5-7s
- Synthesis (3 sections): 90-120s (30-40s per section with streaming)
- Graph query (1000 nodes): <500ms from Neo4j
Testing Strategy
- Unit tests: All agents, heuristics, repository methods
- Integration tests: Full pipeline workflows
- TDD workflow: Red → Green → Refactor (per CLAUDE.md)
- Minimum coverage: Happy path, validation, error path, edge case per change
---
**File: `amd-docs/IMPLEMENTATION.md`** (UPDATE)
```markdown
# Implementation Status
## ✅ Completed
### Query-First Workspace Restructure
- [x] Query contribution tracking (nodes + edges)
- [x] Helpfulness scoring with graph context
- [x] Onboarding flow
### Backend Graph Storage
- [x] Neo4j Docker setup
- [x] Neo4j client + connection management
- [x] Graph repository (CRUD operations)
- [x] Workspace API endpoints
- [x] Schema initialization
### LLM Integration
- [x] Nvidia NIM provider integration
- [x] Rate limiting middleware
- [x] Agent-specific model configurations
### Edge Construction
- [x] Heuristic candidate selection
- [x] LLM-powered edge inference agent
- [x] Integration into add-nodes flow
- [x] Edge persistence in Neo4j
### Deep Synthesis
- [x] Multi-step reasoning (graph analysis → patterns → sections)
- [x] Streaming synthesis with SSE
- [x] Reasoning trace capture (nvidia NIM)
- [x] Citation extraction and mapping
- [x] Persona-specific templates (Researcher vs Strategist)
- [x] India Lens filtering
### Workflow Orchestration
- [x] Full pipeline workflow (search → score → add → edges → synthesize)
- [x] Workflow API endpoint
- [x] Mastra integration
### Frontend Integration
- [x] Backend API clients (workspace, workflow, synthesis)
- [x] WorkspaceContext backend migration
- [x] Streaming synthesis UI
- [x] Reasoning trace display (optional)
## 🔄 In Progress
None - implementation complete
## 📋 Pending
### Rate Limit Tuning
- [ ] Update rate limits after nvidia NIM tier confirmation
- [ ] Add burst handling if needed
- [ ] Monitor token usage in production
### Production Hardening
- [ ] Neo4j production deployment (Neo4j Aura or managed instance)
- [ ] Error recovery strategies
- [ ] Monitoring and observability
- [ ] Load testing with realistic graph sizes
### Future Enhancements
- [ ] Edge confidence thresholds (user-configurable)
- [ ] Manual edge creation/deletion
- [ ] Graph visualization improvements (edge labels, reasoning tooltips)
- [ ] Export graph to formats (GraphML, CSV)
- [ ] Workspace sharing and collaboration
---
### **7.3 Final Checklist Before Execution**
**Before starting implementation, verify:**
- [ ] Neo4j Docker container running and accessible
- [ ] `NVIDIA_API_KEY` configured in `.env`
- [ ] All package dependencies installable (`pnpm install`)
- [ ] Existing tests passing (`pnpm test`)
- [ ] Rate limit placeholders acceptable (will tune later)
- [ ] TDD workflow understood (write tests first per CLAUDE.md)
**Execution order:**
1. Phase 1: Infrastructure (Neo4j + nvidia NIM provider) - **~3 hours**
2. Phase 2: Graph repository + API endpoints - **~3 hours**
3. Phase 3: Edge construction (heuristics + LLM agent) - **~3 hours**
4. Phase 4: Deep synthesis agent with streaming - **~4 hours**
5. Phase 5: Full pipeline workflow - **~3 hours**
6. Phase 6: Frontend integration - **~2 hours**
7. Phase 7: Integration tests + documentation - **~2 hours**
**Total estimated time: ~20 hours**
---
Summary
This plan delivers a complete backend-powered graph synthesis system:
✅ Neo4j graph storage (local Docker, fresh start)  
✅ Real-time edge inference on every add-nodes (2-5s latency)  
✅ Deep LLM synthesis with streaming (nvidia NIM gpt-oss-120b)  
✅ Reasoning traces displayed in UI (nvidia NIM reasoning_content)  
✅ Rate limiting (configurable, fail-fast)  
✅ Full pipeline workflow (search → score → add → edges → synthesize)  
✅ Frontend migration (backend-first, IndexedDB fallback removed)  
✅ Comprehensive tests (TDD per CLAUDE.md)  
Ready to execute? Let me know if you need any clarifications or adjustments to the plan!
