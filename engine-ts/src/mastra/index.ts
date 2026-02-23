import "dotenv/config";
import { Mastra } from "@mastra/core";
import { LibSQLStore } from "@mastra/libsql";
import { coPharmaAgent } from "../agents/co-pharma.js";
import { drugRepurposingWorkflow } from "../workflows/drug-repurposing.js";

export const mastra = new Mastra({
    agents: { coPharmaAgent },
    workflows: { drugRepurposingWorkflow },
    storage: new LibSQLStore({
        id: "entropy-storage",
        url: "file:./mastra.db",
    }),
});
