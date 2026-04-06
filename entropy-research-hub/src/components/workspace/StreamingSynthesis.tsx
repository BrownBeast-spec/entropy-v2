import React, { useState, useCallback } from "react";
import { synthesizeWithStreaming, type SynthesisSection } from "@/lib/api/synthesis";
import { GraphNode, GraphEdge, WorkspaceMode } from "@/types/workspace";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, CheckCircle, XCircle } from "lucide-react";

export interface StreamingSynthesisProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  mode: WorkspaceMode;
  indiaLens?: boolean;
  reportSections?: string[];
  onComplete?: (sections: SynthesisSection[]) => void;
}

/**
 * Streaming Synthesis Component
 * Real-time visualization of multi-step synthesis with SSE
 */
export function StreamingSynthesis({
  nodes,
  edges,
  mode,
  indiaLens = false,
  reportSections = [],
  onComplete,
}: StreamingSynthesisProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [sections, setSections] = useState<Record<string, SynthesisSection>>({});
  const [streamingContent, setStreamingContent] = useState<Record<string, string>>({});
  const [reasoningTraces, setReasoningTraces] = useState<Record<string, string>>({});
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

  const handleGenerate = useCallback(async () => {
    setIsStreaming(true);
    setError(null);
    setSections({});
    setStreamingContent({});
    setReasoningTraces({});
    setCurrentSection(null);
    setCompletedSections(new Set());

    try {
      await synthesizeWithStreaming(
        {
          graphSnapshot: { nodes, edges },
          personaMode: mode,
          reportSections,
          indiaLens,
          streaming: true,
        },
        {
          onSectionStart: (title) => {
            setCurrentSection(title);
            setStreamingContent((prev) => ({ ...prev, [title]: "" }));
          },
          onSectionChunk: (title, chunk) => {
            setStreamingContent((prev) => ({
              ...prev,
              [title]: (prev[title] || "") + chunk,
            }));
          },
          onReasoningChunk: (title, reasoning) => {
            setReasoningTraces((prev) => ({
              ...prev,
              [title]: (prev[title] || "") + reasoning,
            }));
          },
          onSectionComplete: (section) => {
            setSections((prev) => ({ ...prev, [section.title]: section }));
            setCompletedSections((prev) => new Set(prev).add(section.title));
            setCurrentSection(null);
          },
          onComplete: (result) => {
            setIsStreaming(false);
            onComplete?.(result.sections);
          },
          onError: (errorMsg) => {
            setError(errorMsg);
            setIsStreaming(false);
          },
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Synthesis failed");
      setIsStreaming(false);
    }
  }, [nodes, edges, mode, reportSections, indiaLens, onComplete]);

  const hasGraph = nodes.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6" />
          Deep Synthesis
        </h2>
        <Button
          onClick={handleGenerate}
          disabled={!hasGraph || isStreaming}
          className="gap-2"
        >
          {isStreaming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4" />
              Generate Report
            </>
          )}
        </Button>
      </div>

      {!hasGraph && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Add nodes to the workspace to generate synthesis
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 flex items-start gap-2 text-destructive">
            <XCircle className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-medium">Synthesis failed</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Streaming Sections */}
      <div className="space-y-4">
        {Object.entries(streamingContent).map(([title, content]) => {
          const isComplete = completedSections.has(title);
          const isActive = currentSection === title;
          const reasoning = reasoningTraces[title];

          return (
            <Card
              key={title}
              className={
                isActive
                  ? "border-primary shadow-lg"
                  : isComplete
                  ? "border-success"
                  : ""
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{title}</span>
                  {isActive && (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  )}
                  {isComplete && (
                    <CheckCircle className="w-5 h-5 text-success" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Reasoning Trace (if available) */}
                {reasoning && (
                  <details className="rounded-lg border p-3 bg-muted/50">
                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                      Show reasoning trace
                    </summary>
                    <div className="mt-2 text-sm whitespace-pre-wrap font-mono">
                      {reasoning}
                    </div>
                  </details>
                )}

                {/* Content */}
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap">{content}</div>
                  {isActive && (
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                  )}
                </div>

                {/* Citations */}
                {isComplete && sections[title]?.citations && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Citations</p>
                    <ul className="text-xs space-y-1">
                      {sections[title].citations.map((citation, idx) => (
                        <li key={idx} className="text-muted-foreground">
                          [{citation.nodeId}] {citation.label} ({citation.source})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
