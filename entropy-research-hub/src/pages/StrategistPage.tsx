import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Plus,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Shield,
  DollarSign,
  Users,
} from "lucide-react";
import { useWorkspace, useWorkspaceActions } from "@/contexts/WorkspaceContext";

export default function StrategistPage() {
  const navigate = useNavigate();
  const { workspaces } = useWorkspace();
  const { createWorkspace } = useWorkspaceActions();

  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceFocus, setWorkspaceFocus] = useState("");

  // Filter for Strategist workspaces only
  const strategistWorkspaces = workspaces.filter(
    (ws) => ws.mode === "Strategist",
  );

  const handleCreateWorkspace = async () => {
    const name = workspaceName.trim();
    if (!name) return;

    const created = await createWorkspace(
      name,
      workspaceFocus.trim(),
      "Strategist",
    );
    setWorkspaceName("");
    setWorkspaceFocus("");
    navigate(`/workspaces/${created.id}`);
  };

  const strategistFeatures = [
    {
      icon: Shield,
      title: "Patent Landscape",
      description:
        "Analyze IP moats, USPTO filings, and FDA exclusivity periods",
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
    {
      icon: DollarSign,
      title: "Market Intelligence",
      description:
        "CMS pricing data, Medicare Part D spending, and TAM analysis",
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/10",
    },
    {
      icon: TrendingUp,
      title: "Pipeline Analysis",
      description:
        "Clinical whitespace, Phase 3 trials, and formulation opportunities",
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
    },
    {
      icon: Users,
      title: "Competitive Positioning",
      description: "Cross-pillar synthesis for VP-level strategic decisions",
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
    },
  ];

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_15%_10%,rgba(245,158,11,0.16),transparent_38%),radial-gradient(circle_at_88%_20%,rgba(139,92,246,0.15),transparent_35%),linear-gradient(180deg,rgba(12,13,18,0.85),rgba(12,13,18,0.96))]">
      <div className="px-6 py-6 space-y-6">
        {/* Header Section */}
        <section className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-[0_28px_65px_-42px_rgba(245,158,11,0.65)]">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-400/20 flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-6 w-6 text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-2xs uppercase tracking-[0.22em] text-amber-300/90 mb-2">
                Strategist Mode
              </p>
              <h1 className="text-3xl font-semibold text-foreground leading-tight">
                Commercial Intelligence & Portfolio Strategy
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
                Analyze pharmaceutical competitive intelligence using public
                data sources. Get IP landscape analysis, market sizing, clinical
                whitespace identification, and strategic dossiers for VP-level
                portfolio decisions.
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {strategistFeatures.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border/70 bg-card/85 p-4 hover:border-foreground/25 transition-all"
            >
              <div
                className={`h-10 w-10 rounded-lg ${feature.bgColor} flex items-center justify-center mb-3`}
              >
                <feature.icon className={`h-5 w-5 ${feature.color}`} />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                {feature.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </section>

        {/* Main Content Grid */}
        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
          {/* Existing Strategist Workspaces */}
          <div className="rounded-2xl border border-border/70 bg-card/85 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Strategist Workspaces
              </h2>
              <span className="text-2xs text-muted-foreground uppercase tracking-[0.14em]">
                {strategistWorkspaces.length} active
              </span>
            </div>

            <div className="space-y-3">
              {strategistWorkspaces.length === 0 ? (
                <div className="rounded-xl border border-border bg-background/65 px-4 py-8 text-center">
                  <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No Strategist workspaces yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create your first one to start commercial intelligence
                    analysis
                  </p>
                </div>
              ) : (
                strategistWorkspaces.map((workspace) => {
                  const latestQuery = workspace.queries
                    .slice()
                    .sort(
                      (a, b) =>
                        b.submittedAt.getTime() - a.submittedAt.getTime(),
                    )[0];

                  return (
                    <article
                      key={workspace.id}
                      className="group rounded-xl border border-border/80 bg-background/65 px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-amber-400/50 hover:shadow-[0_22px_42px_-34px_rgba(245,158,11,0.6)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-foreground">
                              {workspace.name}
                            </p>
                            <span className="inline-flex items-center rounded-full border border-amber-400/50 bg-amber-400/10 px-2 py-0.5 text-2xs text-amber-300">
                              Strategist
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {latestQuery?.text ||
                              workspace.description ||
                              "No queries yet"}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-2xs text-muted-foreground">
                            <span>{workspace.nodes.length} entities</span>
                            <span>•</span>
                            <span>{workspace.queries.length} analyses</span>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            navigate(`/workspaces/${workspace.id}`)
                          }
                          className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 text-sm font-medium text-amber-300 hover:text-amber-200"
                        >
                          Open
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          {/* Create New Strategist Workspace */}
          <div className="rounded-2xl border border-border/70 bg-card/90 p-5 shadow-[0_24px_60px_-42px_rgba(245,158,11,0.65)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-full bg-amber-300/20 flex items-center justify-center">
                <Plus className="h-4 w-4 text-amber-300" />
              </div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                New Intelligence Analysis
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
                  placeholder="e.g., Metformin competitive landscape Q2 2024"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Strategic Focus
                </label>
                <textarea
                  value={workspaceFocus}
                  onChange={(event) => setWorkspaceFocus(event.target.value)}
                  placeholder="What commercial intelligence question are you exploring?"
                  rows={4}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3">
                <p className="text-2xs text-amber-200 font-medium mb-1">
                  Analysis Includes:
                </p>
                <ul className="text-2xs text-muted-foreground space-y-0.5">
                  <li>• Patent & exclusivity landscape</li>
                  <li>• Market size & pricing intelligence</li>
                  <li>• Clinical trial whitespace</li>
                  <li>• Strategic synthesis dossier</li>
                </ul>
              </div>

              <button
                onClick={() => void handleCreateWorkspace()}
                disabled={!workspaceName.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-60 transition-colors"
              >
                Create Strategist Workspace
                <Sparkles className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Data Sources Info */}
        <section className="rounded-xl border border-border/70 bg-card/70 px-4 py-3">
          <p className="text-2xs uppercase tracking-[0.16em] text-muted-foreground mb-2">
            Public Data Sources
          </p>
          <div className="flex flex-wrap items-center gap-3 text-2xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              FDA Orange Book
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              USPTO PatentsView
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              CMS NADAC
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Medicare Part D
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              ClinicalTrials.gov
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              OpenFDA
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
