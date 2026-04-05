import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Workspace, WorkspaceMode, GraphNode, GraphEdge, Query, SavedItem } from "@/types/workspace";
import { workspaceStorage } from "@/lib/storage/workspaceStorage";
import { workspaceStoreV2 } from "@/lib/storage/workspaceStoreV2";
import { createDemoWorkspaceSeed } from "@/lib/data/demoWorkspaceSeed";
import {
  createWorkspace as createWorkspaceApi,
  getWorkspace as getWorkspaceApi,
  getWorkspaceGraph as getWorkspaceGraphApi,
  getWorkspaceQueries as getWorkspaceQueriesApi,
} from "@/lib/api/workspace";

export interface WorkspaceGraphSnapshot {
  nodeIds: string[];
  edgeSummary: Array<{ id: string; source: string; target: string; type: string }>;
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  refreshWorkspaces: () => void;
}

interface WorkspaceActionsContextValue {
  createWorkspace: (name: string, description: string, mode: WorkspaceMode) => Promise<Workspace>;
  updateWorkspace: (workspace: Workspace) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  addNode: (node: GraphNode) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: GraphEdge) => void;
  removeEdge: (edgeId: string) => void;
  addQuery: (query: Query) => void;
  updateQuery: (query: Query) => void;
  toggleSavedItem: (nodeId: string) => void;
  getGraphSnapshot: () => WorkspaceGraphSnapshot;
  resetToDemoState: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const WorkspaceActionsContext = createContext<WorkspaceActionsContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  const normalizeWorkspace = (ws: any): Workspace => {
    const normalizedQueries = (() => {
      const queries = (ws.queries ?? []).map((q: any) => ({
        ...q,
        submittedAt: q.submittedAt ? new Date(q.submittedAt) : new Date(),
        timelineStart: q.timelineStart ? new Date(q.timelineStart) : undefined,
        timelineEnd: q.timelineEnd ? new Date(q.timelineEnd) : undefined,
        report: q.report
          ? {
              ...q.report,
              generatedAt: new Date(q.report.generatedAt),
            }
          : undefined,
      }));

      if (queries.length === 0 && ws.report) {
        return [
          {
            id: `query_${Date.now()}`,
            workspaceId: ws.id,
            text: "Migrated query session",
            mode: ws.mode ?? "Researcher",
            indiaLens: ws.indiaLens ?? false,
            submittedAt: ws.updatedAt ? new Date(ws.updatedAt) : new Date(),
            status: "complete" as const,
            contributedNodes: [],
            contributedEdges: [],
            report: {
              ...ws.report,
              generatedAt: new Date(ws.report.generatedAt),
            },
          },
        ];
      }

      if (queries.length > 0 && ws.report && !queries[0].report) {
        queries[0] = {
          ...queries[0],
          report: {
            ...ws.report,
            generatedAt: new Date(ws.report.generatedAt),
          },
        };
      }

      return queries;
    })();

    return {
      ...ws,
      nodes: (ws.nodes ?? []).map((n: any) => ({
      id: n.id,
      label: n.label,
      type: n.type,
      source: n.source ?? "Open Targets",
      metadata: n.metadata ?? n.data ?? {},
      evidenceScore: n.evidenceScore,
      addedByQuery: n.addedByQuery ?? n.provenance?.[0]?.query ?? "initial",
      indiaRelevant:
        n.indiaRelevant ??
        Boolean(
          n.indiaContext?.isCDSCO ||
            n.indiaContext?.isNPPA ||
            n.indiaContext?.isIndianPatent ||
            n.indiaContext?.isIndianSponsor,
        ),
    })),
    edges: (ws.edges ?? []).map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      confidence: e.confidence,
      metadata: e.metadata ?? {},
    })),
    queries: normalizedQueries,
    activeQueryId: ws.activeQueryId ?? normalizedQueries[0]?.id,
    savedItems: (ws.savedItems ?? []).map((item: any) => ({
      ...item,
      savedAt: item.savedAt ? new Date(item.savedAt) : new Date(),
    })),
  };
  };

  const denormalizeNode = (node: GraphNode) => ({
    id: node.id,
    type: node.type,
    label: node.label,
    source: node.source,
    metadata: node.metadata ?? {},
    evidenceScore: node.evidenceScore,
    addedByQuery: node.addedByQuery,
    indiaRelevant: node.indiaRelevant,
    data: node.metadata ?? {},
    provenance: [
      {
        source: node.source,
        query: node.addedByQuery,
        timestamp: new Date().toISOString(),
      },
    ],
    indiaContext:
      (node.metadata as any)?.indiaContext ??
      (node.indiaRelevant ? { isCDSCO: true } : undefined),
  });

  const denormalizeEdge = (edge: GraphEdge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    confidence: edge.confidence,
    metadata: edge.metadata ?? {},
    evidenceTypes: [],
    provenance: [],
  });

  const persistDemoWorkspaceV2 = async (): Promise<Workspace> => {
    const demoWorkspace = createDemoWorkspaceSeed();
    await workspaceStoreV2.saveWorkspace({
      ...demoWorkspace,
      nodes: demoWorkspace.nodes.map(denormalizeNode as any),
      edges: demoWorkspace.edges.map(denormalizeEdge as any),
    } as any);
    return demoWorkspace;
  };

  const persistDemoWorkspaceLegacy = (): Workspace => {
    const demoWorkspace = createDemoWorkspaceSeed();
    workspaceStorage.save(demoWorkspace);
    return demoWorkspace;
  };

  const loadFromStore = async () => {
    try {
      const loaded = await workspaceStoreV2.getAll();
      if (loaded.length === 0) {
        const seeded = await persistDemoWorkspaceV2();
        setWorkspaces([seeded]);
        return;
      }

      const normalized = loaded.map(normalizeWorkspace);
      setWorkspaces(normalized);
    } catch {
      const loaded = workspaceStorage.getAll();
      if (loaded.length === 0) {
        const seeded = persistDemoWorkspaceLegacy();
        setWorkspaces([seeded]);
        return;
      }

      setWorkspaces(loaded.map(normalizeWorkspace));
    }
  };

  // Load workspaces from storage on mount
  useEffect(() => {
    loadFromStore();
  }, []);

  const hydrateWorkspaceFromBackend = async (
    workspace: Workspace,
  ): Promise<Workspace | null> => {
    try {
      const [workspaceMeta, workspaceGraph] = await Promise.all([
        getWorkspaceApi(workspace.id),
        getWorkspaceGraphApi(workspace.id),
      ]);

      if (workspaceMeta.data.id !== workspace.id) {
        return null;
      }

      let hydratedQueries: Query[] = workspace.queries;
      try {
        const workspaceQueries = await getWorkspaceQueriesApi(workspace.id);
        hydratedQueries = workspaceQueries.data.queries.map((query) => ({
          id: query.id,
          workspaceId: query.workspaceId,
          text: query.text,
          mode: query.mode,
          indiaLens: query.indiaLens,
          submittedAt: new Date(query.submittedAt),
          status: query.status,
          contributedNodes: query.contributedNodes ?? [],
          contributedEdges: query.contributedEdges ?? [],
          completenessScore: query.completenessScore,
          iterations: query.iterations,
        }));
      } catch {
        hydratedQueries = workspace.queries;
      }

      const activeQueryId =
        hydratedQueries.find((query) => query.id === workspace.activeQueryId)
          ?.id ?? hydratedQueries[0]?.id;

      const hydrated = normalizeWorkspace({
        id: workspaceMeta.data.id,
        name: workspaceMeta.data.name,
        description: workspaceMeta.data.description,
        mode: workspaceMeta.data.mode,
        indiaLens: workspaceMeta.data.indiaLens,
        createdAt: workspaceMeta.data.createdAt,
        updatedAt: workspaceMeta.data.updatedAt ?? workspaceMeta.data.createdAt,
        nodes: workspaceGraph.data.nodes,
        edges: workspaceGraph.data.edges,
        queries: hydratedQueries,
        activeQueryId,
        savedItems: workspace.savedItems,
        report: workspace.report,
      });

      await workspaceStoreV2.saveWorkspace({
        ...hydrated,
        nodes: hydrated.nodes.map(denormalizeNode as any),
        edges: hydrated.edges.map(denormalizeEdge as any),
      } as any);

      return hydrated;
    } catch {
      return null;
    }
  };

  // Sync current workspace when local or backend state changes
  useEffect(() => {
    const syncCurrent = async () => {
      if (!currentWorkspace) return;

      const hydrated = await hydrateWorkspaceFromBackend(currentWorkspace);
      if (hydrated) {
        if (JSON.stringify(hydrated) !== JSON.stringify(currentWorkspace)) {
          setCurrentWorkspace(hydrated);
        }
        return;
      }

      try {
        const fresh = await workspaceStoreV2.getById(currentWorkspace.id);
        if (!fresh) return;
        const normalized = normalizeWorkspace(fresh);
        if (JSON.stringify(normalized) !== JSON.stringify(currentWorkspace)) {
          setCurrentWorkspace(normalized);
        }
      } catch {
        const fresh = workspaceStorage.getById(currentWorkspace.id);
        if (fresh) {
          const normalized = normalizeWorkspace(fresh);
          if (JSON.stringify(normalized) !== JSON.stringify(currentWorkspace)) {
            setCurrentWorkspace(normalized);
          }
        }
      }
    };

    syncCurrent();
  }, [currentWorkspace, workspaces]);

  const refreshWorkspaces = async () => {
    await loadFromStore();
  };

  const createWorkspace = async (
    name: string,
    description: string,
    mode: WorkspaceMode,
  ): Promise<Workspace> => {
    try {
      const created = await createWorkspaceApi({
        name,
        description,
        mode,
      });

      const workspaceId = created.data.id;
      if (!workspaceId) {
        throw new Error("Backend workspace creation did not return an id");
      }

      const [workspaceMeta, workspaceGraph] = await Promise.all([
        getWorkspaceApi(workspaceId),
        getWorkspaceGraphApi(workspaceId),
      ]);

      const workspaceQueries = await getWorkspaceQueriesApi(workspaceId).catch(
        () => ({ success: true, data: { queries: [] as Query[] } }),
      );

      const normalized = normalizeWorkspace({
        id: workspaceMeta.data.id,
        name: workspaceMeta.data.name,
        description: workspaceMeta.data.description,
        mode: workspaceMeta.data.mode,
        indiaLens: workspaceMeta.data.indiaLens,
        createdAt: workspaceMeta.data.createdAt,
        updatedAt: workspaceMeta.data.updatedAt ?? workspaceMeta.data.createdAt,
        nodes: workspaceGraph.data.nodes,
        edges: workspaceGraph.data.edges,
        queries: workspaceQueries.data.queries,
        savedItems: [],
      });

      await workspaceStoreV2.saveWorkspace({
        ...normalized,
        nodes: normalized.nodes.map(denormalizeNode as any),
        edges: normalized.edges.map(denormalizeEdge as any),
      } as any);

      await refreshWorkspaces();
      return normalized;
    } catch {
      const workspace: Workspace = {
        id: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name,
        description,
        mode,
        indiaLens: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        nodes: [],
        edges: [],
        queries: [
          {
            id: `query_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            workspaceId: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            text: "Initial query",
            mode,
            indiaLens: false,
            submittedAt: new Date(),
            status: "pending",
            contributedNodes: [],
            contributedEdges: [],
          },
        ],
        activeQueryId: undefined,
        savedItems: [],
      };

      workspace.activeQueryId = workspace.queries[0].id;
      workspace.queries[0].workspaceId = workspace.id;
      workspaceStorage.save(workspace);
      await refreshWorkspaces();
      return workspace;
    }
  };

  const updateWorkspace = async (workspace: Workspace): Promise<void> => {
    try {
      await workspaceStoreV2.saveWorkspace({
        ...workspace,
        nodes: workspace.nodes.map(denormalizeNode as any),
        edges: workspace.edges.map(denormalizeEdge as any),
      } as any);
    } catch {
      workspaceStorage.save(workspace);
    }

    await refreshWorkspaces();
    if (currentWorkspace?.id === workspace.id) {
      setCurrentWorkspace(workspace);
    }
  };

  const deleteWorkspace = async (id: string): Promise<void> => {
    try {
      await workspaceStoreV2.deleteWorkspace(id);
    } catch {
      workspaceStorage.delete(id);
    }

    await refreshWorkspaces();
    if (currentWorkspace?.id === id) {
      setCurrentWorkspace(null);
    }
  };

  const addNode = (node: GraphNode) => {
    if (!currentWorkspace) return;
    const updated = {
      ...currentWorkspace,
      nodes: [...currentWorkspace.nodes, node],
    };
    void updateWorkspace(updated);
  };

  const removeNode = (nodeId: string) => {
    if (!currentWorkspace) return;
    const updated = {
      ...currentWorkspace,
      nodes: currentWorkspace.nodes.filter((n) => n.id !== nodeId),
      edges: currentWorkspace.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    };
    void updateWorkspace(updated);
  };

  const addEdge = (edge: GraphEdge) => {
    if (!currentWorkspace) return;
    const updated = {
      ...currentWorkspace,
      edges: [...currentWorkspace.edges, edge],
    };
    void updateWorkspace(updated);
  };

  const removeEdge = (edgeId: string) => {
    if (!currentWorkspace) return;
    const updated = {
      ...currentWorkspace,
      edges: currentWorkspace.edges.filter((e) => e.id !== edgeId),
    };
    void updateWorkspace(updated);
  };

  const addQuery = (query: Query) => {
    if (!currentWorkspace) return;
    const updated = {
      ...currentWorkspace,
      queries: [...currentWorkspace.queries, query],
      activeQueryId: query.id,
    };
    void updateWorkspace(updated);
  };

  const updateQuery = (query: Query) => {
    if (!currentWorkspace) return;
    const updated = {
      ...currentWorkspace,
      queries: currentWorkspace.queries.map((q) => (q.id === query.id ? query : q)),
    };
    void updateWorkspace(updated);
  };

  const toggleSavedItem = (nodeId: string) => {
    if (!currentWorkspace) return;
    const existing = currentWorkspace.savedItems.find((item) => item.nodeId === nodeId);
    
    const updated = existing
      ? {
          ...currentWorkspace,
          savedItems: currentWorkspace.savedItems.filter((item) => item.nodeId !== nodeId),
        }
      : {
          ...currentWorkspace,
          savedItems: [
            ...currentWorkspace.savedItems,
            {
              id: `si_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              nodeId,
              workspaceId: currentWorkspace.id,
              savedAt: new Date(),
            },
          ],
        };
    
    void updateWorkspace(updated);
  };

  const getGraphSnapshot = (): WorkspaceGraphSnapshot => {
    if (!currentWorkspace) {
      return { nodeIds: [], edgeSummary: [] };
    }

    return {
      nodeIds: currentWorkspace.nodes.map((n) => n.id),
      edgeSummary: currentWorkspace.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
      })),
    };
  };

  const resetToDemoState = async (): Promise<void> => {
    let seeded: Workspace | null = null;

    try {
      await workspaceStoreV2.clear();
      seeded = await persistDemoWorkspaceV2();
    } catch {
      seeded = null;
    }

    try {
      workspaceStorage.clear();
    } catch {
      // No-op
    }

    if (!seeded) {
      seeded = persistDemoWorkspaceLegacy();
    }

    setWorkspaces([seeded]);
    setCurrentWorkspace(seeded);
  };

  const contextValue: WorkspaceContextValue = {
    workspaces,
    currentWorkspace,
    setCurrentWorkspace,
    refreshWorkspaces,
  };

  const actionsValue: WorkspaceActionsContextValue = {
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    addNode,
    removeNode,
    addEdge,
    removeEdge,
    addQuery,
    updateQuery,
    toggleSavedItem,
    getGraphSnapshot,
    resetToDemoState,
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
      <WorkspaceActionsContext.Provider value={actionsValue}>
        {children}
      </WorkspaceActionsContext.Provider>
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}

export function useWorkspaceActions() {
  const context = useContext(WorkspaceActionsContext);
  if (!context) {
    throw new Error("useWorkspaceActions must be used within WorkspaceProvider");
  }
  return context;
}
