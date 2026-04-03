import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useWorkspace, useWorkspaceActions } from "@/contexts/WorkspaceContext";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import KnowledgeGraphPanel from "@/components/workspace/KnowledgeGraphPanel";
import IntermediateReportPanel from "@/components/workspace/IntermediateReportPanel";
import ResearchProgressOverlay from "@/components/workspace/ResearchProgressOverlay";
import EntityDetailDrawer from "@/components/workspace/EntityDetailDrawer";
import { demoNodes, demoEdges } from "@/lib/data/demoGraphData";
import { getSuggestedQueries, getQueryPlaceholder } from "@/lib/data/suggestedQueries";
import { Query, GraphNode } from "@/types/workspace";
import { augmentWorkspace } from "@/lib/api/augmentation";

export default function WorkspaceView() {
  const { id } = useParams<{ id: string }>();
  const { currentWorkspace, setCurrentWorkspace, workspaces } = useWorkspace();
  const { addNode, addEdge, addQuery, updateWorkspace, removeNode, toggleSavedItem } = useWorkspaceActions();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showDemoData, setShowDemoData] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [showResearchProgress, setShowResearchProgress] = useState(false);
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (id) {
      const workspace = workspaces.find((ws) => ws.id === id);
      if (workspace) {
        setCurrentWorkspace(workspace);
      }
    }
  }, [id, workspaces, setCurrentWorkspace]);

  // Load demo data for visualization
  const handleLoadDemoData = () => {
    if (!currentWorkspace) return;
    
    demoNodes.forEach((node) => addNode(node));
    demoEdges.forEach((edge) => addEdge(edge));
    setShowDemoData(true);
  };

  // Submit query
  const handleSubmitQuery = async () => {
    if (!currentWorkspace || !queryText.trim()) return;

    const query: Query = {
      id: `query_${Date.now()}`,
      workspaceId: currentWorkspace.id,
      text: queryText,
      mode: currentWorkspace.mode,
      indiaLens: currentWorkspace.indiaLens,
      submittedAt: new Date(),
      status: "running",
      contributedNodes: [],
      contributedEdges: [],
    };

    addQuery(query);
    setShowResearchProgress(true);

    try {
      const graphSnapshot = {
        nodeIds: currentWorkspace.nodes.map((n) => n.id),
        edgeSummary: currentWorkspace.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
        })),
      };

      const result = await augmentWorkspace({
        query: queryText,
        graphSnapshot,
        personaMode: currentWorkspace.mode,
        indiaLens: currentWorkspace.indiaLens,
        workspaceId: currentWorkspace.id,
      });

      if (Array.isArray(result.newNodes)) {
        result.newNodes.forEach((nodeLike, idx) => {
          const id = typeof nodeLike.id === "string" ? nodeLike.id : `node_${Date.now()}_${idx}`;
          const label = typeof nodeLike.label === "string" ? nodeLike.label : id;
          const type =
            typeof nodeLike.type === "string"
              ? (nodeLike.type as GraphNode["type"])
              : ("protein" as GraphNode["type"]);

          addNode({
            id,
            label,
            type,
            source: "Open Targets",
            metadata: typeof nodeLike.data === "object" && nodeLike.data !== null
              ? (nodeLike.data as Record<string, any>)
              : {},
            addedByQuery: query.id,
          });
        });
      }

      if (Array.isArray(result.newEdges)) {
        result.newEdges.forEach((edgeLike, idx) => {
          if (typeof edgeLike.source !== "string" || typeof edgeLike.target !== "string") {
            return;
          }

          addEdge({
            id: typeof edgeLike.id === "string" ? edgeLike.id : `edge_${Date.now()}_${idx}`,
            source: edgeLike.source,
            target: edgeLike.target,
            type:
              typeof edgeLike.type === "string"
                ? (edgeLike.type as any)
                : "association",
            confidence:
              typeof edgeLike.confidence === "number"
                ? edgeLike.confidence
                : undefined,
            metadata:
              typeof edgeLike === "object" && edgeLike !== null
                ? (edgeLike as Record<string, any>)
                : {},
          });
        });
      }

      handleResearchComplete(
        Array.isArray(result.newNodes) ? result.newNodes.length : 0,
        Array.isArray(result.newEdges) ? result.newEdges.length : 0,
      );
    } catch {
      // Fallback to demo behavior if API is unavailable in local scaffold mode
      handleResearchComplete(0, 0);
    }
  };

  // Handle research completion
  const handleResearchComplete = (nodesAdded: number, edgesAdded: number) => {
    // In real implementation, this would add actual nodes from MCP tools
    // For demo, we just load the demo data
    if (!showDemoData) {
      handleLoadDemoData();
    }

    setShowResearchProgress(false);
    setQueryText("");
  };

  // Handle research cancellation
  const handleResearchCancel = () => {
    setShowResearchProgress(false);
  };

  // Get suggested queries based on mode
  const suggestedQueries = currentWorkspace 
    ? getSuggestedQueries(currentWorkspace.mode, currentWorkspace.indiaLens)
    : [];

  // Get query placeholder
  const queryPlaceholder = currentWorkspace
    ? getQueryPlaceholder(currentWorkspace.mode, currentWorkspace.indiaLens)
    : "";

  // Handle query history click
  const handleQueryHistoryClick = (query: Query) => {
    setHighlightedNodes(query.contributedNodes);
  };

  // Handle mode toggle
  const handleModeToggle = (mode: "Researcher" | "Strategist") => {
    if (!currentWorkspace) return;
    updateWorkspace({ ...currentWorkspace, mode });
  };

  // Handle India Lens toggle
  const handleIndiaLensToggle = () => {
    if (!currentWorkspace) return;
    updateWorkspace({ ...currentWorkspace, indiaLens: !currentWorkspace.indiaLens });
  };

  // Handle node click - open drawer
  const handleNodeClick = (nodeId: string) => {
    const node = currentWorkspace?.nodes.find((n) => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setDrawerOpen(true);
    }
  };

  // Handle pin node
  const handlePinNode = (nodeId: string) => {
    toggleSavedItem(nodeId);
  };

  // Handle remove node
  const handleRemoveNode = (nodeId: string) => {
    removeNode(nodeId);
  };

  // Handle find connections
  const handleFindConnections = (nodeId: string) => {
    // For now, just highlight the node and its neighbors
    if (!currentWorkspace) return;
    
    const connectedNodeIds = currentWorkspace.edges
      .filter((e) => e.source === nodeId || e.target === nodeId)
      .flatMap((e) => [e.source, e.target])
      .filter((id) => id !== nodeId);
    
    setHighlightedNodes([nodeId, ...connectedNodeIds]);
  };

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">Workspace not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Research progress overlay */}
      {showResearchProgress && (
        <ResearchProgressOverlay
          query={queryText}
          onComplete={handleResearchComplete}
          onCancel={handleResearchCancel}
        />
      )}

      {/* Entity detail drawer */}
      <EntityDetailDrawer
        node={selectedNode}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onPin={handlePinNode}
        onRemove={handleRemoveNode}
        onFindConnections={handleFindConnections}
      />

      {/* Custom top bar for workspace (replaces AppShell top bar when in workspace) */}
      <div className="h-12 flex items-center justify-between px-6 border-b border-border bg-card">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Entropy</span>
          <span className="text-muted-foreground">›</span>
          <span className="text-foreground font-medium">{currentWorkspace.name}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Persona Toggle */}
          <div className="flex items-center gap-1 bg-accent border border-border rounded-lg p-0.5">
            <button
              onClick={() => handleModeToggle("Researcher")}
              className={`px-3 py-1 rounded-md text-[13px] font-medium transition-colors ${
                currentWorkspace.mode === "Researcher" 
                  ? "bg-blue-500/20 text-blue-400" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Researcher
            </button>
            <button
              onClick={() => handleModeToggle("Strategist")}
              className={`px-3 py-1 rounded-md text-[13px] font-medium transition-colors ${
                currentWorkspace.mode === "Strategist" 
                  ? "bg-amber-500/20 text-amber-400" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Strategist
            </button>
          </div>
          
          {/* India Lens Toggle */}
          <label className="flex items-center gap-2 text-[13px] text-muted-foreground cursor-pointer">
            <input 
              type="checkbox" 
              className="rounded" 
              checked={currentWorkspace.indiaLens} 
              onChange={handleIndiaLensToggle}
            />
            <span>India Lens</span>
          </label>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left Sidebar - Query Panel */}
        <div className={`${sidebarCollapsed ? 'w-12' : 'w-[280px]'} border-r border-border bg-card transition-all duration-200 flex flex-col`}>
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center py-4 gap-4">
              <button 
                onClick={() => setSidebarCollapsed(false)}
                className="p-2 hover:bg-accent rounded-md transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Research Query</h3>
                <button 
                  onClick={() => setSidebarCollapsed(true)}
                  className="p-1 hover:bg-accent rounded-md transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Add to graph input */}
                <div>
                  <label className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                    Add to Graph
                  </label>
                  <textarea
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    placeholder={queryPlaceholder}
                    className="w-full bg-accent border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                    rows={4}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleSubmitQuery();
                      }
                    }}
                  />
                  <button 
                    onClick={handleSubmitQuery}
                    disabled={!queryText.trim()}
                    className="w-full mt-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Query
                  </button>
                </div>

                {/* Suggested questions */}
                <div>
                  <h4 className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Suggested Next Questions
                  </h4>
                  <div className="space-y-1">
                    {suggestedQueries.map((suggestedQuery, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setQueryText(suggestedQuery)}
                        className="w-full text-left px-3 py-2 rounded-md text-[12px] text-muted-foreground bg-accent hover:bg-accent/80 transition-colors"
                      >
                        {suggestedQuery}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Query history */}
                <div>
                  <h4 className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Query History
                  </h4>
                  {currentWorkspace.queries.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No queries yet</p>
                  ) : (
                    <div className="space-y-1">
                      {currentWorkspace.queries.map((query) => (
                        <button
                          key={query.id}
                          onClick={() => handleQueryHistoryClick(query)}
                          className="w-full text-left px-3 py-2 rounded-md text-[12px] bg-accent/50 hover:bg-accent transition-colors"
                        >
                          <p className="text-foreground truncate">{query.text}</p>
                          <p className="text-muted-foreground text-2xs mt-0.5">
                            {query.contributedNodes.length} nodes added
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Saved items */}
                <div>
                  <h4 className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Saved Items
                  </h4>
                  {currentWorkspace.savedItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No saved items</p>
                  ) : (
                    <div className="space-y-1">
                      {currentWorkspace.savedItems.map((item) => (
                        <div key={item.id} className="px-3 py-2 rounded-md text-[12px] bg-accent/50 text-foreground">
                          Saved item {item.nodeId.substring(0, 8)}...
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right side - Graph and Report panels */}
        <ResizablePanelGroup direction="vertical" className="flex-1">
          {/* Top: Knowledge Graph Panel */}
          <ResizablePanel defaultSize={55} minSize={30}>
            {currentWorkspace.nodes.length === 0 && !showDemoData ? (
              <div className="h-full bg-background border-b border-border flex items-center justify-center">
                <div className="text-center space-y-4">
                  <p className="text-lg font-semibold text-foreground">Knowledge Graph Canvas</p>
                  <p className="text-sm text-muted-foreground">
                    No nodes yet — submit a query to start building the graph
                  </p>
                  <button
                    onClick={handleLoadDemoData}
                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                  >
                    Load Demo Data (16 nodes, 20 edges)
                  </button>
                </div>
              </div>
            ) : (
              <KnowledgeGraphPanel
                nodes={currentWorkspace.nodes}
                edges={currentWorkspace.edges}
                mode={currentWorkspace.mode}
                indiaLens={currentWorkspace.indiaLens}
                highlightedNodes={highlightedNodes}
                onNodeClick={handleNodeClick}
                onEdgeClick={(edgeId) => console.log("Edge clicked:", edgeId)}
              />
            )}
          </ResizablePanel>

          <ResizableHandle />

          {/* Bottom: Intermediate Report Panel */}
          <ResizablePanel defaultSize={45} minSize={20}>
            <IntermediateReportPanel
              report={currentWorkspace.report}
              mode={currentWorkspace.mode}
              onRegenerateSynthesis={() => console.log("Regenerate synthesis")}
              onGenerateFullDossier={() => console.log("Generate full dossier")}
              onCitationClick={(nodeId) => console.log("Citation clicked:", nodeId)}
              onExport={(format) => console.log("Export as:", format)}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
