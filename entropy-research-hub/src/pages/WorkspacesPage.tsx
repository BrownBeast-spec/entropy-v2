import { useState } from "react";
import { Search, Plus, MoreHorizontal } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  mode: "Researcher" | "Strategist";
  nodes: number;
  lastQuery: string;
  lastUpdated: string;
}

const dummyWorkspaces: Workspace[] = [
  { id: "1", name: "Metformin NASH Pipeline", mode: "Researcher", nodes: 47, lastQuery: "NASH drug targets with FDA...", lastUpdated: "2h ago" },
  { id: "2", name: "Competitive Intelligence - Oncology", mode: "Strategist", nodes: 123, lastQuery: "Top 5 PD-L1 inhibitors...", lastUpdated: "1d ago" },
  { id: "3", name: "India Regulatory Landscape", mode: "Researcher", nodes: 31, lastQuery: "CDSCO approval timeline...", lastUpdated: "3d ago" },
];

export default function WorkspacesPage() {
  const [workspaces] = useState<Workspace[]>(dummyWorkspaces);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newMode, setNewMode] = useState<"Researcher" | "Strategist">("Researcher");
  const [showCreate, setShowCreate] = useState(false);

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
                <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Mode</th>
                <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Nodes</th>
                <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Last Query</th>
                <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Last Updated</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {workspaces.map((ws) => (
                <tr key={ws.id} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors group cursor-pointer">
                  <td className="px-4 py-3 text-sm text-foreground font-medium">{ws.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-2xs px-2 py-0.5 rounded-full ${ws.mode === "Researcher" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${ws.mode === "Researcher" ? "bg-blue-400" : "bg-amber-400"}`} />
                      {ws.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{ws.nodes}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[200px]">{ws.lastQuery}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{ws.lastUpdated}</td>
                  <td className="px-4 py-3">
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity">
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
              <div className="flex items-center gap-1 bg-accent border border-border rounded-lg p-0.5">
                <button
                  onClick={() => setNewMode("Researcher")}
                  className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors ${newMode === "Researcher" ? "bg-blue-500/20 text-blue-400" : "text-muted-foreground"}`}
                >
                  Researcher
                </button>
                <button
                  onClick={() => setNewMode("Strategist")}
                  className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors ${newMode === "Strategist" ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground"}`}
                >
                  Strategist
                </button>
              </div>
              <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
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
