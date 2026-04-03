import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Workspace, WorkspaceMode, GraphNode, GraphEdge, Query, SavedItem } from "@/types/workspace";
import { workspaceStorage } from "@/lib/storage/workspaceStorage";

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
  createWorkspace: (name: string, description: string, mode: WorkspaceMode) => Workspace;
  updateWorkspace: (workspace: Workspace) => void;
  deleteWorkspace: (id: string) => void;
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

  // Load workspaces from storage on mount
  useEffect(() => {
    const loaded = workspaceStorage.getAll();
    setWorkspaces(loaded);
  }, []);

  // Sync current workspace when it changes
  useEffect(() => {
    if (currentWorkspace) {
      const fresh = workspaceStorage.getById(currentWorkspace.id);
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(currentWorkspace)) {
        setCurrentWorkspace(fresh);
      }
    }
  }, [workspaces]);

  const refreshWorkspaces = () => {
    setWorkspaces(workspaceStorage.getAll());
  };

  const createWorkspace = (name: string, description: string, mode: WorkspaceMode): Workspace => {
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
    refreshWorkspaces();
    return workspace;
  };

  const updateWorkspace = (workspace: Workspace) => {
    workspaceStorage.save(workspace);
    refreshWorkspaces();
    if (currentWorkspace?.id === workspace.id) {
      setCurrentWorkspace(workspace);
    }
  };

  const deleteWorkspace = (id: string) => {
    workspaceStorage.delete(id);
    refreshWorkspaces();
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
    updateWorkspace(updated);
  };

  const removeNode = (nodeId: string) => {
    if (!currentWorkspace) return;
    const updated = {
      ...currentWorkspace,
      nodes: currentWorkspace.nodes.filter((n) => n.id !== nodeId),
      edges: currentWorkspace.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    };
    updateWorkspace(updated);
  };

  const addEdge = (edge: GraphEdge) => {
    if (!currentWorkspace) return;
    const updated = {
      ...currentWorkspace,
      edges: [...currentWorkspace.edges, edge],
    };
    updateWorkspace(updated);
  };

  const removeEdge = (edgeId: string) => {
    if (!currentWorkspace) return;
    const updated = {
      ...currentWorkspace,
      edges: currentWorkspace.edges.filter((e) => e.id !== edgeId),
    };
    updateWorkspace(updated);
  };

  const addQuery = (query: Query) => {
    if (!currentWorkspace) return;
    const updated = {
      ...currentWorkspace,
      queries: [...currentWorkspace.queries, query],
    };
    updateWorkspace(updated);
  };

  const updateQuery = (query: Query) => {
    if (!currentWorkspace) return;
    const updated = {
      ...currentWorkspace,
      queries: currentWorkspace.queries.map((q) => (q.id === query.id ? query : q)),
    };
    updateWorkspace(updated);
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
    
    updateWorkspace(updated);
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
