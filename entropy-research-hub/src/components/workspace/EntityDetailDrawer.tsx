import {
  X,
  Pin,
  Trash2,
  Network,
  ExternalLink,
  Calendar,
  Building2,
  FileText,
  Beaker,
  Loader2,
  Sparkles,
} from "lucide-react";
import { GraphNode } from "@/types/workspace";
import { useState, useEffect } from "react";

interface EnrichedEntity {
  fullDetails: Record<string, unknown>;
  synopsisData: Record<string, string>;
  formattedSynopsis: string;
  relevanceExplanation: string;
  enrichedAt: string;
}

interface EntityDetailDrawerProps {
  node: GraphNode | null;
  isOpen: boolean;
  onClose: () => void;
  onPin: (nodeId: string) => void;
  onRemove: (nodeId: string) => void;
  onFindConnections: (nodeId: string) => void;
}

export default function EntityDetailDrawer({
  node,
  isOpen,
  onClose,
  onPin,
  onRemove,
  onFindConnections,
}: EntityDetailDrawerProps) {
  const [enrichedData, setEnrichedData] = useState<EnrichedEntity | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  // Fetch enriched data when drawer opens
  useEffect(() => {
    console.log("[EntityDetailDrawer] useEffect triggered", {
      nodeId: node?.id,
      isOpen,
      nodeExists: !!node,
    });

    if (!node || !isOpen) {
      setEnrichedData(null);
      setIsEnriching(false);
      setEnrichError(null);
      return;
    }

    const fetchEnrichedData = async () => {
      console.log("[EntityDetailDrawer] Starting fetch for node:", node.id);
      setIsEnriching(true);
      setEnrichError(null);

      try {
        const url = `/api/entity/${node.id}/enrich`;
        console.log("[EntityDetailDrawer] Fetching:", url);

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ node }),
        });

        console.log("[EntityDetailDrawer] Response status:", response.status);

        if (!response.ok) {
          throw new Error(`Failed to enrich entity: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("[EntityDetailDrawer] Received data:", data);
        setEnrichedData(data);
      } catch (err) {
        setEnrichError(err instanceof Error ? err.message : "Unknown error");
        console.error("[EntityDetailDrawer] Enrichment error:", err);
      } finally {
        setIsEnriching(false);
      }
    };

    fetchEnrichedData();
  }, [node?.id, isOpen]);

  if (!node) return null;

  // Metadata is already comprehensive from search-time enrichment
  const displayData = node.metadata;

  // Render entity-specific content based on node type
  const renderEntityContent = () => {
    switch (node.type) {
      case "protein":
      case "gene": {
        const uniprotId = displayData?.accession || displayData?.uniprotId || node.metadata?.uniprotId;
        const proteinName = displayData?.protein_name || displayData?.fullName || node.metadata?.fullName;
        const geneName = displayData?.gene_name || node.metadata?.geneName;
        const organism = displayData?.organism || node.metadata?.organism;
        
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Protein Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Full Name:</span>
                  <span className="text-foreground font-medium">
                    {proteinName || "N/A"}
                  </span>
                </div>
                {geneName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gene:</span>
                    <span className="text-foreground font-medium">
                      {geneName}
                    </span>
                  </div>
                )}
                {organism && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Organism:</span>
                    <span className="text-foreground">
                      {organism}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UniProt ID:</span>
                  <a
                    href={`https://www.uniprot.org/uniprot/${uniprotId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {uniprotId}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Evidence Score:</span>
                  <span className="text-foreground font-medium">
                    {node.evidenceScore}/100
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Data Source
              </h4>
              <p className="text-sm text-foreground">{node.source}</p>
            </div>
          </div>
        );
      }

      case "drug":
      case "compound": {
        const pubchemId = displayData?.cid || displayData?.pubchemId || node.metadata?.pubchemId;
        const chemblId = displayData?.chemblId || node.metadata?.chemblId;
        const molecularFormula = displayData?.molecular_formula || displayData?.molecularFormula;
        const molecularWeight = displayData?.molecular_weight || displayData?.molecularWeight;
        
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Drug Information
              </h4>
              <div className="space-y-2 text-sm">
                {molecularFormula && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Formula:</span>
                    <span className="text-foreground font-medium">
                      {molecularFormula}
                    </span>
                  </div>
                )}
                {molecularWeight && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mol. Weight:</span>
                    <span className="text-foreground">
                      {molecularWeight} g/mol
                    </span>
                  </div>
                )}
                {pubchemId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PubChem ID:</span>
                    <a
                      href={`https://pubchem.ncbi.nlm.nih.gov/compound/${pubchemId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {pubchemId}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {chemblId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ChEMBL ID:</span>
                    <a
                      href={`https://www.ebi.ac.uk/chembl/compound_report_card/${chemblId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {chemblId}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Evidence Score:</span>
                  <span className="text-foreground font-medium">
                    {node.evidenceScore}/100
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Data Source
              </h4>
              <p className="text-sm text-foreground">{node.source}</p>
            </div>
          </div>
        );
      }

      case "patent": {
        const patentNumber = displayData?.patent_number || node.metadata?.patentNumber || node.label;
        const title = displayData?.title || node.metadata?.title;
        const assignee = displayData?.assignee || node.metadata?.assignee;
        const filingDate = displayData?.filing_date || displayData?.filingDate || node.metadata?.filingDate;
        const grantDate = displayData?.grant_date || displayData?.grantDate;
        
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Patent Information
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">
                    Title:
                  </span>
                  <span className="text-foreground font-medium">
                    {title || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patent Number:</span>
                  <span className="text-foreground font-medium">
                    {patentNumber}
                  </span>
                </div>
                {assignee && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assignee:</span>
                    <span className="text-foreground font-medium">
                      {assignee}
                    </span>
                  </div>
                )}
                {filingDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Filing Date:</span>
                    <span className="text-foreground">
                      {filingDate}
                    </span>
                  </div>
                )}
                {grantDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Grant Date:</span>
                    <span className="text-foreground">
                      {grantDate}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Data Source
              </h4>
              <p className="text-sm text-foreground">{node.source}</p>
            </div>
          </div>
        );
      }

      case "trial": {
        const phase = Array.isArray(displayData?.phase)
          ? displayData.phase.join(", ")
          : displayData?.phase;
        const nctId = displayData?.nct_id || node.metadata?.nct_id || node.id;
        
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Clinical Trial Information
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">
                    Title:
                  </span>
                  <span className="text-foreground font-medium">
                    {displayData?.title || node.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phase:</span>
                  <span className="text-foreground font-medium">
                    {phase || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span
                    className={`font-medium ${
                      displayData?.status?.includes("ACTIVE")
                        ? "text-green-400"
                        : displayData?.status?.includes("COMPLETED")
                          ? "text-blue-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    {displayData?.status || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sponsor:</span>
                  <span className="text-foreground">
                    {displayData?.sponsor || "N/A"}
                  </span>
                </div>
                {displayData?.start_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="text-foreground">
                      {displayData.start_date}
                    </span>
                  </div>
                )}
                {displayData?.completion_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completion:</span>
                    <span className="text-foreground">
                      {displayData.completion_date}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NCT ID:</span>
                  <a
                    href={`https://clinicaltrials.gov/study/${nctId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {nctId}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Data Source
              </h4>
              <p className="text-sm text-foreground">{node.source}</p>
            </div>
          </div>
        );
      }

      case "paper": {
        const pmid = displayData?.pmid || node.label.replace(/PMID\s*/i, "");
        const authors = displayData?.authors || node.metadata?.authors;
        const journal = displayData?.journal || node.metadata?.journal;
        const year = displayData?.year || node.metadata?.year;
        const doi = displayData?.doi;
        
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Publication Information
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">
                    Title:
                  </span>
                  <span className="text-foreground font-medium">
                    {displayData?.title || node.metadata?.title || node.label}
                  </span>
                </div>
                {journal && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Journal:</span>
                    <span className="text-foreground">
                      {journal}
                    </span>
                  </div>
                )}
                {year && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Year:</span>
                    <span className="text-foreground">{year}</span>
                  </div>
                )}
                {authors && (
                  <div>
                    <span className="text-muted-foreground block mb-1">
                      Authors:
                    </span>
                    <span className="text-foreground text-xs">
                      {authors}
                    </span>
                  </div>
                )}
                {doi && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DOI:</span>
                    <a
                      href={`https://doi.org/${doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs"
                    >
                      {doi}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PubMed ID:</span>
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {pmid}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Data Source
              </h4>
              <p className="text-sm text-foreground">{node.source}</p>
            </div>
          </div>
        );
      }

      case "company":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Company Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Country:</span>
                  <span className="text-foreground font-medium">
                    {node.metadata?.country}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sector:</span>
                  <span className="text-foreground">
                    {node.metadata?.sector}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Data Source
              </h4>
              <p className="text-sm text-foreground">{node.source}</p>
            </div>
          </div>
        );

      case "disease":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Disease Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EFO ID:</span>
                  <a
                    href={`https://www.ebi.ac.uk/ols/ontologies/efo/terms?iri=http://www.ebi.ac.uk/efo/${node.metadata?.efoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {node.metadata?.efoId}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Evidence Score:</span>
                  <span className="text-foreground font-medium">
                    {node.evidenceScore}/100
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Data Source
              </h4>
              <p className="text-sm text-foreground">{node.source}</p>
            </div>
          </div>
        );

      default:
        return (
          <div>
            <p className="text-sm text-muted-foreground">
              No additional details available for this entity type.
            </p>
          </div>
        );
    }
  };

  // Get icon based on entity type
  const getEntityIcon = () => {
    switch (node.type) {
      case "protein":
      case "gene":
        return <Beaker className="w-5 h-5" />;
      case "drug":
      case "compound":
        return <Beaker className="w-5 h-5" />;
      case "patent":
        return <FileText className="w-5 h-5" />;
      case "trial":
        return <Calendar className="w-5 h-5" />;
      case "paper":
        return <FileText className="w-5 h-5" />;
      case "company":
        return <Building2 className="w-5 h-5" />;
      case "disease":
        return <Beaker className="w-5 h-5" />;
      default:
        return <Network className="w-5 h-5" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-[400px] bg-card border-l border-border shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-border">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-0.5 text-primary">{getEntityIcon()}</div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground break-words">
                  {node.label}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    {node.type}
                  </span>
                  {node.indiaRelevant && (
                    <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full font-medium">
                      India
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-accent rounded-md transition-colors shrink-0"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Synopsis Section */}
            <div className="mb-6 pb-6 border-b border-border">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  AI Synopsis
                </h3>
              </div>
              {isEnriching ? (
                <div className="flex items-center gap-3 text-muted-foreground py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                  <span className="text-sm">
                    Analyzing entity and generating synopsis...
                  </span>
                </div>
              ) : enrichError ? (
                <div className="bg-red-950/20 border border-red-900/30 rounded-md p-3">
                  <p className="text-sm text-red-400">
                    Failed to generate synopsis: {enrichError}
                  </p>
                </div>
              ) : enrichedData?.formattedSynopsis ? (
                <div className="space-y-3">
                  <div className="bg-card/50 border border-border/50 rounded-md p-3">
                    <div
                      className="text-sm text-foreground leading-relaxed whitespace-pre-line"
                      dangerouslySetInnerHTML={{
                        __html: enrichedData.formattedSynopsis.replace(
                          /\*\*(.+?)\*\*/g,
                          '<strong class="font-semibold text-foreground">$1</strong>',
                        ),
                      }}
                    />
                  </div>

                  {enrichedData.relevanceExplanation && (
                    <div className="bg-blue-950/20 border border-blue-900/30 rounded-md p-3">
                      <div className="flex items-start gap-2">
                        <div
                          className="w-1 bg-blue-500 rounded-full flex-shrink-0 mt-1"
                          style={{ height: "1rem" }}
                        />
                        <div>
                          <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
                            Relevance to Query
                          </h4>
                          <p className="text-sm text-foreground leading-relaxed">
                            {enrichedData.relevanceExplanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic py-2">
                  Synopsis not available
                </p>
              )}
            </div>

            {/* Original Entity Content */}
            {renderEntityContent()}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-border space-y-2">
            <button
              onClick={() => {
                onPin(node.id);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Pin className="w-4 h-4" />
              Pin to Saved Items
            </button>
            <button
              onClick={() => onFindConnections(node.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border text-foreground rounded-md text-sm font-medium hover:bg-accent transition-colors"
            >
              <Network className="w-4 h-4" />
              Find All Connections
            </button>
            <button
              onClick={() => {
                if (confirm(`Remove "${node.label}" from the graph?`)) {
                  onRemove(node.id);
                  onClose();
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border text-red-400 rounded-md text-sm font-medium hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Remove from Graph
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
