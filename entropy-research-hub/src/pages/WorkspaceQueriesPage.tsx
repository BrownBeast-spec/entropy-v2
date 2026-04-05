import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, MessageSquare, ArrowRight } from "lucide-react";
import { useWorkspace, useWorkspaceActions } from "@/contexts/WorkspaceContext";
import type { Query, WorkspaceMode } from "@/types/workspace";

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
  const { currentWorkspace, setCurrentWorkspace, workspaces } = useWorkspace();
  const { updateWorkspace } = useWorkspaceActions();
  const [draftQuery, setDraftQuery] = useState("");
  const [draftMode, setDraftMode] = useState<WorkspaceMode>("Researcher");

  const workspace = workspaces.find((ws) => ws.id === workspaceId);

  const sortedQueries = useMemo(() => {
    if (!workspace) return [];
    return [...workspace.queries].sort(
      (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
    );
  }, [workspace]);

  const queryPills: Array<{ mode: WorkspaceMode; label: string; tone: string }> = [
    {
      mode: "Researcher",
      label: "Research",
      tone: "bg-emerald-500 text-emerald-950",
    },
    {
      mode: "Strategist",
      label: "Strategy",
      tone: "bg-amber-400 text-amber-950",
    },
  ];

  if (!workspace) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Workspace not found</p>
      </div>
    );
  }

  const createQuery = async (mode: WorkspaceMode, textOverride?: string) => {
    const queryId = `query_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const queryText = (textOverride ?? "New query").trim() || "New query";

    const query: Query = {
      id: queryId,
      workspaceId: workspace.id,
      text: queryText,
      mode,
      indiaLens: false,
      submittedAt: new Date(),
      status: "pending",
      contributedNodes: [],
      contributedEdges: [],
    };

    const updatedWorkspace = {
      ...workspace,
      queries: [...workspace.queries, query],
      activeQueryId: queryId,
      updatedAt: new Date(),
    };

    await updateWorkspace(updatedWorkspace);
    if (!currentWorkspace || currentWorkspace.id !== workspace.id) {
      setCurrentWorkspace(updatedWorkspace);
    }

    navigate(`/workspaces/${workspace.id}/queries/${queryId}`);
  };

  return (
    <div className="p-6 space-y-6 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_50%),radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.1),_transparent_45%)]">
      <div className="rounded-xl border border-border bg-card/80 p-5 shadow-[0_20px_45px_-30px_rgba(16,185,129,0.55)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-2xs uppercase tracking-[0.2em] text-emerald-300/90 mb-2">
              Query Sessions
            </p>
            <h1 className="text-2xl font-semibold text-foreground leading-tight">
              {workspace.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Start a new run by choosing a lens below.
            </p>
          </div>
          <div className="text-2xs text-muted-foreground uppercase tracking-[0.12em] pt-1">
            {sortedQueries.length} sessions
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-2xs uppercase tracking-[0.14em] text-emerald-300/90 mb-2">
            First Query Fast-Start
          </p>
          <div className="flex flex-col gap-2">
            <input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="What are you investigating?"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setDraftMode("Researcher")}
                className={`rounded-full px-2.5 py-1 text-2xs uppercase tracking-[0.14em] border ${
                  draftMode === "Researcher"
                    ? "bg-emerald-500 text-emerald-950 border-emerald-500"
                    : "text-muted-foreground border-border"
                }`}
              >
                Research
              </button>
              <button
                onClick={() => setDraftMode("Strategist")}
                className={`rounded-full px-2.5 py-1 text-2xs uppercase tracking-[0.14em] border ${
                  draftMode === "Strategist"
                    ? "bg-amber-400 text-amber-950 border-amber-400"
                    : "text-muted-foreground border-border"
                }`}
              >
                Strategy
              </button>
              <button
                onClick={() => void createQuery(draftMode, draftQuery)}
                disabled={!draftQuery.trim()}
                className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                Run first query
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {queryPills.map((pill) => (
            <button
              key={pill.mode}
              onClick={() => void createQuery(pill.mode)}
              className="group relative overflow-hidden rounded-lg border border-border bg-background/70 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-[0_16px_30px_-24px_rgba(0,0,0,0.65)]"
            >
              <div
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.14em] ${pill.tone}`}
              >
                {pill.label}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  New {pill.mode} Query
                </span>
                <Plus className="h-4 w-4 text-muted-foreground transition-transform group-hover:rotate-90 group-hover:text-foreground" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-lg divide-y divide-border bg-card/90 backdrop-blur-sm">
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
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
                  {query.mode}
                </span>
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
