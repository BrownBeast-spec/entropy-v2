import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Workspace, WorkspaceMode, GraphNode, GraphEdge, Query, SavedItem } from "@/types/workspace";
import { workspaceStorage } from "@/lib/storage/workspaceStorage";
import { workspaceStoreV2 } from "@/lib/storage/workspaceStoreV2";

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
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const WorkspaceActionsContext = createContext<WorkspaceActionsContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  const normalizeWorkspace = (ws: any): Workspace => ({
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
    queries: ws.queries ?? [],
    savedItems: ws.savedItems ?? [],
  });

  const denormalizeNode = (node: GraphNode) => ({
    id: node.id,
    type: node.type,
    label: node.label,
    data: node.metadata ?? {},
    provenance: [
      {
        source: node.source,
        query: node.addedByQuery,
        timestamp: new Date().toISOString(),
      },
    ],
    indiaContext: node.indiaRelevant ? { isCDSCO: true } : undefined,
  });

  const denormalizeEdge = (edge: GraphEdge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    confidence: edge.confidence,
    evidenceTypes: [],
    provenance: [],
  });

  const loadFromStore = async () => {
    try {
      const loaded = await workspaceStoreV2.getAll();
      const normalized = loaded.map(normalizeWorkspace);
      setWorkspaces(normalized);
    } catch {
      const loaded = workspaceStorage.getAll();
      setWorkspaces(loaded);
    }
  };

  // Load workspaces from storage on mount
  useEffect(() => {
    loadFromStore();
  }, []);

  // Sync current workspace when it changes
  useEffect(() => {
    const syncCurrent = async () => {
      if (!currentWorkspace) return;
      try {
        const fresh = await workspaceStoreV2.getById(currentWorkspace.id);
        if (!fresh) return;
        const normalized = normalizeWorkspace(fresh);
        if (JSON.stringify(normalized) !== JSON.stringify(currentWorkspace)) {
          setCurrentWorkspace(normalized);
        }
      } catch {
        const fresh = workspaceStorage.getById(currentWorkspace.id);
        if (fresh && JSON.stringify(fresh) !== JSON.stringify(currentWorkspace)) {
          setCurrentWorkspace(fresh);
        }
      }
    };

    syncCurrent();
  }, [workspaces]);

  const refreshWorkspaces = async () => {
    await loadFromStore();
  };

  const createWorkspace = async (
    name: string,
    description: string,
    mode: WorkspaceMode,
  ): Promise<Workspace> => {
    try {
      const created = await workspaceStoreV2.createWorkspace(name, description, mode);
      const normalized = normalizeWorkspace(created);
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
        queries: [],
        savedItems: [],
      };
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
