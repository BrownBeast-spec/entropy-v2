import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  MessageSquare,
  ArrowUpRight,
  SendHorizonal,
  Clock3,
} from "lucide-react";
import { useWorkspace, useWorkspaceActions } from "@/contexts/WorkspaceContext";
import type { Query, WorkspaceMode } from "@/types/workspace";
import {
  createQuery as createQueryApi,
  getWorkspaceQueries as getWorkspaceQueriesApi,
} from "@/lib/api/workspace";
import { searchWorkspace } from "@/lib/api/search";
import { executeWorkflow } from "@/lib/api/workflow";

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

  const workspace = workspaces.find((ws) => ws.id === workspaceId);

  const [queryDraft, setQueryDraft] = useState("");
  const [modeDraft, setModeDraft] = useState<WorkspaceMode>("Researcher");
  const [strategistOnboarding, setStrategistOnboarding] = useState({
    angle: "competitive-landscape",
    indication: "",
    geography: "US",
    decisionHorizon: "12 months",
    objective: "",
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshingQueries, setIsRefreshingQueries] = useState(false);
  const [isExecutingWorkflow, setIsExecutingWorkflow] = useState(false);

  useEffect(() => {
    if (!workspace) return;
    setModeDraft(workspace.mode ?? "Researcher");
    if (workspace.strategistOnboarding) {
      setStrategistOnboarding({
        angle: workspace.strategistOnboarding.angle,
        indication: workspace.strategistOnboarding.indication,
        geography: workspace.strategistOnboarding.geography,
        decisionHorizon: workspace.strategistOnboarding.decisionHorizon,
        objective: workspace.strategistOnboarding.objective,
      });
    }
  }, [workspace]);

  const sortedQueries = useMemo(() => {
    if (!workspace) return [];
    return [...workspace.queries].sort(
      (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
    );
  }, [workspace]);

  if (!workspace) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Workspace not found</p>
      </div>
    );
  }

  const createQuery = async () => {
    const trimmed = queryDraft.trim();
    if (!trimmed) return;

    const strategistPrompt =
      modeDraft === "Strategist"
        ? [
            `Strategist workspace context`,
            `Angle: ${strategistOnboarding.angle}`,
            strategistOnboarding.indication
              ? `Indication: ${strategistOnboarding.indication}`
              : null,
            `Geography: ${strategistOnboarding.geography}`,
            `Decision horizon: ${strategistOnboarding.decisionHorizon}`,
            strategistOnboarding.objective
              ? `Business objective: ${strategistOnboarding.objective}`
              : null,
            `User query: ${trimmed}`,
          ]
            .filter(Boolean)
            .join("\n")
        : trimmed;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const created = await createQueryApi(workspace.id, {
        text: trimmed,
        mode: modeDraft,
        indiaLens: false,
        status: "pending",
      });

      const query: Query = {
        id: created.data.id,
        workspaceId: created.data.workspaceId,
        text: created.data.text,
        researchPrompt: strategistPrompt,
        strategistWorkflow:
          modeDraft === "Strategist"
            ? {
                stage: "draft",
                resources: [],
              }
            : undefined,
        mode: created.data.mode,
        indiaLens: created.data.indiaLens,
        submittedAt: new Date(created.data.submittedAt),
        status: created.data.status,
        contributedNodes: created.data.contributedNodes ?? [],
        contributedEdges: created.data.contributedEdges ?? [],
        completenessScore: created.data.completenessScore,
        iterations: created.data.iterations,
      };

      const fallbackQueries = [...workspace.queries, query];
      setIsRefreshingQueries(true);

      const syncedQueries = await getWorkspaceQueriesApi(workspace.id)
        .then((response) =>
          response.data.queries.map((item) => ({
            ...(workspace.queries.find((q) => q.id === item.id) ?? {}),
            id: item.id,
            workspaceId: item.workspaceId,
            text: item.text,
            researchPrompt:
              item.id === query.id
                ? strategistPrompt
                : workspace.queries.find((q) => q.id === item.id)
                    ?.researchPrompt,
            strategistWorkflow:
              item.id === query.id
                ? query.strategistWorkflow
                : workspace.queries.find((q) => q.id === item.id)
                    ?.strategistWorkflow,
            mode: item.mode,
            indiaLens: item.indiaLens,
            submittedAt: new Date(item.submittedAt),
            status: item.status,
            contributedNodes: item.contributedNodes ?? [],
            contributedEdges: item.contributedEdges ?? [],
            completenessScore: item.completenessScore,
            iterations: item.iterations,
          })),
        )
        .catch(() => fallbackQueries);
      setIsRefreshingQueries(false);

      const activeQueryId =
        syncedQueries.find((item) => item.id === query.id)?.id ?? query.id;

      const updatedWorkspace = {
        ...workspace,
        strategistWorkspaceId:
          workspace.strategistWorkspaceId ??
          (modeDraft === "Strategist"
            ? `WS-Strategist-${workspace.id}`
            : undefined),
        strategistOnboarding:
          modeDraft === "Strategist"
            ? {
                completed: true,
                ...strategistOnboarding,
                completedAt: new Date(),
              }
            : workspace.strategistOnboarding,
        queries: syncedQueries,
        activeQueryId,
        updatedAt: new Date(),
      };

      await updateWorkspace(updatedWorkspace);
      if (!currentWorkspace || currentWorkspace.id !== workspace.id) {
        setCurrentWorkspace(updatedWorkspace);
      }

      if (modeDraft === "Strategist") {
        setIsSubmitting(false);
        setIsRefreshingQueries(false);
        setQueryDraft("");
        navigate(`/workspaces/${workspace.id}/queries/${activeQueryId}`);
        return;
      }

      // Clear submission states before starting workflow
      setIsSubmitting(false);
      setIsRefreshingQueries(false);

      // Execute automated workflow
      setIsExecutingWorkflow(true);
      try {
        const searchResults = await searchWorkspace({
          query: strategistPrompt,
          workspaceId: workspace.id,
          personaMode: modeDraft,
          indiaLens: false,
          graphSnapshot: {
            nodeIds: workspace.nodes.map((n) => n.id),
            edgeSummary: workspace.edges.map((e) => ({
              source: e.source,
              target: e.target,
              type: e.type,
            })),
          },
        });

        const workflowResult = await executeWorkflow({
          workspaceId: workspace.id,
          queryText: strategistPrompt,
          mode: modeDraft,
          indiaLens: false,
          searchTypes: ["paper", "trial", "company"],
          reportSections: ["Background", "Key Findings", "Evidence Quality"],
          searchResults: searchResults.results,
          queryId: activeQueryId, // Pass the frontend-created queryId
        });

        // Update query with generated report
        const report = {
          workspaceId: workspace.id,
          sections: workflowResult.synthesis.sections,
          generatedAt: new Date(),
          wordCount: workflowResult.synthesis.sections
            .map((section) => section.content)
            .join(" ")
            .split(/\s+/)
            .filter(Boolean).length,
          graphNodeCountAtGeneration: workflowResult.addedNodesCount,
        };

        const updatedQueriesWithReport = updatedWorkspace.queries.map((q) =>
          q.id === query.id ? { ...q, report } : q,
        );

        await updateWorkspace({
          ...updatedWorkspace,
          queries: updatedQueriesWithReport,
        });
      } catch (workflowError) {
        // Log workflow errors but don't block navigation
        // User can still manually augment via Lab Notebook
        console.error("Workflow execution failed:", workflowError);
      } finally {
        setIsExecutingWorkflow(false);
      }

      setQueryDraft("");
      navigate(`/workspaces/${workspace.id}/queries/${activeQueryId}`);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to create query. Please try again.",
      );
    } finally {
      setIsRefreshingQueries(false);
      setIsSubmitting(false);
      setIsExecutingWorkflow(false);
    }
  };

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_15%_8%,rgba(16,185,129,0.05),transparent_34%),radial-gradient(circle_at_85%_16%,rgba(245,158,11,0.05),transparent_32%)]">
      <div className="px-6 py-6 space-y-5">
        <section className="rounded-2xl border border-border/70 bg-card/85 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-2xs uppercase tracking-[0.2em] text-emerald-300/85 mb-2">
                Query Composer
              </p>
              <h1 className="text-2xl font-semibold text-foreground leading-tight">
                {workspace.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter a query and choose a lens before opening query view.
              </p>
            </div>
            <div className="text-2xs uppercase tracking-[0.12em] text-muted-foreground pt-1">
              {sortedQueries.length} sessions
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/70 p-3">
            <textarea
              aria-label="Query prompt"
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="Enter your research question, hypothesis, or strategic prompt..."
              rows={4}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <button
                onClick={() => setModeDraft("Researcher")}
                className={`rounded-full border px-3 py-1 text-2xs uppercase tracking-[0.14em] ${
                  modeDraft === "Researcher"
                    ? "border-emerald-400 bg-emerald-400 text-emerald-950"
                    : "border-border text-muted-foreground"
                }`}
              >
                Researcher
              </button>
              <button
                onClick={() => setModeDraft("Strategist")}
                className={`rounded-full border px-3 py-1 text-2xs uppercase tracking-[0.14em] ${
                  modeDraft === "Strategist"
                    ? "border-amber-300 bg-amber-300 text-amber-950"
                    : "border-border text-muted-foreground"
                }`}
              >
                Strategist
              </button>
              <button
                onClick={() => void createQuery()}
                disabled={
                  !queryDraft.trim() ||
                  isSubmitting ||
                  isRefreshingQueries ||
                  isExecutingWorkflow
                }
                className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {isExecutingWorkflow
                  ? "Researching..."
                  : isRefreshingQueries
                    ? "Syncing..."
                    : isSubmitting
                      ? "Creating..."
                      : "Run Query"}
                <SendHorizonal className="h-3.5 w-3.5" />
              </button>
            </div>

            {modeDraft === "Strategist" ? (
              <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/5 p-3 space-y-2">
                <p className="text-2xs uppercase tracking-[0.14em] text-amber-300">
                  Strategist Onboarding
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  <select
                    aria-label="Strategist angle"
                    value={strategistOnboarding.angle}
                    onChange={(event) =>
                      setStrategistOnboarding((prev) => ({
                        ...prev,
                        angle: event.target.value,
                      }))
                    }
                    className="rounded border border-border bg-background px-2 py-1.5 text-xs"
                  >
                    <option value="competitive-landscape">
                      Competitive landscape
                    </option>
                    <option value="patent-risk">
                      Patent / exclusivity risk
                    </option>
                    <option value="pricing-reimbursement">
                      Pricing & reimbursement
                    </option>
                    <option value="clinical-whitespace">
                      Clinical whitespace
                    </option>
                    <option value="portfolio-prioritization">
                      Portfolio prioritization
                    </option>
                  </select>
                  <input
                    aria-label="Strategist indication"
                    value={strategistOnboarding.indication}
                    onChange={(event) =>
                      setStrategistOnboarding((prev) => ({
                        ...prev,
                        indication: event.target.value,
                      }))
                    }
                    placeholder="Indication (e.g. ALS)"
                    className="rounded border border-border bg-background px-2 py-1.5 text-xs"
                  />
                  <input
                    aria-label="Strategist geography"
                    value={strategistOnboarding.geography}
                    onChange={(event) =>
                      setStrategistOnboarding((prev) => ({
                        ...prev,
                        geography: event.target.value,
                      }))
                    }
                    placeholder="Geography (e.g. US, EU5)"
                    className="rounded border border-border bg-background px-2 py-1.5 text-xs"
                  />
                  <input
                    aria-label="Strategist decision horizon"
                    value={strategistOnboarding.decisionHorizon}
                    onChange={(event) =>
                      setStrategistOnboarding((prev) => ({
                        ...prev,
                        decisionHorizon: event.target.value,
                      }))
                    }
                    placeholder="Decision horizon (e.g. 12 months)"
                    className="rounded border border-border bg-background px-2 py-1.5 text-xs"
                  />
                </div>
                <textarea
                  aria-label="Strategist objective"
                  value={strategistOnboarding.objective}
                  onChange={(event) =>
                    setStrategistOnboarding((prev) => ({
                      ...prev,
                      objective: event.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Business objective (e.g. Decide launch/no-launch for 2027)"
                  className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs resize-none"
                />
                <p className="text-2xs text-muted-foreground">
                  Strategist Workspace ID:{" "}
                  {workspace.strategistWorkspaceId ??
                    `WS-Strategist-${workspace.id}`}
                </p>
              </div>
            ) : null}

            {submitError ? (
              <p role="alert" className="mt-2 text-xs text-destructive">
                {submitError}
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-card/88 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-2xs uppercase tracking-[0.16em] text-muted-foreground">
              Recent Queries
            </h2>
          </div>

          <div className="space-y-2">
            {sortedQueries.length === 0 ? (
              <div className="rounded-lg border border-border bg-background/70 p-4 text-sm text-muted-foreground">
                No queries yet. Write one in the composer above.
              </div>
            ) : (
              sortedQueries.map((query) => (
                <button
                  key={query.id}
                  onClick={() =>
                    navigate(`/workspaces/${workspace.id}/queries/${query.id}`)
                  }
                  className="w-full rounded-lg border border-border bg-background/65 px-3 py-3 text-left transition-all hover:border-foreground/25 hover:bg-accent/35"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {query.text}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-2xs text-muted-foreground">
                          <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5">
                            {query.mode}
                          </span>
                          <span>Status: {query.status}</span>
                          <span>{query.contributedNodes.length} nodes</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-2xs text-muted-foreground text-right">
                      <p>{toRelative(query.submittedAt)}</p>
                      <span className="inline-flex items-center gap-1 mt-1 text-foreground">
                        Open
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
