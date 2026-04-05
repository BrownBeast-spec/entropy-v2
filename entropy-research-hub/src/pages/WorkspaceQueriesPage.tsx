import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, MessageSquare } from "lucide-react";
import { useWorkspace, useWorkspaceActions } from "@/contexts/WorkspaceContext";
import type { WorkspaceMode } from "@/types/workspace";

function toRelative(date: Date): string {
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function WorkspaceQueriesPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { workspaces } = useWorkspace();
  const { addQuery } = useWorkspaceActions();

  const workspace = workspaces.find((ws) => ws.id === workspaceId);

  const sortedQueries = useMemo(() => {
    if (!workspace) return [];
    return [...workspace.queries].sort(
      (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
    );
  }, [workspace]);

  if (!workspace) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Workspace not found</p>
      </div>
    );
  }

  const createQuery = (mode: WorkspaceMode) => {
    const queryId = `query_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    addQuery({
      id: queryId,
      workspaceId: workspace.id,
      text: "New query",
      mode,
      indiaLens: false,
      submittedAt: new Date(),
      status: "pending",
      contributedNodes: [],
      contributedEdges: [],
    });
    navigate(`/workspaces/${workspace.id}/queries/${queryId}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{workspace.name}</h1>
          <p className="text-sm text-muted-foreground">Choose a query session or create a new one.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => createQuery("Researcher")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            New Researcher Query
          </button>
          <button
            onClick={() => createQuery("Strategist")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-medium text-foreground hover:bg-accent"
          >
            <Plus className="w-4 h-4" />
            New Strategist Query
          </button>
        </div>
      </div>

      <div className="border border-border rounded-lg divide-y divide-border">
        {sortedQueries.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No queries yet. Start one to begin research.
          </div>
        ) : (
          sortedQueries.map((query) => (
            <button
              key={query.id}
              onClick={() => navigate(`/workspaces/${workspace.id}/queries/${query.id}`)}
              className="w-full text-left p-4 hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm text-foreground truncate">
                    {query.text || "Untitled query"}
                  </p>
                </div>
                <span className="text-2xs text-muted-foreground">{toRelative(query.submittedAt)}</span>
              </div>
              <div className="mt-1 text-2xs text-muted-foreground flex items-center gap-3">
                <span>{query.mode}</span>
                <span>Status: {query.status}</span>
                <span>{query.contributedNodes.length} nodes</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
