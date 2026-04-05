import { FileText, Download } from "lucide-react";
import { useState } from "react";

export default function SettingsExportPreferences() {
  const [defaultFormat, setDefaultFormat] = useState("markdown");
  const [includeProvenance, setIncludeProvenance] = useState(true);
  const [includeCitations, setIncludeCitations] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeGraphSnapshot, setIncludeGraphSnapshot] = useState(false);
  const [templateStyle, setTemplateStyle] = useState("comprehensive");

  return (
    <div className="flex-1">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground mb-1">Export Preferences</h1>
        <p className="text-sm text-muted-foreground">
          Configure default settings for dossier generation and exports
        </p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Default Export Format */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Default Export Format</h3>
            <p className="text-xs text-muted-foreground">
              Choose the default format for full dossier exports
            </p>
          </div>
          <div className="space-y-2">
            {[
              { 
                value: "markdown", 
                label: "Markdown (.md)", 
                description: "Lightweight text format for documentation" 
              },
              { 
                value: "pdf", 
                label: "PDF Document", 
                description: "Professional report with formatting" 
              },
              { 
                value: "json", 
                label: "JSON Data", 
                description: "Structured data for programmatic access" 
              },
              { 
                value: "docx", 
                label: "Microsoft Word (.docx)", 
                description: "Editable document format" 
              },
            ].map((format) => (
              <label
                key={format.value}
                className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                  defaultFormat === format.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent"
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={format.value}
                  checked={defaultFormat === format.value}
                  onChange={(e) => setDefaultFormat(e.target.value)}
                  className="mt-0.5"
                />
                <div className="flex items-center gap-2 flex-1">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{format.label}</div>
                    <div className="text-xs text-muted-foreground">{format.description}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Dossier Template Style */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Dossier Template Style</h3>
            <p className="text-xs text-muted-foreground">
              Select the structure and depth of generated dossiers
            </p>
          </div>
          <div className="space-y-2">
            {[
              { 
                value: "executive", 
                label: "Executive Summary", 
                description: "Brief overview with key findings (2-3 pages)" 
              },
              { 
                value: "comprehensive", 
                label: "Comprehensive Report", 
                description: "Detailed analysis with all sections (10-15 pages)" 
              },
              { 
                value: "technical", 
                label: "Technical Deep Dive", 
                description: "In-depth scientific detail with references (20+ pages)" 
              },
            ].map((template) => (
              <label
                key={template.value}
                className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                  templateStyle === template.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-accent"
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  value={template.value}
                  checked={templateStyle === template.value}
                  onChange={(e) => setTemplateStyle(e.target.value)}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-foreground">{template.label}</div>
                  <div className="text-xs text-muted-foreground">{template.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Export Content Options */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Export Content Options</h3>
            <p className="text-xs text-muted-foreground">
              Choose what to include in exported dossiers
            </p>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent cursor-pointer transition-colors">
              <div>
                <div className="text-sm font-medium text-foreground">Include data provenance</div>
                <div className="text-xs text-muted-foreground">
                  Show which data sources contributed to each finding
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeProvenance}
                onChange={(e) => setIncludeProvenance(e.target.checked)}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent cursor-pointer transition-colors">
              <div>
                <div className="text-sm font-medium text-foreground">Include citations</div>
                <div className="text-xs text-muted-foreground">
                  Add bibliography with all referenced papers and sources
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeCitations}
                onChange={(e) => setIncludeCitations(e.target.checked)}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent cursor-pointer transition-colors">
              <div>
                <div className="text-sm font-medium text-foreground">Include entity metadata</div>
                <div className="text-xs text-muted-foreground">
                  Add detailed metadata tables for proteins, drugs, trials, etc.
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent cursor-pointer transition-colors">
              <div>
                <div className="text-sm font-medium text-foreground">Include graph snapshot</div>
                <div className="text-xs text-muted-foreground">
                  Embed a PNG/SVG visualization of the knowledge graph
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeGraphSnapshot}
                onChange={(e) => setIncludeGraphSnapshot(e.target.checked)}
                className="rounded"
              />
            </label>
          </div>
        </div>

        {/* Custom Export Templates */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-1">Custom Export Templates</h3>
            <p className="text-xs text-muted-foreground">
              Create reusable templates for specific report types
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-accent/50 rounded-md">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium text-foreground">Regulatory Submission</div>
                  <div className="text-xs text-muted-foreground">
                    CDSCO-compliant format for regulatory filings
                  </div>
                </div>
              </div>
              <button className="px-3 py-1 text-xs font-medium text-foreground border border-border rounded-md hover:bg-accent transition-colors">
                Edit
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-accent/50 rounded-md">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium text-foreground">Market Intelligence Brief</div>
                  <div className="text-xs text-muted-foreground">
                    Competitive landscape with patent analysis
                  </div>
                </div>
              </div>
              <button className="px-3 py-1 text-xs font-medium text-foreground border border-border rounded-md hover:bg-accent transition-colors">
                Edit
              </button>
            </div>
          </div>
          <button className="mt-3 w-full px-4 py-2 border border-dashed border-border text-foreground rounded-md text-sm font-medium hover:bg-accent transition-colors">
            + Create New Template
          </button>
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
