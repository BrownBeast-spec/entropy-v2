// Workspace data types for Entropy

export type NodeType = 
  | "disease" 
  | "gene" 
  | "protein" 
  | "drug" 
  | "compound" 
  | "patent" 
  | "trial" 
  | "company" 
  | "paper";

export type DataSource = 
  | "Open Targets" 
  | "STRING" 
  | "PubMed" 
  | "PatentsView" 
  | "OpenFDA" 
  | "ClinicalTrials.gov" 
  | "Europe PMC";

export type EdgeType = 
  | "association" 
  | "interaction" 
  | "binding" 
  | "ownership" 
  | "sponsorship"
  | "inferred_relationship"; // NEW for LLM-inferred edges

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  source: DataSource;
  metadata: Record<string, any>;
  evidenceScore?: number;
  addedByQuery: string; // Query ID that added this node
  indiaRelevant?: boolean; // For India Lens highlighting
}

export interface GraphEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  type: EdgeType;
  confidence?: number;
  metadata: Record<string, any>;
  inferredBy?: "LLM" | "heuristic" | "manual"; // NEW: How edge was created
  reasoning?: string; // NEW: LLM reasoning trace for inferred edges
}

export type WorkspaceMode = "Researcher" | "Strategist";

export type QueryStatus = "pending" | "running" | "complete" | "failed";

export interface Query {
  id: string;
  workspaceId: string;
  text: string;
  mode: WorkspaceMode;
  indiaLens: boolean;
  timelineStart?: Date;
  timelineEnd?: Date;
  submittedAt: Date;
  status: QueryStatus;
  contributedNodes: string[]; // Node IDs added by this query
  contributedEdges: string[]; // Edge IDs added by this query
  completenessScore?: number;
  iterations?: number;
  report?: Report;
}

export interface SavedItem {
  id: string;
  nodeId: string;
  workspaceId: string;
  savedAt: Date;
}

export interface Citation {
  id: string;
  nodeId: string; // Links to graph node
  source: string;
  label: string; // Display text for badge
}

export interface ReportSection {
  title: string;
  content: string; // Markdown or HTML with citation badges
  citations: Citation[];
}

export interface Report {
  workspaceId: string;
  sections: ReportSection[];
  generatedAt: Date;
  wordCount: number;
  graphNodeCountAtGeneration?: number;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  mode?: WorkspaceMode;
  indiaLens?: boolean;
  createdAt: Date;
  updatedAt: Date;
  nodes: GraphNode[];
  edges: GraphEdge[];
  queries: Query[];
  activeQueryId?: string;
  savedItems: SavedItem[];
  report?: Report;
}
