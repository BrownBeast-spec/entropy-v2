import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const testTool = createTool({
    id: "test",
    inputSchema: z.object({ foo: z.string() }),
    outputSchema: z.object({ bar: z.string() }),
    execute: async (args) => {
        console.log("TOOL ARGS KEYS:", Object.keys(args || {}));
        console.log("TOOL ARGS STRUCTURE:", JSON.stringify(args));
        return { bar: "baz" };
    }
});

// Since testTool isn't easily callable from the outside without Mastra engine, 
// let's look at its raw execute function inside the object if it exists.
console.log("TEST TOOL KEYS:", Object.keys(testTool));
if (typeof testTool.execute === 'function') {
    testTool.execute({ foo: "hi" }, {} as any).catch(e => console.error("EXEC ERR:", e));
} else {
    console.log("testTool has no execute method directly exposed.");
}
