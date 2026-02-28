import { Hono } from "hono";
import { cors } from "hono/cors";
import { research } from "./routes/research.js";
import { health } from "./routes/health.js";

const app = new Hono();

// Global CORS — allows the Next.js frontend (any port) to call the API
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.route("/api/research", research);
app.route("/api/health", health);

// Dynamically import the chat route so a missing @copilotkit/runtime install
// doesn't crash the entire API server on startup
try {
  const { chat } = await import("./routes/chat.js");
  app.route("/api/chat", chat);
  console.log("[api] CopilotKit /api/chat route registered");
} catch (err) {
  console.warn(
    "[api] CopilotKit chat route not loaded (run: pnpm add @copilotkit/runtime @ag-ui/mastra):",
    (err as Error).message,
  );
}

app.notFound((c) => {
  return c.json(
    { error: { code: "NOT_FOUND", message: "Route not found", details: {} } },
    404,
  );
});

export { app };
