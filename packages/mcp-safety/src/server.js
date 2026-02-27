import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerOpenFdaTools } from "./tools/openfda.js";
import { registerInteractionTools } from "./tools/interactions.js";
export function createServer() {
    const server = new McpServer({
        name: "mcp-safety",
        version: "0.0.1",
    });
    registerOpenFdaTools(server);
    registerInteractionTools(server);
    return server;
}
export async function startServer() {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
// Auto-start when run directly
const isMain = process.argv[1] &&
    (process.argv[1].endsWith("server.js") ||
        process.argv[1].endsWith("server.ts"));
if (isMain) {
    startServer().catch((err) => {
        console.error("Failed to start MCP server:", err);
        process.exit(1);
    });
}
//# sourceMappingURL=server.js.map