import { Hono } from "hono";
import { research } from "./routes/research.js";
import { health } from "./routes/health.js";

const app = new Hono();

app.route("/api/research", research);
app.route("/api/health", health);

app.notFound((c) => {
  return c.json(
    { error: { code: "NOT_FOUND", message: "Route not found", details: {} } },
    404,
  );
});

export { app };
