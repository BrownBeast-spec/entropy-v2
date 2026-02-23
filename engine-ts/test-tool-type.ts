import { createTool } from "@mastra/core/tools";
import { z } from "zod";
export const testTool = createTool({
    id: "test",
    inputSchema: z.object({ foo: z.string() }),
    outputSchema: z.object({ bar: z.string() }),
    execute: async (args) => {
        args.x = 1;
        return { bar: "" };
    }
});
