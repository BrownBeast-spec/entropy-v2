import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, MoreHorizontal } from "lucide-react";
import { useWorkspace, useWorkspaceActions } from "@/contexts/WorkspaceContext";

interface WorkspaceRow {
  id: string;
  name: string;
  nodes: number;
  lastQuery: string;
  lastUpdated: string;
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

const fallbackRows: WorkspaceRow[] = [
  {
    id: "demo-1",
    name: "Metformin NASH Pipeline",
    nodes: 47,
    lastQuery: "NASH drug targets with FDA...",
    lastUpdated: "2h ago",
  },
  {
    id: "demo-2",
    name: "Competitive Intelligence - Oncology",
    nodes: 123,
    lastQuery: "Top 5 PD-L1 inhibitors...",
    lastUpdated: "1d ago",
  },
  {
    id: "demo-3",
    name: "India Regulatory Landscape",
    nodes: 31,
    lastQuery: "CDSCO approval timeline...",
    lastUpdated: "3d ago",
  },
];

export default function WorkspacesPage() {
  const navigate = useNavigate();
  const { workspaces } = useWorkspace();
  const { createWorkspace } = useWorkspaceActions();

  const workspaceRows: WorkspaceRow[] = useMemo(
    () => {
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

          return {
            id: ws.id,
            name: ws.name,
            nodes: ws.nodes.length,
            lastQuery: latestQuery?.text || "No queries yet",
            lastUpdated: toRelative(ws.updatedAt),
          };
        });
    },
    [workspaces],
  );

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const handleCreateWorkspace = async () => {
    const name = newName.trim();
    if (!name) return;

    const created = await createWorkspace(name, newDesc.trim(), "Researcher");
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
    navigate(`/workspaces/${created.id}`);
  };

  return (
    <div className="p-6 animate-fade-in">
      {/* Recent Workspaces */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Workspaces</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-[13px] font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Workspace
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search workspaces..." className="pl-9 pr-4 py-2 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-[280px]" />
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Workspace Name</th>
                <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Nodes</th>
                <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Last Query</th>
                <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Last Updated</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {workspaceRows.map((ws) => (
                <tr
                  key={ws.id}
                  onClick={() => navigate(`/workspaces/${ws.id}`)}
                  className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors group cursor-pointer"
                >
                  <td className="px-4 py-3 text-sm text-foreground font-medium">{ws.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{ws.nodes}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[200px]">{ws.lastQuery}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{ws.lastUpdated}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Workspace actions">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Section */}
      <div className="border-t border-border pt-6">
        <h2 className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Create New Workspace</h2>
        <div className={`bg-card border border-border rounded-lg p-6 transition-all ${showCreate ? "ring-1 ring-primary/30" : ""}`}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Workspace Name</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g., Metformin NASH Pipeline Analysis"
                className="w-full bg-accent border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Research Focus (optional)</label>
              <input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Brief description of your research objective"
                className="w-full bg-accent border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-2xs uppercase tracking-[0.14em] text-emerald-300/90">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Query mode is selected inside workspace
              </div>
                <button
                  onClick={() => void handleCreateWorkspace()}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                  disabled={!newName.trim()}
                >
                Create and start researching
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data source status */}
      <div className="mt-6 flex items-center gap-4 text-2xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Open Targets</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> PubMed</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> ClinicalTrials.gov</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> STRING (cached)</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> PatentsView</span>
      </div>
    </div>
  );
}
