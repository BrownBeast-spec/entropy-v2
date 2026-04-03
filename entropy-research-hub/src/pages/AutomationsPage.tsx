import { Search, ChevronDown, Plus, BarChart3, Calendar, Mail } from "lucide-react";

const automations = [
  {
    name: "Email team members about high priority topics",
    tag: "Topic Priority High",
    tagType: "chart" as const,
    schedule: null,
    enabled: true,
    updated: "4h",
    lastRun: "Never",
  },
  {
    name: "Weekly summary email",
    tag: null,
    tagType: null,
    schedule: "At 05:00 AM, only on Monday (EDT)",
    enabled: true,
    updated: "4h",
    lastRun: "Never",
  },
];

export default function AutomationsPage() {
  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5">
          <button className="px-3 py-1.5 rounded-md bg-accent text-foreground text-[13px] font-medium">My automations</button>
          <button className="px-3 py-1.5 rounded-md text-muted-foreground text-[13px] font-medium hover:text-foreground transition-colors">All automations</button>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Search automations..." className="pl-9 pr-4 py-2 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-[280px]" />
          </div>
          <button className="flex items-center gap-1 text-[13px] text-muted-foreground border border-border rounded-md px-3 py-2 hover:text-foreground transition-colors">
            All statuses <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-[13px] font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Create Automation
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 w-8"><input type="checkbox" className="rounded border-border" /></th>
              <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Automation</th>
              <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Enabled</th>
              <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Recent Runs</th>
              <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Author</th>
              <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Updated ↓</th>
              <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Last Run</th>
            </tr>
          </thead>
          <tbody>
            {automations.map((a, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                <td className="px-4 py-3"><input type="checkbox" className="rounded border-border" /></td>
                <td className="px-4 py-3">
                  <div className="text-sm text-foreground font-medium">{a.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {a.tag && (
                      <span className="text-2xs text-muted-foreground flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" /> {a.tag}
                      </span>
                    )}
                    {a.schedule && (
                      <span className="text-2xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {a.schedule}
                      </span>
                    )}
                    <Mail className="w-3 h-3 text-muted-foreground" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    Enabled
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground" />
                <td className="px-4 py-3">
                  <span className="w-6 h-6 rounded-full bg-orange-600 inline-flex items-center justify-center text-[10px] font-bold text-foreground">A</span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{a.updated}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{a.lastRun}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-2xs text-muted-foreground">Showing 1-2 of 2</p>
        <div className="flex items-center gap-3">
          <span className="text-2xs text-muted-foreground">Rows</span>
          <select className="bg-card border border-border rounded px-2 py-1 text-2xs text-foreground">
            <option>20</option>
          </select>
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">Previous</button>
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">Next</button>
        </div>
      </div>
    </div>
  );
}
