import { Database, Check, AlertCircle, RefreshCw } from "lucide-react";

interface DataSource {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive" | "error";
  type: string;
  lastSync?: Date;
}

const dataSources: DataSource[] = [
  {
    id: "open_targets",
    name: "Open Targets",
    description: "Disease-target associations and genetic evidence",
    status: "active",
    type: "Biological Database",
    lastSync: new Date("2026-04-03T10:30:00"),
  },
  {
    id: "string_db",
    name: "STRING DB",
    description: "Protein-protein interaction networks",
    status: "active",
    type: "Biological Database",
    lastSync: new Date("2026-04-03T10:15:00"),
  },
  {
    id: "pubmed",
    name: "PubMed",
    description: "Biomedical literature and abstracts",
    status: "active",
    type: "Literature Database",
    lastSync: new Date("2026-04-03T10:45:00"),
  },
  {
    id: "europe_pmc",
    name: "Europe PMC",
    description: "European biomedical literature repository",
    status: "active",
    type: "Literature Database",
    lastSync: new Date("2026-04-03T09:20:00"),
  },
  {
    id: "patents_view",
    name: "PatentsView",
    description: "US patent data and filings",
    status: "active",
    type: "Patent Database",
    lastSync: new Date("2026-04-03T08:00:00"),
  },
  {
    id: "clinical_trials",
    name: "ClinicalTrials.gov",
    description: "Global clinical trial registry",
    status: "active",
    type: "Clinical Database",
    lastSync: new Date("2026-04-03T10:00:00"),
  },
  {
    id: "chembl",
    name: "ChEMBL",
    description: "Bioactive molecules and drug-target data",
    status: "active",
    type: "Drug Database",
    lastSync: new Date("2026-04-03T07:30:00"),
  },
  {
    id: "drugbank",
    name: "DrugBank",
    description: "Comprehensive drug and drug target database",
    status: "inactive",
    type: "Drug Database",
  },
  {
    id: "uniprot",
    name: "UniProt",
    description: "Protein sequence and functional information",
    status: "active",
    type: "Biological Database",
    lastSync: new Date("2026-04-03T09:00:00"),
  },
];

export default function SettingsDataSources() {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Check className="w-4 h-4 text-green-400" />;
      case "inactive":
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const formatLastSync = (date?: Date) => {
    if (!date) return "Never";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="flex-1">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground mb-1">Data Sources</h1>
        <p className="text-sm text-muted-foreground">
          Manage external data sources for research queries
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dataSources.map((source) => (
          <div
            key={source.id}
            className="bg-card border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{source.name}</h3>
              </div>
              {getStatusIcon(source.status)}
            </div>

            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
              {source.description}
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="text-foreground">{source.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span
                  className={`font-medium capitalize ${
                    source.status === "active"
                      ? "text-green-400"
                      : source.status === "error"
                      ? "text-red-400"
                      : "text-muted-foreground"
                  }`}
                >
                  {source.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last sync:</span>
                <span className="text-foreground">{formatLastSync(source.lastSync)}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border flex gap-2">
              <button
                className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border text-foreground hover:bg-accent transition-colors"
                disabled={source.status === "inactive"}
              >
                Configure
              </button>
              <button
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={source.status === "inactive"}
                title="Refresh data"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-card border border-border rounded-lg">
        <h3 className="text-sm font-semibold text-foreground mb-2">Add Custom Data Source</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Connect your own MCP server or API endpoint to extend Entropy's research capabilities
        </p>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
          Add Data Source
        </button>
      </div>
    </div>
  );
}
