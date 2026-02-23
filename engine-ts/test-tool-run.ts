import { createTool } from "@mastra/core/tools";
import { z } from "zod";
export const testTool = createTool({
    id: "test",
    inputSchema: z.object({ foo: z.string() }),
    outputSchema: z.object({ bar: z.string() }),
    execute: async (args) => {
        console.log("TOOL ARGS:", Object.keys(args || {}));
        return { bar: "baz" };
    }
});
testTool.execute({ foo: "hi" }, {} as any).catch(console.error);
