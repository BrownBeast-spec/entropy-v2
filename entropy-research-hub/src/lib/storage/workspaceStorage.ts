import { Workspace } from "@/types/workspace";

const STORAGE_KEY = "entropy_workspaces";

export const workspaceStorage = {
  // Get all workspaces
  getAll(): Workspace[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    try {
      const workspaces = JSON.parse(stored);
      // Convert date strings back to Date objects
      return workspaces.map((ws: any) => ({
        ...ws,
        createdAt: new Date(ws.createdAt),
        updatedAt: new Date(ws.updatedAt),
        queries: ws.queries?.map((q: any) => ({
          ...q,
          submittedAt: new Date(q.submittedAt),
        })) || [],
        savedItems: ws.savedItems?.map((item: any) => ({
          ...item,
          savedAt: new Date(item.savedAt),
        })) || [],
        report: ws.report ? {
          ...ws.report,
          generatedAt: new Date(ws.report.generatedAt),
        } : undefined,
      }));
    } catch (e) {
      console.error("Failed to parse workspaces from storage:", e);
      return [];
    }
  },

  // Get a single workspace by ID
  getById(id: string): Workspace | null {
    const workspaces = this.getAll();
    return workspaces.find((ws) => ws.id === id) || null;
  },

  // Save or update a workspace
  save(workspace: Workspace): void {
    const workspaces = this.getAll();
    const existingIndex = workspaces.findIndex((ws) => ws.id === workspace.id);
    
    if (existingIndex >= 0) {
      workspaces[existingIndex] = { ...workspace, updatedAt: new Date() };
    } else {
      workspaces.push(workspace);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
  },

  // Delete a workspace
  delete(id: string): void {
    const workspaces = this.getAll();
    const filtered = workspaces.filter((ws) => ws.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  // Clear all workspaces (for testing)
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
};
