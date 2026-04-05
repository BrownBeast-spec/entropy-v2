import { Search, Filter } from "lucide-react";

export default function TopicsPage() {
  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search" className="pl-9 pr-4 py-2 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-[280px]" />
        </div>
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase"><input type="checkbox" className="rounded border-border" /></th>
              <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Topic</th>
              <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Priority</th>
              <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">People</th>
              <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Messages</th>
              <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Activity</th>
              <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Age ↓</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                No topics · <span className="text-primary cursor-pointer hover:underline">Ask for Help</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-2xs text-muted-foreground mt-3">Showing 0 of 0</p>
      <div className="flex justify-end gap-3 mt-2 text-sm text-muted-foreground">
        <button className="hover:text-foreground transition-colors">Previous</button>
        <button className="hover:text-foreground transition-colors">Next</button>
      </div>
    </div>
  );
}
