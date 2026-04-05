import { Search, Plus, ChevronDown } from "lucide-react";

export default function SettingsMembers() {
  return (
    <div className="p-6 max-w-3xl animate-fade-in">
      <h1 className="text-lg font-semibold text-foreground mb-6">Members</h1>

      <div className="flex items-center justify-between mb-4">
        <div className="relative flex-1 mr-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Filter members" className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-[13px] font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Member</th>
              <th className="text-right px-4 py-3 text-2xs font-medium text-muted-foreground uppercase">Role</th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-accent/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">AL</div>
                  <div>
                    <span className="text-sm font-medium text-foreground mr-2">Alen</span>
                    <span className="text-sm text-muted-foreground">beastoptt@gmail.com</span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <button className="inline-flex items-center gap-1 bg-accent border border-border rounded-md px-3 py-1.5 text-sm text-foreground hover:bg-accent/80 transition-colors">
                  Owner <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
