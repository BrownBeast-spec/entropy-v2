import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import WorkspaceView from "./WorkspaceView";
import { useWorkspace, useWorkspaceActions } from "@/contexts/WorkspaceContext";
import { Bot, Database, Lightbulb, Check, X } from "lucide-react";
import {
  gatherStrategistResources,
  runStrategistStrategy,
} from "@/lib/api/workflow";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function WorkspaceQueryView() {
  const { workspaceId, queryId } = useParams<{
    workspaceId: string;
    queryId: string;
  }>();
  const navigate = useNavigate();
  const { currentWorkspace, setCurrentWorkspace, workspaces } = useWorkspace();
  const { updateWorkspace } = useWorkspaceActions();

  const [isGatheringStrategist, setIsGatheringStrategist] = useState(false);
  const [isRunningStrategist, setIsRunningStrategist] = useState(false);
  const [strategistTypingText, setStrategistTypingText] = useState("");
  const storageKey = `strategist_resources_${workspaceId}`;
  const [localResources, setLocalResources] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveLocalResources = (res: any[]) => {
    setLocalResources(res);
    try {
      localStorage.setItem(storageKey, JSON.stringify(res));
    } catch {}
  };

  useEffect(() => {
    const handler = () => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) setLocalResources(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener("strategist_resources_updated", handler);
    return () => window.removeEventListener("strategist_resources_updated", handler);
  }, [storageKey]);

  const workspace = useMemo(
    () => workspaces.find((ws) => ws.id === workspaceId),
    [workspaces, workspaceId],
  );

  const query = workspace?.queries.find((item) => item.id === queryId);

  if (!workspace || !queryId) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Workspace or query not found
        </p>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-sm text-muted-foreground">
          Query not found for this workspace.
        </p>
        <button
          onClick={() => navigate(`/workspaces/${workspace.id}`)}
          className="px-3 py-2 rounded-md border border-border text-sm text-foreground hover:bg-accent"
        >
          Back to query list
        </button>
      </div>
    );
  }

  if (!currentWorkspace || currentWorkspace.id !== workspace.id) {
    setCurrentWorkspace(workspace);
  }

  if (query.mode !== "Strategist") {
    return <WorkspaceView />;
  }

  const keptIds = new Set(localResources.filter((r) => r.kept).map((r) => r.id));

  const persistStrategistWorkflow = async (
    updater: (existing: NonNullable<typeof query>) => typeof query,
  ) => {
    if (!workspace || !query) return;
    const nextQueries = workspace.queries.map((q) =>
      q.id === query.id ? (updater(q) as typeof q) : q,
    );
    const nextWorkspace = {
      ...workspace,
      queries: nextQueries,
      activeQueryId: query.id,
      updatedAt: new Date(),
    };
    await updateWorkspace(nextWorkspace);
    if (currentWorkspace?.id !== workspace.id) {
      setCurrentWorkspace(nextWorkspace);
    }
  };

  const handleStrategistGather = async () => {
    if (!workspace || !query) return;
    setIsGatheringStrategist(true);
    setStrategistTypingText("Gathering resources via Perplexity web search...");

    try {
      const response = await gatherStrategistResources({
        workspaceId: workspace.id,
        queryText: query.researchPrompt ?? query.text,
        context: workspace.strategistOnboarding || {},
      });

      const mapped = response.resources.map((result: any) => ({
        id: typeof result?.id === "string" ? result.id : `res-${Math.random().toString(36).slice(2, 8)}`,
        label: typeof result?.label === "string" ? result.label : result?.title || "Untitled Resource",
        source: typeof result?.source === "string" ? result.source : "web",
        entityType: typeof result?.type === "string" ? result.type : "resource",
        summary: typeof result?.description === "string" ? result.description : undefined,
        url: typeof result?.url === "string" ? result.url : undefined,
        kept: true,
      }));

      const existingIds = new Set(localResources.map((r) => r.id));
      const fresh = mapped.filter((r) => !existingIds.has(r.id));
      saveLocalResources([...localResources, ...fresh]);

      await persistStrategistWorkflow((existing) => ({
        ...existing,
        strategistWorkflow: {
          ...(existing.strategistWorkflow || { stage: "resources_gathered", resources: [] }),
          stage: "resources_gathered",
          gatheredAt: new Date(),
        },
      }));

      setStrategistTypingText("Resource gathering complete. Select resources below.");
    } catch (error) {
      setStrategistTypingText(
        error instanceof Error ? error.message : "Failed to gather resources",
      );
    } finally {
      setIsGatheringStrategist(false);
    }
  };

  const handleToggleKeepResource = (resourceId: string, keep: boolean) => {
    saveLocalResources(
      localResources.map((r) => (r.id === resourceId ? { ...r, kept: keep } : r)),
    );
  };

  const handleStrategistRun = async () => {
    if (!workspace || !query) return;
    const keptResources = localResources.filter((r) => r.kept);

    if (keptResources.length === 0) {
      setStrategistTypingText(
        "Please keep at least one resource before running strategy.",
      );
      return;
    }

    setIsRunningStrategist(true);
    setStrategistTypingText("Running strategist synthesis...");
    try {
      const response = await runStrategistStrategy({
        workspaceId: workspace.id,
        queryText: query.researchPrompt ?? query.text,
        gatheredResources: keptResources,
      });

      let live = "";
      for (const ch of response.markdown) {
        live += ch;
        setStrategistTypingText(live);
        await sleep(6);
      }

      await persistStrategistWorkflow((existing) => ({
        ...existing,
        report: {
          workspaceId: workspace.id,
          sections: response.sections.map((section, sectionIndex) => ({
            ...section,
            citations: section.citations.map((citation, citationIndex) => ({
              id: `${existing.id}-cit-${sectionIndex}-${citationIndex}`,
              nodeId: citation.nodeId,
              source: citation.source,
              label: citation.label,
            })),
          })),
          generatedAt: new Date(),
          wordCount: response.sections
            .map((section) => section.content)
            .join(" ")
            .split(/\s+/)
            .filter(Boolean).length,
          graphNodeCountAtGeneration: 0,
        },
        strategistWorkflow: {
          ...(existing.strategistWorkflow ?? {
            stage: "resources_gathered" as const,
            resources: keptResources,
          }),
          stage: "strategy_complete",
          strategizedAt: new Date(),
          trustedWebFindings: response.trustedWebFindings ?? [],
          strategyMarkdown: response.markdown,
        },
      }));
    } catch (error) {
      setStrategistTypingText(
        error instanceof Error ? error.message : "Failed to run strategist",
      );
    } finally {
      setIsRunningStrategist(false);
    }
  };

  const isError =
    strategistTypingText.toLowerCase().includes("failed") ||
    strategistTypingText.includes("JSON.parse") ||
    strategistTypingText.includes("error");

  return (
    <div className="h-full bg-background flex flex-col items-center p-8 overflow-y-auto relative scrollbar-thin">
      {/* Subtle background glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-5xl w-full space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-in-out">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
          <div className="flex items-start gap-4">
            <div className="mt-1 h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/5 border border-amber-500/20 flex flex-shrink-0 items-center justify-center shadow-inner">
              <Bot className="h-6 w-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500/90">
                Strategist Session
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground/90 leading-tight">
                {query.text || "New Synthesis"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => void handleStrategistGather()}
              disabled={isGatheringStrategist || isRunningStrategist}
              className="group relative inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-amber-950 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:hover:shadow-none transition-all duration-300"
            >
              <Database className="h-4 w-4 transition-transform group-hover:scale-110" />
              {isGatheringStrategist ? "Gathering Data..." : "Gather Data"}
              <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10 pointer-events-none" />
            </button>
            <button
              onClick={() => void handleStrategistRun()}
              disabled={
                isRunningStrategist ||
                localResources.length === 0
              }
              className="group inline-flex items-center gap-2 rounded-xl border border-border/80 bg-background/50 backdrop-blur-sm px-5 py-2.5 text-sm font-medium text-foreground disabled:opacity-50 hover:bg-accent/80 hover:border-border transition-all duration-300 shadow-sm"
            >
              <Lightbulb className="h-4 w-4 text-amber-400 transition-transform group-hover:scale-110" />
              {isRunningStrategist ? "Synthesizing..." : "Run Strategy"}
            </button>
          </div>
        </div>

        {/* Console / Status Window */}
        {isRunningStrategist ||
        isError ||
        (strategistTypingText &&
          !query?.strategistWorkflow?.strategyMarkdown) ? (
          <div
            className={cn(
              "rounded-xl border p-5 shadow-sm transition-all duration-500 animate-in fade-in zoom-in-95",
              isError
                ? "border-red-500/30 bg-red-500/5 shadow-[0_0_30px_rgba(239,68,68,0.05)]"
                : "border-amber-500/20 bg-card/40 backdrop-blur-md",
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  isError ? "bg-red-500" : "bg-amber-500 animate-pulse",
                )}
              />
              <span
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider",
                  isError ? "text-red-400" : "text-amber-500/80",
                )}
              >
                {isError ? "System Error" : "System Activity"}
              </span>
            </div>
            <p
              className={cn(
                "text-sm whitespace-pre-wrap font-mono leading-relaxed",
                isError ? "text-red-300" : "text-foreground/80",
              )}
            >
              {strategistTypingText}
            </p>
          </div>
        ) : query?.strategistWorkflow?.strategyMarkdown ? (
          <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-md p-6 lg:p-8 shadow-sm transition-all duration-500 animate-in fade-in zoom-in-95 overflow-hidden">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border/50">
              <Bot className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-semibold uppercase tracking-widest text-amber-500/90">
                Synthesized Strategy
              </span>
            </div>
            <div
              className="prose prose-sm md:prose-base dark:prose-invert max-w-none
                           prose-headings:text-foreground/90 prose-headings:font-semibold
                           prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                           prose-p:leading-relaxed prose-p:text-muted-foreground
                           prose-strong:text-foreground prose-strong:font-semibold
                           prose-a:text-amber-500 prose-a:no-underline hover:prose-a:underline
                           prose-ul:list-disc prose-ol:list-decimal
                           prose-li:text-muted-foreground prose-li:marker:text-amber-500/50
                           prose-pre:bg-black/40 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-lg
                           prose-hr:border-border/40 prose-hr:my-8"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {query.strategistWorkflow.strategyMarkdown}
              </ReactMarkdown>
            </div>
          </div>
        ) : null}

        {/* Resources Grid */}
        {localResources.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <span>Resources Pool</span>
                <span className="px-2 py-0.5 rounded-full bg-border text-xs">
                  {localResources.length}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground/80">
                Select resources to include in synthesis
              </p>
            </div>

            <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/50">
              {localResources.map((resource) => {
                const isKept = resource.kept;
                return (
                  <div
                    key={resource.id}
                    onClick={() => handleToggleKeepResource(resource.id, !isKept)}
                    className={cn(
                      "group relative cursor-pointer flex flex-col rounded-xl border p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg",
                      isKept
                        ? "border-emerald-500/40 bg-emerald-500/[0.03] shadow-sm"
                        : "border-border/60 bg-card/30 hover:border-border hover:bg-card/60 grayscale-[10%]",
                    )}
                  >
                    {/* Selection Indicator Ring */}
                    {isKept && (
                      <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-emerald-500/20 pointer-events-none" />
                    )}

                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <h4
                          className={cn(
                            "text-[15px] font-semibold leading-snug line-clamp-2 transition-colors",
                            isKept ? "text-emerald-950" : "text-foreground/90",
                          )}
                          title={resource.label}
                        >
                          {resource.label}
                        </h4>
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-md",
                              isKept
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-accent text-muted-foreground",
                            )}
                          >
                            {resource.source}
                          </span>
                          <span className="text-muted-foreground/60">•</span>
                          <span className="text-muted-foreground/80 uppercase tracking-wider text-[10px]">
                            {resource.entityType}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 bg-background/50 backdrop-blur-md rounded-lg p-0.5 shadow-sm border border-border/50">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleToggleKeepResource(resource.id, true);
                          }}
                          className={cn(
                            "h-8 w-8 rounded-md flex items-center justify-center transition-all duration-200",
                            isKept
                              ? "bg-emerald-500 text-white shadow-sm"
                              : "text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400",
                          )}
                          title="Keep"
                        >
                          <Check
                            className="h-4 w-4"
                            strokeWidth={isKept ? 3 : 2}
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleToggleKeepResource(resource.id, false);
                          }}
                          className={cn(
                            "h-8 w-8 rounded-md flex items-center justify-center transition-all duration-200",
                            !isKept
                              ? "bg-destructive text-white shadow-sm"
                              : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                          )}
                          title="Remove"
                        >
                          <X
                            className="h-4 w-4"
                            strokeWidth={!isKept ? 3 : 2}
                          />
                        </button>
                      </div>
                    </div>

                    {resource.summary && (
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <p className="text-[13px] text-muted-foreground/80 leading-relaxed line-clamp-2 shadow-sm font-light">
                          {resource.summary}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Trusted Web Findings Row */}
        {(query.strategistWorkflow?.trustedWebFindings?.length ?? 0) > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Trusted Web Findings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {query.strategistWorkflow?.trustedWebFindings?.map(
                (finding, idx) => (
                  <a
                    key={`${finding.url}-${idx}`}
                    href={finding.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group block relative rounded-xl border border-border/60 bg-card/30 p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-card/80 hover:shadow-lg hover:border-amber-500/30 overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/0 via-amber-500/40 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="space-y-2">
                      <p
                        className="text-sm font-semibold text-foreground/90 line-clamp-2 leading-relaxed"
                        title={finding.title}
                      >
                        {finding.title}
                      </p>
                      <p className="text-xs font-medium text-amber-500/80 truncate">
                        {finding.source}
                      </p>
                    </div>
                  </a>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
