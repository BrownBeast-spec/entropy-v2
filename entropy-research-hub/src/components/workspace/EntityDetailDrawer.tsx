import { X, Pin, Trash2, Network, ExternalLink, Calendar, Building2, FileText, Beaker } from "lucide-react";
import { GraphNode } from "@/types/workspace";

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
  if (!node) return null;

  // Render entity-specific content based on node type
  const renderEntityContent = () => {
    const indiaContext = node.metadata?.indiaContext as
      | {
          isCDSCO?: boolean;
          isNPPA?: boolean;
          nppaPriceCapInr?: number;
          isIndianPatent?: boolean;
        }
      | undefined;

    const renderIndiaLensSignals = () => {
      if (!node.indiaRelevant || !indiaContext) return null;

      return (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            India Lens Signals
          </h4>
          <div className="space-y-2 text-sm">
            {indiaContext.isCDSCO && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">CDSCO Approved:</span>
                <span className="text-foreground font-medium">Yes</span>
              </div>
            )}
            {indiaContext.isNPPA && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">NPPA Price Cap:</span>
                <span className="text-foreground font-medium">
                  INR {indiaContext.nppaPriceCapInr ?? "N/A"}
                </span>
              </div>
            )}
            {indiaContext.isIndianPatent && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Indian Assignee:</span>
                <span className="text-foreground font-medium">Yes</span>
              </div>
            )}
          </div>
        </div>
      );
    };

    switch (node.type) {
      case "protein":
      case "gene":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Protein Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Full Name:</span>
                  <span className="text-foreground font-medium">{node.metadata?.fullName || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UniProt ID:</span>
                  <a 
                    href={`https://www.uniprot.org/uniprot/${node.metadata?.uniprotId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {node.metadata?.uniprotId}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Evidence Score:</span>
                  <span className="text-foreground font-medium">{node.evidenceScore}/100</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Data Source
              </h4>
              <p className="text-sm text-foreground">{node.source}</p>
            </div>
            {renderIndiaLensSignals()}
          </div>
        );

      case "drug":
      case "compound":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Drug Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PubChem ID:</span>
                  <a 
                    href={`https://pubchem.ncbi.nlm.nih.gov/compound/${node.metadata?.pubchemId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {node.metadata?.pubchemId}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ChEMBL ID:</span>
                  <a 
                    href={`https://www.ebi.ac.uk/chembl/compound_report_card/${node.metadata?.chemblId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {node.metadata?.chemblId}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Evidence Score:</span>
                  <span className="text-foreground font-medium">{node.evidenceScore}/100</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Data Source
              </h4>
              <p className="text-sm text-foreground">{node.source}</p>
            </div>
            {renderIndiaLensSignals()}
          </div>
        );

      case "patent":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Patent Information
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Title:</span>
                  <span className="text-foreground font-medium">{node.metadata?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assignee:</span>
                  <span className="text-foreground font-medium">{node.metadata?.assignee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Filing Date:</span>
                  <span className="text-foreground">{node.metadata?.filingDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expiry Date:</span>
                  <span className="text-foreground">{node.metadata?.expiryDate}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Data Source
              </h4>
              <p className="text-sm text-foreground">{node.source}</p>
            </div>
            {renderIndiaLensSignals()}
          </div>
        );

      case "trial":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Clinical Trial Information
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Title:</span>
                  <span className="text-foreground font-medium">{node.metadata?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phase:</span>
                  <span className="text-foreground font-medium">{node.metadata?.phase}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-medium ${
                    node.metadata?.status === "Active" ? "text-green-400" :
                    node.metadata?.status === "Completed" ? "text-blue-400" :
                    "text-muted-foreground"
                  }`}>
                    {node.metadata?.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sponsor:</span>
                  <span className="text-foreground">{node.metadata?.sponsor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NCT ID:</span>
                  <a 
                    href={`https://clinicaltrials.gov/study/${node.label}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {node.label}
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
            {renderIndiaLensSignals()}
          </div>
        );

      case "paper":
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Publication Information
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Title:</span>
                  <span className="text-foreground font-medium">{node.metadata?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Journal:</span>
                  <span className="text-foreground">{node.metadata?.journal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Year:</span>
                  <span className="text-foreground">{node.metadata?.year}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Authors:</span>
                  <span className="text-foreground text-xs">{node.metadata?.authors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PubMed ID:</span>
                  <a 
                    href={`https://pubmed.ncbi.nlm.nih.gov/${node.label.replace('PMID ', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {node.label}
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
            {renderIndiaLensSignals()}
          </div>
        );

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
                  <span className="text-foreground font-medium">{node.metadata?.country}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sector:</span>
                  <span className="text-foreground">{node.metadata?.sector}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Data Source
              </h4>
              <p className="text-sm text-foreground">{node.source}</p>
            </div>
            {renderIndiaLensSignals()}
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
                  <span className="text-foreground font-medium">{node.evidenceScore}/100</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Data Source
              </h4>
              <p className="text-sm text-foreground">{node.source}</p>
            </div>
            {renderIndiaLensSignals()}
          </div>
        );

      default:
        return (
          <div>
            <p className="text-sm text-muted-foreground">No additional details available for this entity type.</p>
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
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-border">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-0.5 text-primary">
                {getEntityIcon()}
              </div>
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
