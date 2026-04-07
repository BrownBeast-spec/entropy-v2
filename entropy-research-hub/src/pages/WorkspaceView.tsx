import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useWorkspace, useWorkspaceActions } from "@/contexts/WorkspaceContext";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import KnowledgeGraphPanel from "@/components/workspace/KnowledgeGraphPanel";
import IntermediateReportPanel from "@/components/workspace/IntermediateReportPanel";
import EntityDetailDrawer from "@/components/workspace/EntityDetailDrawer";
import { demoNodes, demoEdges } from "@/lib/data/demoGraphData";
import { GraphNode } from "@/types/workspace";
import { generateSynthesis } from "@/lib/api/synthesis";
import { generateDossier } from "@/lib/api/dossier";

export default function WorkspaceView() {
  const { id, workspaceId, queryId } = useParams<{
    id?: string;
    workspaceId?: string;
    queryId?: string;
  }>();
  const resolvedWorkspaceId = workspaceId ?? id;
  const { currentWorkspace, setCurrentWorkspace, workspaces } = useWorkspace();
  const {
    updateWorkspace,
    removeNode,
    toggleSavedItem,
  } = useWorkspaceActions();
  const [showDemoData, setShowDemoData] = useState(false);
  const [requestNotice, setRequestNotice] = useState<string | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const activeQuery = useMemo(() => {
    if (!currentWorkspace) return undefined;

    if (queryId) {
      const byRoute = currentWorkspace.queries.find((query) => query.id === queryId);
      if (byRoute) return byRoute;
    }

    if (currentWorkspace.activeQueryId) {
      const byActive = currentWorkspace.queries.find(
        (query) => query.id === currentWorkspace.activeQueryId,
      );
      if (byActive) return byActive;
    }

    return currentWorkspace.queries[currentWorkspace.queries.length - 1];
  }, [currentWorkspace, queryId]);

  const personaMode = activeQuery?.mode ?? currentWorkspace?.mode ?? "Researcher";
  const indiaLens = activeQuery?.indiaLens ?? currentWorkspace?.indiaLens ?? false;
  const activeReport = activeQuery?.report ?? currentWorkspace?.report;

  const handleGenerateFullDossier = async () => {
    if (!currentWorkspace || !activeReport) return;

    const latestQuery = activeQuery?.text ?? "Generated from current workspace graph";

    try {
      const result = await generateDossier({
        workspaceId: currentWorkspace.id,
        query: latestQuery,
        personaMode,
        reportSections: activeReport.sections,
      });

      console.log("Dossier generated:", result.filename);
    } catch (error) {
      console.error("Failed to generate dossier", error);
    }
  };

  useEffect(() => {
    if (resolvedWorkspaceId) {
      const workspace = workspaces.find((ws) => ws.id === resolvedWorkspaceId);
      if (workspace) {
        setCurrentWorkspace(workspace);
      }
    }
  }, [resolvedWorkspaceId, workspaces, setCurrentWorkspace]);

  // Load demo data for visualization
  const handleLoadDemoData = () => {
    if (!currentWorkspace) return;

    // Add all nodes and edges in a single update to avoid race conditions
    updateWorkspace({
      ...currentWorkspace,
      nodes: [...currentWorkspace.nodes, ...demoNodes],
      edges: [...currentWorkspace.edges, ...demoEdges],
    });
    setShowDemoData(true);
  };

  const handleRegenerateSynthesis = async () => {
    if (!currentWorkspace || isRegenerating) return;

    setIsRegenerating(true);
    setRequestNotice(null);

    try {
      const synthesis = await generateSynthesis({
        graphSnapshot: {
          nodes: currentWorkspace.nodes,
          edges: currentWorkspace.edges,
        },
        personaMode,
        reportSections:
          personaMode === "Researcher"
            ? ["Overview", "Key Targets and Evidence", "Safety Signals"]
            : [
                "Overview",
                "Competitive Landscape",
                "Strategic Recommendations",
              ],
      });

      if (synthesis.sections.length > 0) {
        const nextReport = {
          workspaceId: currentWorkspace.id,
          sections: synthesis.sections,
          generatedAt: new Date(),
          wordCount: synthesis.sections
            .map((section) => section.content)
            .join(" ")
            .split(/\s+/)
            .filter(Boolean).length,
          graphNodeCountAtGeneration: currentWorkspace.nodes.length,
        };

        const updatedQueries = activeQuery
          ? currentWorkspace.queries.map((query) =>
              query.id === activeQuery.id ? { ...query, report: nextReport } : query,
            )
          : currentWorkspace.queries;

        await updateWorkspace({
          ...currentWorkspace,
          queries: updatedQueries,
          activeQueryId: activeQuery?.id ?? currentWorkspace.activeQueryId,
          report: activeQuery ? currentWorkspace.report : nextReport,
        });
      }
    } catch {
      setRequestNotice("Could not regenerate report. Try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Handle node click - open drawer
  const handleNodeClick = (nodeId: string) => {
    const node = currentWorkspace?.nodes.find((n) => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setDrawerOpen(true);
    }
  };

  const handleCitationClick = (nodeId: string) => {
    setHighlightedNodes([nodeId]);
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
          <span className="text-foreground font-medium">
            {currentWorkspace.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-2xs px-2 py-0.5 rounded-full bg-accent text-foreground border border-border">
            {personaMode}
          </span>
        </div>
      </div>

      {/* Workspace layout: graph + report (search is in RightChatPanel) */}
      <div className="flex-1 flex min-h-0">
        <ResizablePanelGroup direction="vertical" className="flex-1 min-w-0 border-r border-border">
          <ResizablePanel defaultSize={58} minSize={30}>
            {currentWorkspace.nodes.length === 0 && !showDemoData ? (
              <div className="h-full bg-background flex items-center justify-center relative">
                <div className="text-center space-y-4">
                  <p className="text-lg font-semibold text-foreground">
                    Knowledge Graph Canvas
                  </p>
                  <p className="text-sm text-muted-foreground">
                    No nodes yet - use Search in the right panel to build your graph
                  </p>
                  <button
                    onClick={handleLoadDemoData}
                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                  >
                    Load Demo Data (16 nodes, 20 edges)
                  </button>
                </div>

                <div className="absolute bottom-4 left-4 right-4">
                  <div
                    data-testid="workspace-provenance-summary"
                    className="bg-card/95 border border-border rounded-lg px-4 py-2 text-2xs text-muted-foreground backdrop-blur-sm"
                  >
                    Graph contains{" "}
                    <span className="text-foreground font-medium">
                      {currentWorkspace.nodes.length} nodes
                    </span>{" "}
                    and{" "}
                    <span className="text-foreground font-medium">
                      {currentWorkspace.edges.length} edges
                    </span>{" "}
                    from{" "}
                    <span className="text-foreground font-medium">0 sources</span>
                    {" "}- Last updated: <span className="text-foreground">just now</span>
                  </div>
                </div>
              </div>
            ) : (
                <KnowledgeGraphPanel
                  nodes={currentWorkspace.nodes}
                  edges={currentWorkspace.edges}
                  mode={personaMode}
                  indiaLens={indiaLens}
                  highlightedNodes={highlightedNodes}
                  onNodeClick={handleNodeClick}
                  onEdgeClick={(edgeId) => console.log("Edge clicked:", edgeId)}
              />
            )}
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={42} minSize={20}>
            <div className="h-full bg-card">
              {requestNotice ? (
                <div className="border-b border-border px-4 py-2 text-xs text-amber-400">
                  {requestNotice}
                </div>
              ) : null}
              <IntermediateReportPanel
                report={activeReport}
                mode={personaMode}
                queryText={activeQuery?.text ?? ""}
                onRegenerateSynthesis={() => void handleRegenerateSynthesis()}
                onGenerateFullDossier={() => void handleGenerateFullDossier()}
                onCitationClick={handleCitationClick}
                onExport={(format) => console.log("Export as:", format)}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
