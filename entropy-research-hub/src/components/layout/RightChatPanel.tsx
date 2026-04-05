import { useLocation, useParams } from "react-router-dom";
import {
  Send,
  Lock,
  Calendar,
  SlidersHorizontal,
  Plus,
  MessageSquare,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  FlaskConical,
  Sparkles,
  Library,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useWorkspace, useWorkspaceActions } from "@/contexts/WorkspaceContext";
import { searchWorkspace, type SearchResult } from "@/lib/api/search";
import { addNodesToWorkspace } from "@/lib/api/workspace";
import SearchResultCard from "@/components/workspace/SearchResultCard";

const pageNames: Record<string, string> = {
  "/agent": "Agent",
  "/topics": "Topics",
  "/people": "People",
  "/companies": "Companies",
  "/workspaces": "Workspaces",
  "/automations": "Automations",
  "/settings": "Settings",
};

const recentConversations = [
  "A Friendly Greeting to Start Chat",
  "Access Rights for People, Companies, Automations",
  "A Brief Greeting to Start the Chat",
];

type NotebookEntry = {
  id: string;
  query: string;
  status: "running" | "complete" | "failed";
  results: SearchResult[];
  searchedSources: string[];
  sourceDiagnostics: Record<string, string>;
  executionTime?: number;
  error?: string;
};

function keyForResult(entryId: string, resultId: string) {
  return `${entryId}::${resultId}`;
}

function conceptTokensFromMetadata(
  metadata: Record<string, unknown>,
): string[] {
  const concepts: string[] = [];

  if (Array.isArray(metadata.pathways)) {
    metadata.pathways.forEach((pathway) => {
      if (typeof pathway === "string") {
        concepts.push(`pathway:${pathway}`);
      }
    });
  }

  if (Array.isArray(metadata.mechanisms)) {
    metadata.mechanisms.forEach((mechanism) => {
      if (typeof mechanism === "string") {
        concepts.push(`mechanism:${mechanism}`);
      }
    });
  }

  if (Array.isArray(metadata.indications)) {
    metadata.indications.forEach((indication) => {
      if (typeof indication === "string") {
        concepts.push(`indication:${indication}`);
      }
    });
  }

  return concepts;
}

function collapseLabel(isWorkspace: boolean) {
  return isWorkspace ? "Collapse notebook" : "Collapse assistant";
}

