import { useEffect, useRef, useState } from "react";
import cytoscape, { Core, NodeSingular } from "cytoscape";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Search,
  LayoutGrid,
  Network,
  Clock
} from "lucide-react";
import { GraphNode, GraphEdge } from "@/types/workspace";

interface KnowledgeGraphPanelProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
  highlightedNodes?: string[];
  indiaLens?: boolean;
  mode?: "Researcher" | "Strategist";
}

type LayoutType = "cose" | "breadthfirst" | "circle";
type ViewType = "graph" | "timeline" | "dendrogram";

export default function KnowledgeGraphPanel({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
  highlightedNodes = [],
  indiaLens = false,
  mode = "Researcher",
}: KnowledgeGraphPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [layout, setLayout] = useState<LayoutType>("cose");
  const [view, setView] = useState<ViewType>("graph");

  // Node shape mapping
  const getNodeShape = (type: string): string => {
    const shapeMap: Record<string, string> = {
      disease: "ellipse",
      gene: "ellipse",
      protein: "ellipse",
      drug: "rectangle",
      compound: "rectangle",
      patent: "diamond",
      trial: "hexagon",
      company: "square",
      paper: "round-rectangle",
    };
    return shapeMap[type] || "ellipse";
  };

  // Node color mapping by source
  const getNodeColor = (source: string): string => {
    const colorMap: Record<string, string> = {
      "Open Targets": "#3b82f6", // blue
      "STRING": "#8b5cf6", // purple
      "PubMed": "#10b981", // green
      "Europe PMC": "#059669", // emerald
      "PatentsView": "#f59e0b", // amber
      "OpenFDA": "#ef4444", // red
      "ClinicalTrials.gov": "#06b6d4", // cyan
    };
    return colorMap[source] || "#6b7280"; // gray fallback
  };

  // Edge color mapping by type
  const getEdgeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      association: "#6b7280", // gray
      interaction: "#3b82f6", // blue
      binding: "#8b5cf6", // purple
      ownership: "#f59e0b", // amber
      sponsorship: "#10b981", // green
    };
    return colorMap[type] || "#6b7280";
  };

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    // Clear existing instance
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Convert nodes and edges to Cytoscape format
    const cyNodes = nodes.map((node) => {
      const baseSize = 20 + (node.evidenceScore || 50) / 5; // Size based on evidence score
      const isBiological = ["disease", "gene", "protein"].includes(node.type);
      
      // Visual weighting based on mode
      let opacity = 1;
      let size = baseSize;
      
      if (mode === "Researcher" && !isBiological) {
        opacity = 0.5;
        size = baseSize * 0.7;
      } else if (mode === "Strategist" && isBiological) {
        opacity = 0.6;
        size = baseSize * 0.8;
      }

      return {
        data: {
          id: node.id,
          label: node.label,
          type: node.type,
          source: node.source,
          evidenceScore: node.evidenceScore,
          indiaRelevant: node.indiaRelevant,
        },
        style: {
          shape: getNodeShape(node.type),
          backgroundColor: getNodeColor(node.source),
          width: size,
          height: size,
          label: node.label,
          color: "#fff",
          "text-valign": "center",
          "text-halign": "center",
          fontSize: 10,
          "font-weight": "500",
          opacity: opacity,
          "border-width": node.indiaRelevant && indiaLens ? 3 : 0,
          "border-color": "#f59e0b",
          "border-style": "solid",
        },
      };
    });

    const cyEdges = edges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        confidence: edge.confidence,
      },
      style: {
        width: (edge.confidence || 0.5) * 3,
        lineColor: getEdgeColor(edge.type),
        targetArrowColor: getEdgeColor(edge.type),
        targetArrowShape: "triangle",
        curveStyle: "bezier",
        opacity: 0.6,
      },
    }));

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: cyNodes,
        edges: cyEdges,
      },
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(backgroundColor)" as any,
            label: "data(label)",
          },
        },
        {
          selector: "edge",
          style: {
            width: "data(width)" as any,
            "line-color": "data(lineColor)" as any,
            "target-arrow-color": "data(targetArrowColor)" as any,
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
        {
          selector: ".highlighted",
          style: {
            "border-width": 4,
            "border-color": "#fbbf24",
            "border-style": "solid",
          },
        },
        {
          selector: ".dimmed",
          style: {
            opacity: 0.3,
          },
        },
      ],
      layout: {
        name: layout,
        animate: true,
        animationDuration: 500,
      } as any,
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.2,
    });

    // Node click handler
    cy.on("tap", "node", (event) => {
      const node = event.target as NodeSingular;
      if (onNodeClick) {
        onNodeClick(node.id());
      }
    });

    // Edge click handler
    cy.on("tap", "edge", (event) => {
      const edge = event.target;
      if (onEdgeClick) {
        onEdgeClick(edge.id());
      }
    });

    // Hover effects
    cy.on("mouseover", "node", (event) => {
      const node = event.target as NodeSingular;
      node.style("cursor", "pointer");
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [nodes, edges, layout, mode, indiaLens]);

  // Highlight nodes
  useEffect(() => {
    if (!cyRef.current) return;

    cyRef.current.nodes().removeClass("highlighted dimmed");
    
    if (highlightedNodes.length > 0) {
      cyRef.current.nodes().addClass("dimmed");
      highlightedNodes.forEach((nodeId) => {
        cyRef.current?.getElementById(nodeId).removeClass("dimmed").addClass("highlighted");
      });
    }
  }, [highlightedNodes]);

  // Search functionality
  useEffect(() => {
    if (!cyRef.current || !searchTerm) {
      if (cyRef.current) {
        cyRef.current.nodes().removeClass("highlighted dimmed");
      }
      return;
    }

    const cy = cyRef.current;
    const term = searchTerm.toLowerCase();
    
    cy.nodes().addClass("dimmed");
    
    const matchingNodes = cy.nodes().filter((node) => {
      const label = node.data("label")?.toLowerCase() || "";
      return label.includes(term);
    });

    matchingNodes.removeClass("dimmed").addClass("highlighted");

    if (matchingNodes.length > 0) {
      cy.animate({
        fit: { eles: matchingNodes, padding: 50 },
        duration: 500,
      });
    }
  }, [searchTerm]);

  // Toolbar handlers
  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
    }
  };

  const handleLayoutChange = (newLayout: LayoutType) => {
    setLayout(newLayout);
  };

  if (nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <Network className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground">No nodes yet</p>
          <p className="text-sm text-muted-foreground">
            Submit a query to start building the knowledge graph
          </p>
        </div>
      </div>
    );
  }

  if (view === "timeline") {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground">Timeline View</p>
          <p className="text-sm text-muted-foreground">
            Chronological timeline coming in later phase...
          </p>
          <button
            onClick={() => setView("graph")}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
          >
            Back to Graph
          </button>
        </div>
      </div>
    );
  }

  if (view === "dendrogram") {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <LayoutGrid className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground">Dendrogram View</p>
          <p className="text-sm text-muted-foreground">
            Hierarchical tree coming in later phase...
          </p>
          <button
            onClick={() => setView("graph")}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
          >
            Back to Graph
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative bg-background">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-[200px]"
          />
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-md">
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-accent rounded-l-md transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-accent transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={handleFit}
            className="p-1.5 hover:bg-accent rounded-r-md transition-colors"
            title="Fit to screen"
          >
            <Maximize2 className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {/* Layout selector */}
        <select
          value={layout}
          onChange={(e) => handleLayoutChange(e.target.value as LayoutType)}
          className="px-3 py-1.5 bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="cose">Force-directed</option>
          <option value="breadthfirst">Hierarchical</option>
          <option value="circle">Circular</option>
        </select>

        {/* View variant pills */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-md p-0.5">
          <button
            onClick={() => setView("graph")}
            className={`px-3 py-1 rounded-md text-[13px] font-medium transition-colors ${
              view === "graph" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Graph
          </button>
          <button
            onClick={() => setView("timeline")}
            className={`px-3 py-1 rounded-md text-[13px] font-medium transition-colors ${
              view === "timeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setView("dendrogram")}
            className={`px-3 py-1 rounded-md text-[13px] font-medium transition-colors ${
              view === "dendrogram" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Dendrogram
          </button>
          <button
            onClick={() => setView("dendrogram")}
            className={`px-3 py-1 rounded-md text-[13px] font-medium transition-colors ${
              view === "dendrogram" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Dendrogram
          </button>
        </div>
      </div>

      {/* Provenance panel */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="bg-card/95 border border-border rounded-lg px-4 py-2 text-2xs text-muted-foreground backdrop-blur-sm">
          Graph contains <span className="text-foreground font-medium">{nodes.length} nodes</span> and{" "}
          <span className="text-foreground font-medium">{edges.length} edges</span> from{" "}
          <span className="text-foreground font-medium">
            {new Set(nodes.map((n) => n.source)).size} sources
          </span>{" "}
          — Last updated: <span className="text-foreground">just now</span>
        </div>
      </div>

      {/* Cytoscape container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
