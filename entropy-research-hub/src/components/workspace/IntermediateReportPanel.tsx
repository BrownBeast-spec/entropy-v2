import { useState } from "react";
import { FileText, Download, RotateCw } from "lucide-react";
import { Report } from "@/types/workspace";
import { demoReport, strategistModeReport } from "@/lib/data/demoReportData";
import MetricCard from "./MetricCard";
import { selectMetricsForReport } from "@/lib/utils/reportMetrics";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Citation } from "@/types/workspace";

interface IntermediateReportPanelProps {
  report?: Report;
  mode?: "Researcher" | "Strategist";
  queryText?: string;
  onRegenerateSynthesis?: () => void;
  onGenerateFullDossier?: () => void;
  onCitationClick?: (nodeId: string) => void;
  onExport?: (format: "markdown" | "pdf" | "json") => void;
}

export default function IntermediateReportPanel({
  report,
  mode = "Researcher",
  queryText = "",
  onRegenerateSynthesis,
  onGenerateFullDossier,
  onCitationClick,
  onExport,
}: IntermediateReportPanelProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const { currentWorkspace } = useWorkspace();

  // Use demo report if no report provided
  const displayReport = report || (mode === "Researcher" ? demoReport : strategistModeReport);

  const latestQuery = queryText || currentWorkspace?.queries[currentWorkspace.queries.length - 1]?.text || "";
  const metrics = currentWorkspace
    ? selectMetricsForReport(currentWorkspace, latestQuery)
    : [];
  const currentNodeCount = currentWorkspace?.nodes.length || 0;
  const reportNodeCount = displayReport.graphNodeCountAtGeneration || 0;
  const newNodesSinceReport = currentNodeCount - reportNodeCount;
  const isStale = newNodesSinceReport > 0;

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

  const citationButtonClassName =
    "inline-flex max-w-[220px] items-center gap-1 rounded-md border border-border bg-accent px-1.5 py-0.5 text-[11px] text-foreground hover:bg-accent/80 transition-colors align-middle mr-1 mb-1 overflow-hidden text-ellipsis whitespace-nowrap";

  const citationTokenRegex = /\[([^\]]+)\]/g;

  const getCitationDisplayLabel = (nodeId: string, citations: Citation[]): string => {
    const citation = citations.find((item) => item.nodeId === nodeId);
    if (citation?.label) return citation.label;

    const workspaceNode = currentWorkspace?.nodes.find((node) => node.id === nodeId);
    if (workspaceNode?.label) return workspaceNode.label;

    return nodeId;
  };

  const truncateCitationLabel = (label: string): string => {
    const maxLength = 24;
    if (label.length <= maxLength) return label;
    return `${label.slice(0, maxLength - 3)}...`;
  };

  const isKnownCitationNode = (nodeId: string, citations: Citation[]): boolean => {
    if (citations.some((item) => item.nodeId === nodeId)) return true;
    return Boolean(currentWorkspace?.nodes.some((node) => node.id === nodeId));
  };

  const renderInlineContentWithCitations = (text: string, citations: Citation[]) => {
    const segments: Array<string | JSX.Element> = [];
    let lastIndex = 0;
    let matchIndex = 0;

    for (const match of text.matchAll(citationTokenRegex)) {
      const fullMatch = match[0];
      const tokenBody = match[1] ?? "";
      const matchStart = match.index ?? 0;

      if (matchStart > lastIndex) {
        segments.push(text.slice(lastIndex, matchStart));
      }

      const candidateIds = tokenBody.match(/[A-Za-z0-9_-]+/g) ?? [];
      const seen = new Set<string>();
      const nodeIds = candidateIds.filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return isKnownCitationNode(id, citations);
      });

      if (nodeIds.length === 0) {
        segments.push(fullMatch);
      } else {
        nodeIds.forEach((nodeId, idx) => {
          segments.push(
            <button
              key={`inline-cite-${nodeId}-${matchIndex}-${idx}`}
              type="button"
              onClick={() => handleCitationClick(nodeId)}
              className={citationButtonClassName}
              aria-label={`Open citation: ${getCitationDisplayLabel(nodeId, citations)}`}
              title={getCitationDisplayLabel(nodeId, citations)}
            >
              {truncateCitationLabel(getCitationDisplayLabel(nodeId, citations))}
            </button>,
          );
          if (idx < nodeIds.length - 1) {
            segments.push(" ");
          }
        });
      }

      lastIndex = matchStart + fullMatch.length;
      matchIndex += 1;
    }

    if (lastIndex < text.length) {
      segments.push(text.slice(lastIndex));
    }

    if (segments.length === 0) {
      return text;
    }

    return segments;
  };

  const renderParagraphWithMarkdownAndCitations = (
    paragraph: string,
    citations: Citation[],
  ) => {
    const parts = paragraph.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, partIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={`bold-${partIdx}`} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }

      const rendered = renderInlineContentWithCitations(part, citations);
      return <span key={`text-${partIdx}`}>{rendered}</span>;
    });
  };

  const getSectionParagraphs = (sectionTitle: string, content: string): string[] => {
    const paragraphs = content.split("\n\n");
    if (paragraphs.length === 0) return paragraphs;

    const first = paragraphs[0].trim();
    const title = sectionTitle.trim();
    const firstWithoutBold = first.replace(/^\*\*/, "").replace(/\*\*$/, "").trim();

    if (
      firstWithoutBold.localeCompare(title, undefined, { sensitivity: "accent" }) === 0
    ) {
      return paragraphs.slice(1);
    }

    return paragraphs;
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
    <div className="h-full bg-card">
      <div className="h-full overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-foreground">Intermediate Report</h3>
            <span className="text-2xs text-muted-foreground">
              {displayReport.wordCount} words · Generated {formatDate(displayReport.generatedAt)}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {isStale ? (
              <span className="rounded bg-yellow-500/10 px-2 py-1 text-2xs text-yellow-700">
                {newNodesSinceReport} new nodes since last report
              </span>
            ) : null}
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

        {/* Metric cards */}
        {metrics.length > 0 ? (
          <div className="grid grid-cols-4 gap-3 border-b border-border p-4">
            {metrics.map((metric, idx) => (
              <MetricCard key={`${metric.label}-${idx}`} metric={metric} />
            ))}
          </div>
        ) : null}

        {/* Report Content */}
        <div className="p-6">
          <div>
            {displayReport.sections.map((section, idx) => (
              <div key={idx} className="mb-8">
                <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  {section.title}
                </h2>
                
                <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                  {/* Parse content and render with citation badges */}
                  {getSectionParagraphs(section.title, section.content).map((paragraph, pIdx) => {
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
                    return (
                      <p key={pIdx} className="text-foreground/90">
                        {renderParagraphWithMarkdownAndCitations(
                          paragraph,
                          section.citations,
                        )}
                      </p>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {/* Footer note */}
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground italic">
                This synthesis is automatically generated from the current knowledge graph. 
                Click inline citations to open the corresponding node in the detail drawer and highlight it in the graph above. 
                Content is editable — you can modify any section inline.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
