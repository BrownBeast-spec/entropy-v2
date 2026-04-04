import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useWorkspaceActions } from "@/contexts/WorkspaceContext";

export default function SettingsOrganization() {
  const [orgName, setOrgName] = useState("Entropy");
  const [orgUrl, setOrgUrl] = useState("entropy");
  const [domain, setDomain] = useState("causaly.com");
  const [autoJoin, setAutoJoin] = useState(false);
  const { resetToDemoState } = useWorkspaceActions();

  return (
    <div className="p-6 max-w-3xl animate-fade-in">
      <h1 className="text-lg font-semibold text-foreground mb-6">Organization</h1>

      <div className="bg-card border border-border rounded-lg p-6 space-y-6">
        <h2 className="text-sm font-semibold text-foreground">Organization Details</h2>

        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Organization Name</p>
            </div>
            <input value={orgName} onChange={e => setOrgName(e.target.value)} className="bg-accent border border-border rounded-md px-3 py-2 text-sm text-foreground w-[240px] focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>

          <div className="flex items-center justify-between border-b border-border pb-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Organization URL</p>
              <p className="text-2xs text-muted-foreground mt-0.5">Only lowercase letters, numbers, and hyphens allowed</p>
            </div>
            <div className="flex items-center bg-accent border border-border rounded-md overflow-hidden w-[240px]">
              <span className="text-2xs text-muted-foreground px-2">app.modem.dev/</span>
              <input value={orgUrl} onChange={e => setOrgUrl(e.target.value)} className="bg-transparent text-sm text-foreground py-2 pr-3 flex-1 focus:outline-none" />
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-border pb-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Domain</p>
              <p className="text-2xs text-muted-foreground mt-0.5">Used for auto-join. Only owners can edit.</p>
            </div>
            <input value={domain} onChange={e => setDomain(e.target.value)} className="bg-accent border border-border rounded-md px-3 py-2 text-sm text-foreground w-[240px] focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>

          <div className="flex items-center justify-between pb-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Enable Auto-Join</p>
              <p className="text-2xs text-muted-foreground mt-0.5 max-w-md">
                New users with matching email domains will automatically join this organization. (Requires{" "}
                <span className="underline cursor-pointer">signing in with Google</span> using a matching email.)
              </p>
            </div>
            <button
              onClick={() => setAutoJoin(!autoJoin)}
              className={`w-10 h-5 rounded-full transition-colors relative ${autoJoin ? "bg-primary" : "bg-accent border border-border"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-foreground transition-transform ${autoJoin ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button className="px-4 py-2 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/90 transition-colors">
            Update Organization
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-destructive mb-3">Danger Zone</h2>
        <div className="bg-card border border-destructive/30 rounded-lg p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Reset to Demo State</p>
            <p className="text-2xs text-muted-foreground mt-0.5">Re-seed the default demo workspace for rehearsals.</p>
          </div>
          <button
            onClick={() => void resetToDemoState()}
            className="px-4 py-2 border border-destructive/50 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            Reset to Demo State
          </button>
        </div>
        <div className="bg-card border border-destructive/30 rounded-lg p-6 flex items-center justify-between mt-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Delete Organization</p>
            <p className="text-2xs text-muted-foreground mt-0.5">Permanently delete this organization and all of its data. This action cannot be undone.</p>
          </div>
          <button className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-destructive/90 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete Organization
          </button>
        </div>
      </div>
    </div>
  );
}
