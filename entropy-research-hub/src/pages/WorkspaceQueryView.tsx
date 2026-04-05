import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

  return <WorkspaceView />;
}
