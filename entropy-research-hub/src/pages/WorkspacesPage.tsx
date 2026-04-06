import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  ArrowRight,
  Activity,
  Database,
  Radar,
  Sparkles,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useWorkspace, useWorkspaceActions } from "@/contexts/WorkspaceContext";

interface WorkspaceCardData {
  id: string;
  name: string;
  nodes: number;
  lastQuery: string;
  lastUpdated: string;
  energyLabel: string;
}

function toRelative(updatedAt: Date): string {
  const now = Date.now();
  const diffMs = Math.max(0, now - updatedAt.getTime());
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const fallbackRows: WorkspaceCardData[] = [
  {
    id: "demo-1",
    name: "Metformin NASH Pipeline",
    nodes: 47,
    lastQuery: "NASH drug targets with FDA signal",
    lastUpdated: "2h ago",
    energyLabel: "High signal",
  },
  {
    id: "demo-2",
    name: "Competitive Intelligence - Oncology",
    nodes: 123,
    lastQuery: "Top 5 PD-L1 inhibitors and trial velocity",
    lastUpdated: "1d ago",
    energyLabel: "Watchlist",
  },
  {
    id: "demo-3",
    name: "India Regulatory Landscape",
    nodes: 31,
    lastQuery: "CDSCO approval timeline for GLP-1s",
    lastUpdated: "3d ago",
    energyLabel: "Emerging",
  },
];

const dataSources = [
  { name: "Open Targets", status: "live" },
  { name: "PubMed", status: "live" },
  { name: "ClinicalTrials", status: "live" },
  { name: "STRING", status: "cached" },
  { name: "Patents", status: "diagnostic" },
];

const sourceTone: Record<string, string> = {
  live: "bg-emerald-400",
  cached: "bg-amber-400",
  diagnostic: "bg-slate-400",
};

export default function WorkspacesPage() {
  const navigate = useNavigate();
  const { workspaces } = useWorkspace();
  const { createWorkspace, deleteWorkspace } = useWorkspaceActions();
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const workspaceCards: WorkspaceCardData[] = useMemo(() => {
    if (!workspaces.length) {
      return fallbackRows;
    }

    return [...workspaces]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map((ws) => {
        const activeQuery = ws.queries.find((query) => query.id === ws.activeQueryId);
        const latestQuery =
          activeQuery ??
          ws.queries
            .slice()
            .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0];

        const energyLabel =
          ws.nodes.length > 80
            ? "Dense map"
            : ws.nodes.length > 20
              ? "Building momentum"
              : "Fresh investigation";

        return {
          id: ws.id,
          name: ws.name,
          nodes: ws.nodes.length,
          lastQuery: latestQuery?.text || "No queries yet",
          lastUpdated: toRelative(ws.updatedAt),
          energyLabel,
        };
      });
  }, [workspaces]);

  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceFocus, setWorkspaceFocus] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const filteredCards = workspaceCards.filter((card) => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return true;
    return (
      card.name.toLowerCase().includes(query) ||
      card.lastQuery.toLowerCase().includes(query)
    );
  });

  const handleCreateWorkspace = async () => {
    const name = workspaceName.trim();
    if (!name) return;

    const created = await createWorkspace(name, workspaceFocus.trim(), "Researcher");
    setWorkspaceName("");
    setWorkspaceFocus("");
    navigate(`/workspaces/${created.id}`);
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (confirm("Are you sure you want to delete this workspace? This action cannot be undone.")) {
      await deleteWorkspace(workspaceId);
      setOpenMenuId(null);
    }
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_15%_10%,rgba(16,185,129,0.16),transparent_38%),radial-gradient(circle_at_88%_20%,rgba(245,158,11,0.15),transparent_35%),linear-gradient(180deg,rgba(12,13,18,0.85),rgba(12,13,18,0.96))]">
      <div className="px-6 py-6 space-y-6">
        <section className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-[0_28px_65px_-42px_rgba(16,185,129,0.65)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-2xs uppercase tracking-[0.22em] text-emerald-300/90 mb-2">
                Workspace Deck
              </p>
              <h1 className="text-3xl font-semibold text-foreground leading-tight">
                Build investigations with stronger signal flow
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                Create a workspace, frame a query, and branch into Researcher or
                Strategist runs from the query composer.
              </p>
            </div>

            <div className="relative w-full lg:w-[360px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search workspace names or latest query"
                className="w-full rounded-xl border border-border bg-background/90 pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="rounded-2xl border border-border/70 bg-card/85 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Recent Workspaces
              </h2>
              <span className="text-2xs text-muted-foreground uppercase tracking-[0.14em]">
                {filteredCards.length} active
              </span>
            </div>

            <div className="space-y-3">
              {filteredCards.map((workspace) => (
                <article
                  key={workspace.id}
                  className="group rounded-xl border border-border/80 bg-background/65 px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-[0_22px_42px_-34px_rgba(251,191,36,0.6)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {workspace.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {workspace.lastQuery}
                      </p>
                    </div>
                    <div className="relative" ref={openMenuId === workspace.id ? menuRef : null}>
                      <button
                        aria-label="Workspace actions"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === workspace.id ? null : workspace.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 hover:bg-accent"
                      >
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                      
                      {openMenuId === workspace.id && (
                        <div className="absolute right-0 mt-1 w-48 rounded-md border border-border bg-card shadow-lg z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWorkspace(workspace.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete workspace
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-2xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
                      <Radar className="h-3.5 w-3.5 text-emerald-400" />
                      {workspace.energyLabel}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5">
                      <Activity className="h-3.5 w-3.5 text-amber-300" />
                      {workspace.nodes} nodes
                    </span>
                    <span>{workspace.lastUpdated}</span>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => navigate(`/workspaces/${workspace.id}`)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-emerald-300 transition-colors"
                    >
                      Open Workspace
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-[0_24px_60px_-42px_rgba(245,158,11,0.65)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-full bg-amber-300/20 flex items-center justify-center">
                <Plus className="h-4 w-4 text-amber-300" />
              </div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Create New Workspace
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Workspace Name
                </label>
                <input
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder="e.g., Metformin NASH pipeline analysis"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Research Focus
                </label>
                <textarea
                  value={workspaceFocus}
                  onChange={(event) => setWorkspaceFocus(event.target.value)}
                  placeholder="What problem are you trying to solve?"
                  rows={4}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <button
                onClick={() => void handleCreateWorkspace()}
                disabled={!workspaceName.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                Create Workspace
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border/70 bg-card/70 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <p className="text-2xs uppercase tracking-[0.16em] text-muted-foreground">
              Source Status
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-2xs text-muted-foreground">
            {dataSources.map((source) => (
              <span key={source.name} className="inline-flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${sourceTone[source.status]}`} />
                {source.name}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
