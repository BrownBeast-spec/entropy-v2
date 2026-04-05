import { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";

interface ResearchProgressOverlayProps {
  query: string;
  onComplete: (nodesAdded: number, edgesAdded: number) => void;
  onCancel: () => void;
}

interface LogEntry {
  text: string;
  timestamp: Date;
}

export default function ResearchProgressOverlay({
  query,
  onComplete,
  onCancel,
}: ResearchProgressOverlayProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentIteration, setCurrentIteration] = useState(1);
  const [nodesAdded, setNodesAdded] = useState(0);
  const [edgesAdded, setEdgesAdded] = useState(0);
  const [coverageScore, setCoverageScore] = useState(0);

  const addLog = (text: string) => {
    setLogs((prev) => [...prev, { text, timestamp: new Date() }]);
  };

  // Simulate research loop
  useEffect(() => {
    const simulateResearch = async () => {
      // Initial check
      await sleep(500);
      addLog("Checking existing graph for coverage of your query...");
      await sleep(800);
      
      setCoverageScore(34);
      addLog("Coverage score: 34 out of 100 — augmenting with new data.");
      await sleep(600);

      // Iteration 1
      addLog("Iteration 1 of 3 — Fetching data from multiple sources...");
      await sleep(1000);
      
      addLog("Fetching disease-target associations from Open Targets...");
      await sleep(1200);
      setNodesAdded(12);
      addLog("✓ Open Targets: 12 nodes added");
      await sleep(600);
      
      addLog("Fetching protein interaction data from STRING DB...");
      await sleep(1000);
      setNodesAdded((prev) => prev + 8);
      setEdgesAdded((prev) => prev + 15);
      addLog("✓ STRING: 8 nodes, 15 edges added");
      await sleep(600);
      
      addLog("Fetching relevant literature from PubMed...");
      await sleep(1200);
      setNodesAdded((prev) => prev + 6);
      addLog("✓ PubMed: 6 papers added");
      await sleep(600);
      
      setCoverageScore(68);
      addLog("Coverage score: 68 — continuing augmentation...");
      await sleep(800);

      // Iteration 2
      setCurrentIteration(2);
      addLog("Iteration 2 of 3 — Expanding graph with additional sources...");
      await sleep(1000);
      
      addLog("Fetching patent data from PatentsView...");
      await sleep(1300);
      setNodesAdded((prev) => prev + 4);
      setEdgesAdded((prev) => prev + 5);
      addLog("✓ PatentsView: 4 patents added");
      await sleep(600);
      
      addLog("Fetching clinical trial data from ClinicalTrials.gov...");
      await sleep(1100);
      setNodesAdded((prev) => prev + 3);
      addLog("✓ ClinicalTrials.gov: 3 trials added");
      await sleep(600);
      
      setCoverageScore(91);
      addLog("Coverage score: 91 — sufficient coverage reached!");
      await sleep(800);
      
      addLog("Research complete. Skipping iteration 3.");
      await sleep(600);
      
      addLog("Generating intermediate synthesis...");
      await sleep(1500);
      
      addLog("✓ Synthesis complete. Updating workspace...");
      await sleep(500);

      // Complete
      onComplete(nodesAdded, edgesAdded);
    };

    simulateResearch();
  }, []);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-full max-w-3xl mx-4">
        <div className="bg-card border border-border rounded-lg shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Research in Progress</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Query: "{query.substring(0, 60)}{query.length > 60 ? '...' : ''}"
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-1 hover:bg-accent rounded-md transition-colors"
              title="Cancel and view partial results"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Progress indicators */}
          <div className="p-4 border-b border-border bg-accent/30">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-muted-foreground">Iteration:</span>{" "}
                  <span className="font-semibold text-foreground">{currentIteration} of 3</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Coverage:</span>{" "}
                  <span className="font-semibold text-foreground">{coverageScore}/100</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Nodes:</span>{" "}
                  <span className="font-semibold text-foreground">{nodesAdded}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Edges:</span>{" "}
                  <span className="font-semibold text-foreground">{edgesAdded}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Processing...</span>
              </div>
            </div>
          </div>

          {/* Log panel */}
          <div className="p-4 bg-background/50 font-mono text-xs h-[400px] overflow-y-auto scrollbar-thin">
            {logs.map((log, idx) => (
              <div key={idx} className="mb-1 text-foreground/80 flex gap-2">
                <span className="text-muted-foreground shrink-0">
                  {log.timestamp.toLocaleTimeString('en-US', { 
                    hour12: false,
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  })}
                </span>
                <span>{log.text}</span>
              </div>
            ))}
            {logs.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-primary">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Processing...</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Estimated time: 25-40 seconds based on query complexity
            </p>
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-md border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Cancel and view partial results
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
