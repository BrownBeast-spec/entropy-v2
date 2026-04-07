import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerPatentStrategyTools } from "./tools/patent-strategy.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "mcp-patent-strategy",
    version: "0.0.1",
  });

  registerPatentStrategyTools(server);

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
