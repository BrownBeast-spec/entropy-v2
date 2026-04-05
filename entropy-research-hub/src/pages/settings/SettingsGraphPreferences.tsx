import { Slider } from "@/components/ui/slider";
import { useState } from "react";

export default function SettingsGraphPreferences() {
  const [maxGraphSize, setMaxGraphSize] = useState(500);
  const [defaultLayout, setDefaultLayout] = useState("cose");
  const [autoSuggest, setAutoSuggest] = useState(true);
  const [animateTransitions, setAnimateTransitions] = useState(true);
  const [showProvenance, setShowProvenance] = useState(true);
  const [highlightIndiaNodes, setHighlightIndiaNodes] = useState(true);

  return (
    <div className="flex-1">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground mb-1">Graph Preferences</h1>
        <p className="text-sm text-muted-foreground">
          Customize knowledge graph visualization and behavior
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Maximum Graph Size */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Maximum Graph Size</h3>
            <p className="text-xs text-muted-foreground">
              Limit the number of nodes displayed to maintain performance
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Max nodes:</span>
              <span className="text-sm font-semibold text-foreground">{maxGraphSize}</span>
            </div>
            <Slider
              value={[maxGraphSize]}
              onValueChange={(value) => setMaxGraphSize(value[0])}
              min={100}
              max={2000}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between text-2xs text-muted-foreground">
              <span>100 nodes</span>
              <span>2000 nodes</span>
            </div>
          </div>
        </div>

        {/* Default Layout */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Default Layout Algorithm</h3>
            <p className="text-xs text-muted-foreground">
              Choose the default graph layout when loading a workspace
            </p>
          </div>
          <div className="space-y-2">
            {[
              { value: "cose", label: "Force-Directed", description: "Physics-based layout for general graphs" },
              { value: "breadthfirst", label: "Hierarchical", description: "Top-down tree structure" },
              { value: "circle", label: "Circular", description: "Nodes arranged in a circle" },
            ].map((layout) => (
              <label
                key={layout.value}
                className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                  defaultLayout === layout.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent"
                }`}
              >
                <input
                  type="radio"
                  name="layout"
                  value={layout.value}
                  checked={defaultLayout === layout.value}
                  onChange={(e) => setDefaultLayout(e.target.value)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-foreground">{layout.label}</div>
                  <div className="text-xs text-muted-foreground">{layout.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Graph Behavior */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Graph Behavior</h3>
            <p className="text-xs text-muted-foreground">
              Control how the graph responds to interactions and updates
            </p>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent cursor-pointer transition-colors">
              <div>
                <div className="text-sm font-medium text-foreground">Auto-suggest queries</div>
                <div className="text-xs text-muted-foreground">
                  Show suggested next questions based on current graph
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoSuggest}
                onChange={(e) => setAutoSuggest(e.target.checked)}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent cursor-pointer transition-colors">
              <div>
                <div className="text-sm font-medium text-foreground">Animate transitions</div>
                <div className="text-xs text-muted-foreground">
                  Smooth animations when nodes/edges are added or removed
                </div>
              </div>
              <input
                type="checkbox"
                checked={animateTransitions}
                onChange={(e) => setAnimateTransitions(e.target.checked)}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent cursor-pointer transition-colors">
              <div>
                <div className="text-sm font-medium text-foreground">Show provenance panel</div>
                <div className="text-xs text-muted-foreground">
                  Display data source statistics in graph view
                </div>
              </div>
              <input
                type="checkbox"
                checked={showProvenance}
                onChange={(e) => setShowProvenance(e.target.checked)}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent cursor-pointer transition-colors">
              <div>
                <div className="text-sm font-medium text-foreground">Highlight India-relevant nodes</div>
                <div className="text-xs text-muted-foreground">
                  Auto-enable India Lens for new workspaces
                </div>
              </div>
              <input
                type="checkbox"
                checked={highlightIndiaNodes}
                onChange={(e) => setHighlightIndiaNodes(e.target.checked)}
                className="rounded"
              />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-4">
          <button className="px-4 py-2 border border-border text-foreground rounded-md text-sm font-medium hover:bg-accent transition-colors">
            Reset to Defaults
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
