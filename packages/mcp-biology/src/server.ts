import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerOpenTargetsTools } from "./tools/opentargets.js";
import { registerNcbiTools } from "./tools/ncbi.js";
import { registerEnsemblTools } from "./tools/ensembl.js";
import { registerUniprotTools } from "./tools/uniprot.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "mcp-biology",
    version: "0.0.1",
  });

  registerOpenTargetsTools(server);
  registerNcbiTools(server);
  registerEnsemblTools(server);
  registerUniprotTools(server);

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Auto-start when run directly
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("server.js") ||
    process.argv[1].endsWith("server.ts"));

if (isMain) {
  startServer().catch((err) => {
    console.error("Failed to start MCP server:", err);
    process.exit(1);
  });
}
