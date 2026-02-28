// Load root .env before any other imports so all API keys are available.
// apps/api/src/server.ts → 3 levels up → repo root
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dir, "../../../.env") });

import { serve } from "@hono/node-server";
import { app } from "./index.js";

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Entropy API running on http://localhost:${info.port}`);
});
