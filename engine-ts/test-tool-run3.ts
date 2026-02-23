import { createTool } from "@mastra/core/tools";
import { z } from "zod";
console.log("Creating tool...");
const testTool = createTool({
    id: "test",
    inputSchema: z.object({ foo: z.string() }),
    outputSchema: z.object({ bar: z.string() }),
    execute: async (args) => {
        return { bar: "baz" };
    }
});
console.log("Tool created:", Object.keys(testTool));
