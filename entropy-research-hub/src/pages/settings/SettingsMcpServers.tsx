import { Plus } from "lucide-react";

export default function SettingsMcpServers() {
  return (
    <div className="p-6 max-w-3xl animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-lg font-semibold text-foreground">MCP Servers</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure external MCP servers to extend your AI agent with custom tools.</p>
        </div>
        <button className="flex items-center gap-2 border border-border rounded-md px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors">
          <Plus className="w-4 h-4" />
          Add MCP Server
        </button>
      </div>

      <div className="mt-8 border border-border rounded-lg p-12 flex flex-col items-center justify-center text-center">
        <h2 className="text-base font-semibold text-foreground mb-2">No MCP servers configured</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Connect external MCP servers to give your AI agent access to custom tools and data sources.
        </p>
        <button className="flex items-center gap-2 border border-border rounded-md px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors">
          <Plus className="w-4 h-4" />
          Add MCP Server
        </button>
      </div>
    </div>
  );
}
