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
  Search as SearchIcon,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { useWorkspace, useWorkspaceActions } from "@/contexts/WorkspaceContext";
import { searchWorkspace, type SearchResult } from "@/lib/api/search";
import { addNodesToWorkspace } from "@/lib/api/addNodes";
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

export default function RightChatPanel() {
  const location = useLocation();
  const { queryId: routeQueryId } = useParams<{ queryId?: string }>();
  const { currentWorkspace } = useWorkspace();
  const { addNode, addEdge } = useWorkspaceActions();
  const [message, setMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResultIds, setSelectedResultIds] = useState<Set<string>>(
    new Set(),
  );
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchedSources, setSearchedSources] = useState<string[]>([]);
  const [sourceDiagnostics, setSourceDiagnostics] = useState<
    Record<string, string>
  >({});
  const [indiaLensFilter, setIndiaLensFilter] = useState(false);
  const [timelineStart, setTimelineStart] = useState("");
  const [timelineEnd, setTimelineEnd] = useState("");

  const isAgent = location.pathname === "/agent";
  const isWorkspaces = location.pathname === "/workspaces" || location.pathname === "/";
  const isWorkspace = location.pathname.startsWith("/workspaces/");

  const activeQuery = currentWorkspace
    ? currentWorkspace.queries.find((query) => query.id === routeQueryId) ??
      currentWorkspace.queries.find(
        (query) => query.id === currentWorkspace.activeQueryId,
      ) ??
      currentWorkspace.queries[currentWorkspace.queries.length - 1]
    : undefined;

  const currentPage = Object.entries(pageNames).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] || "Topics";

  const handleSearch = async () => {
    if (!currentWorkspace || !searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await searchWorkspace({
        query: searchQuery,
        graphSnapshot: {
          nodeIds: currentWorkspace.nodes.map((n) => n.id),
          edgeSummary: currentWorkspace.edges.map((e) => ({
            source: e.source,
            target: e.target,
            type: e.type,
          })),
        },
        personaMode: currentWorkspace.mode,
        indiaLens: indiaLensFilter,
        workspaceId: currentWorkspace.id,
        queryId: activeQuery?.id,
        timelineStart: timelineStart || undefined,
        timelineEnd: timelineEnd || undefined,
      });

      setSearchResults(response.results);
      setSearchedSources(response.searchedSources);
      setSourceDiagnostics(response.sourceDiagnostics ?? {});
      setSelectedResultIds(new Set());
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Search failed");
      setSearchedSources([]);
      setSourceDiagnostics({});
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleResult = (id: string) => {
    const newSelected = new Set(selectedResultIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedResultIds(newSelected);
  };

  const handleAddToGraph = async () => {
    if (!currentWorkspace || selectedResultIds.size === 0) return;

    const selected = searchResults.filter((r) => selectedResultIds.has(r.id));
    const currentQuery = activeQuery;

    try {
      const response = await addNodesToWorkspace({
        workspaceId: currentWorkspace.id,
        queryId: currentQuery?.id || `query_${Date.now()}`,
        selectedResults: selected,
      });

      response.addedNodes.forEach((node) => addNode(node));
      response.addedEdges.forEach((edge) => addEdge(edge));

      setSelectedResultIds(new Set());
    } catch (error) {
      console.error("Failed to add nodes:", error);
    }
  };

  if (isWorkspace && currentWorkspace) {
    return (
      <div className="w-[340px] min-w-[340px] h-screen flex flex-col border-l border-border bg-card">
        <div className="h-12 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <SearchIcon className="w-4 h-4" />
            Search
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1 hover:bg-accent rounded transition-colors">
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="p-3 border-b border-border">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <label className="text-2xs text-muted-foreground flex items-center gap-2">
              <input
                aria-label="India Lens"
                type="checkbox"
                checked={indiaLensFilter}
                onChange={(e) => setIndiaLensFilter(e.target.checked)}
                className="rounded border-border"
              />
              India Lens
            </label>
            <label className="text-2xs text-muted-foreground flex flex-col gap-1">
              Timeline Start
              <input
                aria-label="Timeline Start"
                type="date"
                value={timelineStart}
                onChange={(e) => setTimelineStart(e.target.value)}
                className="px-2 py-1 text-2xs bg-background border border-border rounded"
              />
            </label>
            <label className="text-2xs text-muted-foreground flex flex-col gap-1 col-span-2">
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
              className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => void handleSearch()}
              disabled={isSearching || !searchQuery.trim()}
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
          {searchError && (
            <p className="text-2xs text-destructive mt-2">{searchError}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {searchResults.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground mb-2">
                Results ({searchResults.length}) - Sort: Helpfulness
              </div>
              <div className="text-2xs text-muted-foreground mb-2">
                Sources: {searchedSources.length} successful
                {Object.keys(sourceDiagnostics).length > 0
                  ? `, ${Object.keys(sourceDiagnostics).length} unavailable`
                  : ""}
              </div>
              {searchResults.map((result) => (
                <SearchResultCard
                  key={result.id}
                  result={result}
                  selected={selectedResultIds.has(result.id)}
                  onToggle={handleToggleResult}
                  onViewDetails={() => {
                    // Reuse EntityDetailDrawer in workspace context (Phase 2 follow-up).
                  }}
                />
              ))}
              {Object.keys(sourceDiagnostics).length > 0 ? (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-2xs text-amber-200 space-y-1">
                  {Object.entries(sourceDiagnostics).map(([source, reason]) => (
                    <p key={source}>
                      {source}: {reason}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              {isSearching ? "Searching..." : "Enter a query to search"}
            </div>
          )}
        </div>

        {selectedResultIds.size > 0 && (
          <div className="p-3 border-t border-border bg-accent/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {selectedResultIds.size} selected
              </span>
            </div>
            <button
              onClick={() => void handleAddToGraph()}
              disabled={selectedResultIds.size === 0}
              className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm font-medium"
            >
              Add Selected to Graph
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-[340px] min-w-[340px] h-screen flex flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border">
        {isAgent ? (
          <>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MessageSquare className="w-4 h-4" />
              Agent
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-accent rounded transition-colors"><Plus className="w-4 h-4 text-muted-foreground" /></button>
              <button className="p-1 hover:bg-accent rounded transition-colors"><SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" /></button>
              <button className="p-1 hover:bg-accent rounded transition-colors"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
              <button className="p-1 hover:bg-accent rounded transition-colors"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-foreground truncate">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="truncate">A Friendly Greeting to ...</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1 hover:bg-accent rounded transition-colors"><Plus className="w-4 h-4 text-muted-foreground" /></button>
              <button className="p-1 hover:bg-accent rounded transition-colors"><SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" /></button>
              <button className="p-1 hover:bg-accent rounded transition-colors"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
              <button className="p-1 hover:bg-accent rounded transition-colors"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
            </div>
          </>
        )}
      </div>

      {/* Chat content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isAgent ? (
          <div className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Recent conversations</h3>
            <div className="space-y-0.5">
              {recentConversations.map((conv, i) => (
                <button
                  key={i}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors",
                    i === 0 ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{conv}</span>
                    {i === 0 && <MoreHorizontal className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : isWorkspaces ? (
          <div className="p-4 space-y-4">
            <div className="bg-background rounded-lg p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hey — this is your Entropy research assistant. Create a workspace or open an existing one to get started.
              </p>
            </div>
            <div className="space-y-2">
              {["Show me how workspaces work", "What data sources are connected?", "Create a workspace for metformin NASH research."].map((chip, i) => (
                <button key={i} className="w-full text-left px-3 py-2 rounded-md text-[12px] text-muted-foreground bg-accent hover:bg-accent/80 transition-colors">
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex justify-end mb-3">
              <div className="bg-accent rounded-lg px-3 py-2 text-sm text-foreground">Hey</div>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              Hey Alen! 👋 How can I help you today? I see you're on the {currentPage} page — want to explore any specific topics, trends, or anything else?
            </div>
          </div>
        )}
      </div>

      {/* Input */}
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
              <button><SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" /></button>
              <button className="flex items-center gap-1 text-2xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                30d
              </button>
              <button><Lock className="w-3 h-3 text-muted-foreground" /></button>
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

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
