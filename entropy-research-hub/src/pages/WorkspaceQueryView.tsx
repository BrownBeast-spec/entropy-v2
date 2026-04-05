import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FlaskConical, SearchCheck, Network } from "lucide-react";
import WorkspaceView from "./WorkspaceView";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function WorkspaceQueryView() {
  const { workspaceId, queryId } = useParams<{
    workspaceId: string;
    queryId: string;
  }>();
  const navigate = useNavigate();
  const { currentWorkspace, setCurrentWorkspace, workspaces } = useWorkspace();

  const workspace = useMemo(
    () => workspaces.find((ws) => ws.id === workspaceId),
    [workspaces, workspaceId],
  );

  if (!workspace || !queryId) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Workspace or query not found</p>
      </div>
    );
  }

  if (!workspace.queries.some((query) => query.id === queryId)) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-muted-foreground">Query not found for this workspace.</p>
        <button
          onClick={() => navigate(`/workspaces/${workspace.id}`)}
          className="px-3 py-2 rounded-md border border-border text-sm text-foreground hover:bg-accent"
        >
          Back to query list
        </button>
      </div>
    );
  }

  if (!currentWorkspace || currentWorkspace.id !== workspace.id) {
    setCurrentWorkspace(workspace);
  }

  const currentQuery = workspace.queries.find((query) => query.id === queryId);
  const isOnboardingQuery =
    currentQuery &&
    currentQuery.contributedNodes.length === 0 &&
    workspace.nodes.length === 0 &&
    (currentQuery.status === "pending" ||
      currentQuery.text.trim().toLowerCase() === "new query");

  return (
    <div className="h-full flex flex-col">
      {isOnboardingQuery ? (
        <div className="mx-6 mt-4 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-900/30 via-card to-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-2xs uppercase tracking-[0.18em] text-emerald-300/90 mb-1">
                First Query Onboarding
              </p>
              <h2 className="text-sm font-semibold text-foreground">
                Ready to run your first query
              </h2>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5 text-emerald-400" />
              Enter your query
            </div>
            <div className="rounded-lg border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <SearchCheck className="h-3.5 w-3.5 text-emerald-400" />
              Fetch from sources
            </div>
            <div className="rounded-lg border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Network className="h-3.5 w-3.5 text-emerald-400" />
              Add evidence to graph
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex-1 min-h-0">
        <WorkspaceView />
      </div>
    </div>
  );
}
