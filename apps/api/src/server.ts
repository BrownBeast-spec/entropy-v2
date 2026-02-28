// =============================================================
// IMPORTANT: env must be loaded BEFORE index.js is imported,
// because index.js → chat.ts → mastra/index.ts runs
// `import "dotenv/config"` which looks for .env in process.cwd()
// (= apps/api), finds nothing, and sets nothing.
//
// Static `import` declarations are hoisted in ESM and ALL run
// before any top-level code, so this must use dynamic import.
// =============================================================

import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));

// Load root .env. `override: true` ensures our values win even if
// mastra's dotenv/config previously wrote empty values.
loadEnv({ path: join(__dir, "../../../.env"), override: true });

// ---- everything below loads AFTER env is set ----
const { serve } = await import("@hono/node-server");
const { app } = await import("./index.js");

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Entropy API running on http://localhost:${info.port}`);
});
