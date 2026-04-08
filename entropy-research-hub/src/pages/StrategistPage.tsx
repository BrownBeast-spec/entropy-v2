import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, Plus, Sparkles, Check } from "lucide-react";
import { useWorkspace, useWorkspaceActions } from "@/contexts/WorkspaceContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const focusOptions = [
  {
    id: "competitive-landscape",
    label: "Competitive Landscape",
    description: "Market share, sponsor moves, and portfolio rivalry",
  },
  {
    id: "patent-risk",
    label: "Patent & Exclusivity Risk",
    description: "Orange Book patents, expiry windows, and generic pressure",
  },
  {
    id: "pricing-reimbursement",
    label: "Pricing & Reimbursement",
    description: "Part D spend, cost-per-claim, and payer economics",
  },
  {
    id: "clinical-whitespace",
    label: "Clinical Whitespace",
    description:
      "Trial gaps, underserved segments, and indication opportunities",
  },
  {
    id: "portfolio-prioritization",
    label: "Portfolio Prioritization",
    description: "Go / no-go framing for strategy and investment decisions",
  },
];

export default function StrategistPage() {
  const navigate = useNavigate();
  const { workspaces } = useWorkspace();
  const { createWorkspace, updateWorkspace } = useWorkspaceActions();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [selectedFocus, setSelectedFocus] = useState(focusOptions[0].id);
  const [isCreating, setIsCreating] = useState(false);

  const strategistWorkspaces = workspaces.filter(
    (ws) => ws.mode === "Strategist",
  );

  const handleCreateWorkspace = async () => {
    const name = workspaceName.trim();
    if (!name) return;

    setIsCreating(true);
    try {
      const selected = focusOptions.find(
        (option) => option.id === selectedFocus,
      );
      const created = await createWorkspace(
        name,
        selected?.label ?? "Strategist Analysis",
        "Strategist",
      );

      await updateWorkspace({
        ...created,
        strategistWorkspaceId: `WS-Strategist-${created.id}`,
        strategistOnboarding: {
          completed: true,
          angle: selectedFocus,
          indication: "",
          geography: "US",
          decisionHorizon: "12 months",
          objective: selected?.label ?? "",
          completedAt: new Date(),
        },
      });

      setWorkspaceName("");
      setSelectedFocus(focusOptions[0].id);
      setShowOnboarding(false);
      navigate(`/workspaces/${created.id}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_20%_8%,rgba(245,158,11,0.05),transparent_34%),radial-gradient(circle_at_88%_16%,rgba(250,204,21,0.05),transparent_30%)]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 space-y-6">
          <div className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-400/20 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <p className="text-2xs uppercase tracking-[0.2em] text-amber-300">
                  Strategist Workspace
                </p>
                <h1 className="text-2xl font-semibold text-foreground leading-tight mt-1">
                  Commercial Intelligence Onboarding
                </h1>
                <p className="text-sm text-muted-foreground mt-3 max-w-2xl">
                  Create a strategist workspace with a guided setup. We persist
                  your angle and context so the agent can reuse it across future
                  sessions.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/85 px-8 py-10 text-center shadow-sm">
            <div className="mx-auto h-14 w-14 rounded-full bg-amber-300/20 flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-amber-300" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              Create New Workspace
            </h2>
            <p className="text-sm text-muted-foreground mt-2 mb-6 max-w-xl mx-auto">
              Start onboarding in a focused modal and choose your strategic
              focus before running analysis.
            </p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400"
            >
              Create New Workspace
              <Sparkles className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/70 px-4 py-3">
            <p className="text-2xs uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Existing Strategist Workspaces ({strategistWorkspaces.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {strategistWorkspaces.length === 0 ? (
                <span className="text-xs text-muted-foreground">None yet</span>
              ) : (
                strategistWorkspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => navigate(`/workspaces/${workspace.id}`)}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-amber-300/50"
                  >
                    {workspace.name}
                  </button>
                ))
              )}
          </div>
        </div>
      </div>

      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-w-2xl border-border/80 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              New Strategist Workspace
            </DialogTitle>
            <DialogDescription>
              Answer onboarding to set context for strategist runs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">
                Workspace Name
              </label>
              <input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="e.g., Metformin ALS Competitive Strategy"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Strategic Focus
              </label>
              <div className="grid gap-2">
                {focusOptions.map((option) => {
                  const selected = selectedFocus === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedFocus(option.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                        selected
                          ? "border-amber-300 bg-amber-300/10"
                          : "border-border bg-background hover:border-amber-300/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {option.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {option.description}
                          </p>
                        </div>
                        {selected ? (
                          <Check className="h-4 w-4 text-amber-300 mt-0.5" />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3">
              <p className="text-2xs text-amber-200 font-medium mb-1">
                Analysis Includes:
              </p>
              <ul className="text-2xs text-muted-foreground space-y-0.5">
                <li>• Patent and exclusivity landscape</li>
                <li>• Market size and pricing intelligence</li>
                <li>• Clinical trial whitespace</li>
                <li>• Strategic synthesis dossier</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setShowOnboarding(false)}
                className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleCreateWorkspace()}
                disabled={!workspaceName.trim() || isCreating}
                className="ml-auto inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-60"
              >
                {isCreating ? "Creating..." : "Create Strategist Workspace"}
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
