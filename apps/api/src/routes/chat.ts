import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNodeHttpEndpoint,
} from "@copilotkit/runtime";
import { getLocalAgents } from "@ag-ui/mastra";
import { mastra } from "@entropy/mastra-app/src/mastra/index.js";
import { RequestContext } from "@mastra/core/request-context";

const chat = new Hono();

chat.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["*"],
  }),
);

chat.all("/", async (c) => {
  const requestContext = new RequestContext();

  // Wrap every Mastra agent in an AG-UI compatible adapter
  const agents = getLocalAgents({ mastra, requestContext });

  const runtime = new CopilotRuntime({ agents } as never);

  return copilotRuntimeNodeHttpEndpoint({
    endpoint: "/api/chat",
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
  })(c.req.raw);
});

export { chat };