function expandLabel(isWorkspace: boolean) {
  return isWorkspace ? "Expand notebook" : "Expand assistant";
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function RightChatPanel() {
  const location = useLocation();
  const { queryId: routeQueryId } = useParams<{ queryId?: string }>();
  const { currentWorkspace } = useWorkspace();
  const { addNode, addEdge, updateWorkspace } = useWorkspaceActions();

  const [collapsed, setCollapsed] = useState(false);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [notebookEntries, setNotebookEntries] = useState<NotebookEntry[]>([]);
  const [selectedResultKeys, setSelectedResultKeys] = useState<Set<string>>(
    new Set(),
  );
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearchCount, setActiveSearchCount] = useState(0);
  const [indiaLensFilter, setIndiaLensFilter] = useState(false);
  const [timelineStart, setTimelineStart] = useState("");
  const [timelineEnd, setTimelineEnd] = useState("");
  const [showGraphAugmentedToast, setShowGraphAugmentedToast] = useState(false);

  const isAgent = location.pathname === "/agent";
  const isWorkspaces =
    location.pathname === "/workspaces" || location.pathname === "/";
  const isWorkspace = location.pathname.startsWith("/workspaces/");

  const activeQuery = currentWorkspace
    ? (currentWorkspace.queries.find((query) => query.id === routeQueryId) ??
      currentWorkspace.queries.find(
        (query) => query.id === currentWorkspace.activeQueryId,
      ) ??
      currentWorkspace.queries[currentWorkspace.queries.length - 1])
    : undefined;

  const selectedResults = useMemo(() => {
    const selected: SearchResult[] = [];

    for (const entry of notebookEntries) {
      for (const result of entry.results) {
        if (selectedResultKeys.has(keyForResult(entry.id, result.id))) {
          selected.push(result);
        }
      }
    }

    return selected;
  }, [notebookEntries, selectedResultKeys]);

  const currentPage =
    Object.entries(pageNames).find(([path]) =>
      location.pathname.startsWith(path),
    )?.[1] || "Topics";

  const querySeed =
    activeQuery?.text && activeQuery.text !== "New query"
      ? activeQuery.text
      : "";

  const hasOnboardingRun = notebookEntries.length > 0;

  const handleSearch = async () => {
    const incomingQuery = searchQuery.trim() || querySeed;
    if (!currentWorkspace || !incomingQuery) return;

    const query = incomingQuery;
    const entryId = `entry_${Date.now()}`;

    setIsSearching(true);
    setActiveSearchCount((count) => count + 1);
    setSearchQuery("");

    setNotebookEntries((prev) => [
      ...prev,
      {
        id: entryId,
        query,
        status: "running",
        results: [],
        searchedSources: [],
        sourceDiagnostics: {},
      },
    ]);

    try {
      const response = await searchWorkspace({
        query,
        graphSnapshot: {
          nodeIds: currentWorkspace.nodes.map((n) => n.id),
          nodeTypes: Object.fromEntries(
            currentWorkspace.nodes.map((node) => [node.id, node.type]),
          ),
          existingConcepts: Array.from(
            new Set(
              currentWorkspace.nodes.flatMap((node) =>
                conceptTokensFromMetadata(
                  node.metadata as Record<string, unknown>,
                ),
              ),
            ),
          ),
          edgeSummary: currentWorkspace.edges.map((e) => ({
            source: e.source,
            target: e.target,
            type: e.type,
          })),
        },
        personaMode: activeQuery?.mode ?? currentWorkspace.mode,
        indiaLens: indiaLensFilter,
        workspaceId: currentWorkspace.id,
        queryId: activeQuery?.id,
        timelineStart: timelineStart || undefined,
        timelineEnd: timelineEnd || undefined,
      });

      setNotebookEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                status: "complete",
                results: response.results,
                searchedSources: response.searchedSources,
                sourceDiagnostics: response.sourceDiagnostics ?? {},
                executionTime: response.executionTime,
              }
            : entry,
        ),
      );
      setSelectedResultKeys(new Set());
      setShowGraphAugmentedToast(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      setNotebookEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                status: "failed",
                error: message,
              }
            : entry,
        ),
      );
    } finally {
      setActiveSearchCount((count) => {
        const next = Math.max(0, count - 1);
        setIsSearching(next > 0);
        return next;
      });
    }
  };

  const handleToggleResult = (resultKey: string) => {
    const next = new Set(selectedResultKeys);
    if (next.has(resultKey)) {
      next.delete(resultKey);
    } else {
      next.add(resultKey);
    }
    setSelectedResultKeys(next);
  };

  const handleAddToGraph = async () => {
    if (!currentWorkspace || selectedResults.length === 0) return;

    try {
      const response = await addNodesToWorkspace(currentWorkspace.id, {
        queryId: activeQuery?.id || `query_${Date.now()}`,
        inferEdges: true,
        nodes: selectedResults.map((result) => ({
          label: result.label,
          type: result.entityType,
          source: result.source,
          metadata: result.metadata,
          evidenceScore: result.evidenceScore,
          indiaRelevant: result.indiaRelevant,
        })),
      });

      const payload = "data" in response ? response.data : response;

      const returnedEdges = payload.inferredEdges ?? [];

      payload.addedNodes.forEach((node) => addNode(node));
      returnedEdges.forEach((edge) => addEdge(edge));

      if (activeQuery) {
        const contributedNodeIds = payload.addedNodes.map((node) => node.id);
        const contributedEdgeIds = returnedEdges.map((edge) => edge.id);

        const nextWorkspace = {
          ...currentWorkspace,
          queries: currentWorkspace.queries.map((query) => {
            if (query.id !== activeQuery.id) {
              return query;
            }

            return {
              ...query,
              contributedNodes: Array.from(
                new Set([...query.contributedNodes, ...contributedNodeIds]),
              ),
              contributedEdges: Array.from(
                new Set([...query.contributedEdges, ...contributedEdgeIds]),
              ),
            };
          }),
        };

        await updateWorkspace(nextWorkspace);
      }

      setSelectedResultKeys(new Set());
      if (payload.addedNodes.length > 0) {
        setShowGraphAugmentedToast(true);
      }
    } catch (error) {
      console.error("Failed to add nodes:", error);
    }
  };

  const renderCollapsedRail = (label: string) => (
    <div className="w-14 min-w-14 h-screen flex flex-col items-center justify-between border-l border-border bg-card px-2 py-3">
      <button
        aria-label={expandLabel(isWorkspace)}
        onClick={() => setCollapsed(false)}
        className="h-9 w-9 rounded-lg border border-border bg-background hover:bg-accent transition-colors flex items-center justify-center"
      >
        <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="text-2xs uppercase tracking-[0.18em] text-muted-foreground [writing-mode:vertical-rl] [text-orientation:mixed]">
        {label}
      </div>
      <div className="h-9 w-9 rounded-lg bg-accent/50 border border-border" />
    </div>
  );

  if (isWorkspace && currentWorkspace) {
    if (collapsed) {
      return renderCollapsedRail("Notebook");
    }

    return (
      <div className="w-[var(--chat-width)] min-w-[var(--chat-width)] h-screen flex flex-col border-l border-border bg-card">
        <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-gradient-to-r from-emerald-950/40 to-transparent">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Library className="w-4 h-4 text-emerald-400" />
              Lab Notebook
            </div>
            <p className="text-2xs text-muted-foreground truncate mt-0.5">
              {activeQuery?.text || "Capture evidence as a conversation"}
            </p>
          </div>
          <button
            aria-label={collapseLabel(true)}
            onClick={() => setCollapsed(true)}
            className="h-8 w-8 rounded-md border border-border bg-background hover:bg-accent transition-colors flex items-center justify-center"
          >
            <PanelRightClose className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="border-b border-border px-3 py-2 bg-background/70">
          {!hasOnboardingRun ? (
            <div className="mb-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-2 text-2xs text-emerald-200">
              <p className="uppercase tracking-[0.12em] mb-1">
                Quick onboarding
              </p>
              <p className="text-muted-foreground">
                Enter query → Fetch from sources → Add evidence to graph.
              </p>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-2xs text-muted-foreground flex items-center gap-2 rounded-md border border-border px-2 py-1 bg-accent/20">
              <input
                aria-label="India Lens"
                type="checkbox"
                checked={indiaLensFilter}
                onChange={(e) => setIndiaLensFilter(e.target.checked)}
                className="rounded border-border"
              />
              India Lens
            </label>
            <label className="text-2xs text-muted-foreground flex flex-col gap-1 rounded-md border border-border px-2 py-1 bg-accent/20">
              Timeline Start
              <input
                aria-label="Timeline Start"
                type="date"
                value={timelineStart}
                onChange={(e) => setTimelineStart(e.target.value)}
                className="px-2 py-1 text-2xs bg-background border border-border rounded"
              />
            </label>
            <label className="text-2xs text-muted-foreground flex flex-col gap-1 rounded-md border border-border px-2 py-1 bg-accent/20 col-span-2">
              Timeline End
              <input
                aria-label="Timeline End"
                type="date"
                value={timelineEnd}
                onChange={(e) => setTimelineEnd(e.target.value)}
                className="px-2 py-1 text-2xs bg-background border border-border rounded"
              />
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_55%)]">
          {showGraphAugmentedToast ? (
            <div className="mb-3 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200">
              Graph augmented with 1 evidence node.
            </div>
          ) : null}
          {notebookEntries.length === 0 ? (
            <div className="rounded-xl border border-border bg-background/80 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FlaskConical className="h-4 w-4 text-emerald-400" />
                Start a notebook run
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ask a focused question, then review evidence cards and add
                selected entities directly to your graph.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notebookEntries.map((entry) => {
                const unavailableCount = Object.keys(
                  entry.sourceDiagnostics,
                ).length;

                return (
                  <article
                    key={entry.id}
                    className="relative rounded-xl border border-border bg-background/85 p-3"
                  >
                    <div className="absolute left-3 top-3 h-[calc(100%-24px)] w-px bg-border/70" />

                    <div className="pl-5 space-y-3">
                      <div className="flex justify-end">
                        <div className="max-w-[92%] rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                          <p className="text-2xs uppercase tracking-[0.14em] text-emerald-300/80 mb-1">
                            You asked
                          </p>
                          <p className="text-sm text-foreground">
                            {entry.query}
                          </p>
                        </div>
                      </div>

                      <div className="max-w-[96%] rounded-lg border border-border bg-card px-3 py-3 space-y-2">
                        <div className="flex items-center gap-2 text-2xs uppercase tracking-[0.12em] text-muted-foreground">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                          {entry.status === "complete"
                            ? "Entropy found"
                            : entry.status === "failed"
                              ? "Entropy issue"
                              : "Entropy searching"}
                        </div>

                        {entry.status === "running" ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Gathering evidence across connected sources...
                          </div>
                        ) : null}

                        {entry.status === "failed" ? (
                          <p className="text-xs text-destructive">
                            {entry.error || "Search failed"}
                          </p>
                        ) : null}

                        {entry.status === "complete" ? (
                          <>
                            <div className="flex items-center justify-between text-2xs text-muted-foreground">
                              <span>
                                Fetching from sources complete. Sources:{" "}
                                {entry.searchedSources.length} successful
                                {unavailableCount > 0
                                  ? `, ${unavailableCount} unavailable`
                                  : ""}
                              </span>
                              {entry.executionTime ? (
                                <span>{entry.executionTime} ms</span>
                              ) : null}
                            </div>

                            <div className="space-y-2">
                              {entry.results.map((result) => {
                                const resultKey = keyForResult(
                                  entry.id,
                                  result.id,
                                );

                                return (
                                  <SearchResultCard
                                    key={resultKey}
                                    result={{ ...result, id: resultKey }}
                                    selected={selectedResultKeys.has(resultKey)}
                                    onToggle={handleToggleResult}
                                    onViewDetails={() => {
                                      // Reuse EntityDetailDrawer in workspace context (follow-up).
                                    }}
                                  />
                                );
                              })}
                            </div>

                            {unavailableCount > 0 ? (
                              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-2xs text-amber-200 space-y-1">
                                {Object.entries(entry.sourceDiagnostics).map(
                                  ([source, reason]) => (
                                    <p key={`${entry.id}-${source}`}>
                                      {source}: {reason}
                                    </p>
                                  ),
                                )}
                              </div>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {selectedResultKeys.size > 0 ? (
          <div className="px-3 py-2 border-t border-border bg-emerald-500/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {selectedResultKeys.size} selected
              </span>
              <span className="text-2xs text-emerald-300/80">
                Notebook action
              </span>
            </div>
            <button
              onClick={() => void handleAddToGraph()}
              disabled={selectedResultKeys.size === 0}
              className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm font-medium"
            >
              Add Selected to Graph
            </button>
          </div>
        ) : null}

        <div className="p-3 border-t border-border bg-card/95">
          <div className="bg-background rounded-xl border border-border px-2 py-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleSearch();
                  }
                }}
                placeholder="Search MCP data sources..."
                className="flex-1 px-2 py-2 text-sm bg-transparent border-none focus:outline-none"
              />
              <button
                onClick={() => void handleSearch()}
                disabled={isSearching || (!searchQuery.trim() && !querySeed)}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm font-medium"
                aria-label="Search"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Search"
                )}
              </button>
            </div>
            {activeSearchCount > 0 ? (
              <p className="text-2xs text-muted-foreground mt-2 px-2">
                Notebook search in progress...
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (collapsed) {
    return renderCollapsedRail("Assistant");
  }

  return (
    <div className="w-[var(--chat-width)] min-w-[var(--chat-width)] h-screen flex flex-col border-l border-border bg-card">
      <div className="h-12 flex items-center justify-between px-4 border-b border-border">
        {isAgent ? (
          <>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MessageSquare className="w-4 h-4" />
              Agent
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-accent rounded transition-colors">
                <Plus className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-1 hover:bg-accent rounded transition-colors">
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button className="p-1 hover:bg-accent rounded transition-colors">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-1 hover:bg-accent rounded transition-colors">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                aria-label={collapseLabel(false)}
                onClick={() => setCollapsed(true)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <PanelRightClose className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-foreground truncate">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">A Friendly Greeting to ...</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-accent rounded transition-colors">
                <Plus className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-1 hover:bg-accent rounded transition-colors">
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button className="p-1 hover:bg-accent rounded transition-colors">
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-1 hover:bg-accent rounded transition-colors">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                aria-label={collapseLabel(false)}
                onClick={() => setCollapsed(true)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <PanelRightClose className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isAgent ? (
          <div className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Recent conversations
            </h3>
            <div className="space-y-0.5">
              {recentConversations.map((conv, i) => (
                <button
                  key={i}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors",
                    i === 0
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{conv}</span>
                    {i === 0 ? (
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : isWorkspaces ? (
          <div className="p-4 space-y-4">
            <div className="bg-background rounded-lg p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hey - this is your Entropy research assistant. Create a
                workspace or open an existing one to get started.
              </p>
            </div>
            <div className="space-y-2">
              {[
                "Show me how workspaces work",
                "What data sources are connected?",
                "Create a workspace for metformin NASH research.",
              ].map((chip, i) => (
                <button
                  key={i}
                  className="w-full text-left px-3 py-2 rounded-md text-[12px] text-muted-foreground bg-accent hover:bg-accent/80 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex justify-end mb-3">
              <div className="bg-accent rounded-lg px-3 py-2 text-sm text-foreground">
                Hey
              </div>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              Hey Alen! How can I help you today? I see you're on the{" "}
              {currentPage} page - want to explore anything specific?
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border">
        <div className="bg-background rounded-lg border border-border">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask something..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground p-3 pb-1 resize-none focus:outline-none min-h-[60px]"
            rows={2}
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-2">
              <button className="w-5 h-5 rounded-full border border-border" />
              <button>
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button className="flex items-center gap-1 text-2xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                30d
              </button>
              <button>
                <Lock className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
            <button className="w-7 h-7 rounded-md bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors">
              <Send className="w-3.5 h-3.5 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
