import { get, set, del } from "idb-keyval";
import { Workspace, WorkspaceMode } from "@/types/workspace";

export interface WorkspaceProvenance {
  source: string;
  query: string;
  timestamp: string;
  rawResponseHash?: string;
}

export interface WorkspaceNode {
  id: string;
  type: string;
  label: string;
  data: Record<string, unknown>;
  provenance: WorkspaceProvenance[];
  indiaContext?: {
    isCDSCO?: boolean;
    isNPPA?: boolean;
    isIndianPatent?: boolean;
    isIndianSponsor?: boolean;
    nppaPrice?: number;
  };
}

export interface WorkspaceEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  confidence?: number;
  evidenceTypes?: string[];
  provenance?: WorkspaceProvenance[];
}

type WorkspaceV2 = Omit<Workspace, "nodes" | "edges"> & {
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
};

const STORAGE_KEY = "entropy-workspace-v2";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function reviveWorkspaceDates(ws: WorkspaceV2): WorkspaceV2 {
  const revivedReport = ws.report
    ? {
        ...ws.report,
        generatedAt: new Date(ws.report.generatedAt),
      }
    : undefined;

  const revivedQueries = (ws.queries ?? []).map((q) => ({
    ...q,
    submittedAt: new Date(q.submittedAt),
    timelineStart: q.timelineStart ? new Date(q.timelineStart) : undefined,
    timelineEnd: q.timelineEnd ? new Date(q.timelineEnd) : undefined,
    report: q.report
      ? {
          ...q.report,
          generatedAt: new Date(q.report.generatedAt),
        }
      : undefined,
  }));

  const hasQueries = revivedQueries.length > 0;
  const activeQueryId = ws.activeQueryId ?? revivedQueries[0]?.id;

  const migratedQueries = hasQueries
    ? revivedQueries.map((query, idx) => {
        if (idx !== 0 || query.report || !revivedReport) {
          return query;
        }

        return {
          ...query,
          report: revivedReport,
        };
      })
    : revivedReport
      ? [
          {
            id: makeId("query"),
            workspaceId: ws.id,
            text: "Migrated query session",
            mode: ws.mode ?? "Researcher",
            indiaLens: ws.indiaLens ?? false,
            submittedAt: new Date(ws.updatedAt),
            status: "complete" as const,
            contributedNodes: [],
            contributedEdges: [],
            report: revivedReport,
          },
        ]
      : revivedQueries;

  return {
    ...ws,
    createdAt: new Date(ws.createdAt),
    updatedAt: new Date(ws.updatedAt),
    queries: migratedQueries,
    activeQueryId: activeQueryId ?? migratedQueries[0]?.id,
    savedItems: (ws.savedItems ?? []).map((item) => ({
      ...item,
      savedAt: new Date(item.savedAt),
    })),
    report: revivedReport,
  };
}

function mergeNode(existing: WorkspaceNode, incoming: WorkspaceNode): WorkspaceNode {
  return {
    ...existing,
    ...incoming,
    data: {
      ...existing.data,
      ...incoming.data,
    },
    provenance: [...(existing.provenance ?? []), ...(incoming.provenance ?? [])],
    indiaContext: {
      ...(existing.indiaContext ?? {}),
      ...(incoming.indiaContext ?? {}),
    },
  };
}

async function loadAll(): Promise<WorkspaceV2[]> {
  const raw = await get<WorkspaceV2[] | undefined>(STORAGE_KEY);
  if (!raw) return [];
  return raw.map((ws) => reviveWorkspaceDates(ws));
}

