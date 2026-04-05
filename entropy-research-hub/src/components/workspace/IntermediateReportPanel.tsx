import { useState } from "react";
import { FileText, Download, RotateCw } from "lucide-react";
import { Report } from "@/types/workspace";
import { demoReport, strategistModeReport } from "@/lib/data/demoReportData";

interface IntermediateReportPanelProps {
  report?: Report;
  mode?: "Researcher" | "Strategist";
  onRegenerateSynthesis?: () => void;
  onGenerateFullDossier?: () => void;
  onCitationClick?: (nodeId: string) => void;
  onExport?: (format: "markdown" | "pdf" | "json") => void;
}

export default function IntermediateReportPanel({
  report,
  mode = "Researcher",
  onRegenerateSynthesis,
  onGenerateFullDossier,
  onCitationClick,
  onExport,
}: IntermediateReportPanelProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Use demo report if no report provided
  const displayReport = report || (mode === "Researcher" ? demoReport : strategistModeReport);

  const handleCitationClick = (nodeId: string) => {
    if (onCitationClick) {
      onCitationClick(nodeId);
    } else {
      console.log("Citation clicked:", nodeId);
    }
  };

  const handleExport = (format: "markdown" | "pdf" | "json") => {
    if (onExport) {
      onExport(format);
    } else {
      console.log("Export as:", format);
    }
    setShowExportMenu(false);
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  return (
    <div className="h-full bg-card flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground">Intermediate Report</h3>
          <span className="text-2xs text-muted-foreground">
            {displayReport.wordCount} words · Generated {formatDate(displayReport.generatedAt)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerateSynthesis}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-[13px] font-medium text-foreground hover:bg-accent transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Regenerate
          </button>
          
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-[13px] font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-10">
                <button
                  onClick={() => handleExport("markdown")}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors rounded-t-lg"
                >
                  Markdown
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  PDF
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors rounded-b-lg"
                >
                  JSON
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={onGenerateFullDossier}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Generate Full Dossier
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="max-w-3xl">
          {displayReport.sections.map((section, idx) => (
            <div key={idx} className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                {section.title}
              </h2>
              
              <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                {/* Parse content and render with citation badges */}
                {section.content.split('\n\n').map((paragraph, pIdx) => {
                  // Check if paragraph is a list
                  if (paragraph.trim().startsWith('-') || paragraph.trim().startsWith('•')) {
                    const listItems = paragraph.split('\n').filter(line => line.trim());
                    return (
                      <ul key={pIdx} className="list-disc list-inside space-y-1.5 ml-2">
                        {listItems.map((item, liIdx) => (
                          <li key={liIdx} className="text-foreground/90">
                            {item.replace(/^[-•]\s*/, '')}
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  
                  // Check if paragraph has numbered list
                  if (/^\d+\./.test(paragraph.trim())) {
                    const listItems = paragraph.split('\n').filter(line => line.trim());
                    return (
                      <ol key={pIdx} className="list-decimal list-inside space-y-1.5 ml-2">
                        {listItems.map((item, liIdx) => (
                          <li key={liIdx} className="text-foreground/90">
                            {item.replace(/^\d+\.\s*/, '')}
                          </li>
                        ))}
                      </ol>
                    );
                  }
                  
                  // Regular paragraph - render with bold markdown
                  const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                  return (
                    <p key={pIdx} className="text-foreground/90">
                      {parts.map((part, partIdx) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return (
                            <strong key={partIdx} className="font-semibold text-foreground">
                              {part.slice(2, -2)}
                            </strong>
                          );
                        }
                        return <span key={partIdx}>{part}</span>;
                      })}
                    </p>
                  );
                })}
                
                {/* Citation badges */}
                {section.citations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/50">
                    {section.citations.map((citation) => (
                      <button
                        key={citation.id}
                        onClick={() => handleCitationClick(citation.nodeId)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent border border-border text-2xs text-foreground hover:bg-accent/80 transition-colors"
                      >
                        <span className="font-mono">{citation.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground italic">
              This synthesis is automatically generated from the current knowledge graph. 
              Click any citation badge to highlight the corresponding node in the graph above. 
              Content is editable — you can modify any section inline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