async function saveAll(workspaces: WorkspaceV2[]): Promise<void> {
  await set(STORAGE_KEY, clone(workspaces));
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const workspaceStoreV2 = {
  async getAll(): Promise<WorkspaceV2[]> {
    return loadAll();
  },

  async getById(id: string): Promise<WorkspaceV2 | null> {
    const all = await loadAll();
    return all.find((ws) => ws.id === id) ?? null;
  },

  async createWorkspace(
    name: string,
    description: string,
    mode: WorkspaceMode,
  ): Promise<WorkspaceV2> {
    const now = new Date();
    const workspace: WorkspaceV2 = {
      id: makeId("ws"),
      name,
      description,
      mode,
      indiaLens: false,
      createdAt: now,
      updatedAt: now,
      nodes: [],
      edges: [],
      queries: [],
      savedItems: [],
    };

    const all = await loadAll();
    all.push(workspace);
    await saveAll(all);
    return workspace;
  },

  async saveWorkspace(workspace: WorkspaceV2): Promise<void> {
    const all = await loadAll();
    const idx = all.findIndex((ws) => ws.id === workspace.id);
    const updated = {
      ...workspace,
      updatedAt: new Date(),
    };

    if (idx >= 0) {
      all[idx] = updated;
    } else {
      all.push(updated);
    }

    await saveAll(all);
  },

  async deleteWorkspace(id: string): Promise<void> {
    const all = await loadAll();
    await saveAll(all.filter((ws) => ws.id !== id));
  },

  async augmentGraph(
    workspaceId: string,
    query: string,
    newNodes: WorkspaceNode[],
    newEdges: WorkspaceEdge[],
  ): Promise<WorkspaceV2 | null> {
    const all = await loadAll();
    const idx = all.findIndex((ws) => ws.id === workspaceId);
    if (idx < 0) return null;

    const workspace = all[idx];
    const byNodeId = new Map(workspace.nodes.map((node) => [node.id, node]));

    for (const node of newNodes) {
      const existing = byNodeId.get(node.id);
      if (!existing) {
        byNodeId.set(node.id, node);
      } else {
        byNodeId.set(node.id, mergeNode(existing, node));
      }
    }

    const byEdgeId = new Map(workspace.edges.map((edge) => [edge.id, edge]));
    for (const edge of newEdges) {
      if (!byEdgeId.has(edge.id)) {
        byEdgeId.set(edge.id, edge);
      }
    }

    const next = {
      ...workspace,
      nodes: Array.from(byNodeId.values()),
      edges: Array.from(byEdgeId.values()),
      queries: [
        ...workspace.queries,
        {
          id: makeId("query"),
          workspaceId,
          text: query,
          mode: workspace.mode,
          indiaLens: workspace.indiaLens,
          submittedAt: new Date(),
          status: "complete" as const,
          contributedNodes: newNodes.map((n) => n.id),
          contributedEdges: newEdges.map((e) => e.id),
        },
      ],
      updatedAt: new Date(),
    };

    all[idx] = next;
    await saveAll(all);
    return next;
  },

  async removeNode(workspaceId: string, nodeId: string): Promise<WorkspaceV2 | null> {
    const all = await loadAll();
    const idx = all.findIndex((ws) => ws.id === workspaceId);
    if (idx < 0) return null;

    const ws = all[idx];
    const next = {
      ...ws,
      nodes: ws.nodes.filter((n) => n.id !== nodeId),
      edges: ws.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      updatedAt: new Date(),
    };

    all[idx] = next;
    await saveAll(all);
    return next;
  },

  async exportWorkspaceJSON(workspaceId: string): Promise<WorkspaceV2 | null> {
    const ws = await this.getById(workspaceId);
    if (!ws) return null;
    return clone(ws);
  },

  async getGraphSnapshot(workspaceId: string): Promise<{
    nodeIds: string[];
    edgeSummary: Array<{ id: string; source: string; target: string; type: string }>;
  }> {
    const ws = await this.getById(workspaceId);
    if (!ws) {
      return { nodeIds: [], edgeSummary: [] };
    }

    return {
      nodeIds: ws.nodes.map((n) => n.id),
      edgeSummary: ws.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
      })),
    };
  },

  async clear(): Promise<void> {
    await del(STORAGE_KEY);
  },
};

export type { WorkspaceV2 };
