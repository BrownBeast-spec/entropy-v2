import { Hono } from "hono";
import { z } from "zod";
import { errorResponse } from "../middleware/error-handler.js";
import { runUnifiedSearch } from "./entropy.js";
import { mastra } from "@entropy/mastra-app/src/mastra/index.js";

const strategist = new Hono();

const GatherSchema = z.object({
  workspaceId: z.string().min(1),
  queryText: z.string().min(1),
  context: z.record(z.any()).optional(),
});

const StrategySchema = z.object({
  workspaceId: z.string().min(1),
  queryText: z.string().min(1),
  gatheredResources: z.array(z.unknown()).min(1),
});

const ChatSchema = z.object({
  workspaceId: z.string().min(1),
  userQuestion: z.string().min(1),
  gatheredResources: z.array(z.unknown()).default([]),
  strategyMarkdown: z.string().optional(),
  trustedWebFindings: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
        source: z.string(),
        summary: z.string(),
      }),
    )
    .optional(),
});

function toMarkdownSections(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  const parts = normalized
    .split(/^##\s+/m)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return [
      {
        title: "Executive Summary",
        content: normalized || "No strategy output generated.",
        citations: [],
      },
    ];
  }

  return parts.map((part) => {
    const [headline, ...rest] = part.split("\n");
    return {
      title: headline.replace(/^#+\s*/, "").trim() || "Section",
      content: rest.join("\n").trim() || "No content",
      citations: [],
    };
  });
}

type TrustedFinding = {
  title: string;
  url: string;
  source: string;
  summary: string;
};

async function callPerplexity(
  messages: Array<{ role: "system" | "user"; content: string }>,
): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY is not configured");
  }

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Perplexity API error: ${response.status} ${response.statusText}`,
    );
  }

  const json = (await response.json()) as any;
  return String(json?.choices?.[0]?.message?.content ?? "");
}

async function fetchTrustedWebFindings(
  queryText: string,
  gatheredResources: unknown[],
): Promise<TrustedFinding[]> {
  const highSignal = gatheredResources
    .slice(0, 12)
    .map(
      (r: any) =>
        `${r?.label ?? r?.title ?? "Untitled"} (${r?.source ?? "unknown"})`,
    )
    .join("\n");

  const prompt = [
    "Find trusted corroborating web sources for this pharma strategy query.",
    `Query: ${queryText}`,
    "Use only trusted sources such as FDA, CMS, ClinicalTrials.gov, NIH, SEC filings, major journals, company IR.",
    "Return STRICT JSON array only with title,url,source,summary (max 8).",
    "Current gathered resources:",
    highSignal,
  ].join("\n");

  try {
    const text = await callPerplexity([
      {
        role: "system",
        content: "Return valid JSON only. No markdown.",
      },
      { role: "user", content: prompt },
    ]);
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x === "object")
      .map((x) => ({
        title: String((x as any).title ?? "Untitled"),
        url: String((x as any).url ?? ""),
        source: String((x as any).source ?? "web"),
        summary: String((x as any).summary ?? ""),
      }))
      .filter((x) => x.url.startsWith("http"))
      .slice(0, 8);
  } catch {
    return [];
  }
}

strategist.post("/gather", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, "BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = GatherSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Invalid request body", {
      issues: parsed.error.issues,
    });
  }

  try {
    const systemPrompt = `You are a specialized pharma research data gatherer. You MUST strictly use web search to find relevant information. You MUST restrict your searches to these domains: pubmed.ncbi.nlm.nih.gov, pubchem.ncbi.nlm.nih.gov, uniprot.org, opentargets.org, europepmc.org. Do NOT use other generic sites. Return your findings as a strict JSON array ONLY with properties: id (string), label (string), type (string), source (string), description (string), url (string). Do not return markdown, just raw JSON array without backticks.`;
    const userPrompt = `Query: ${parsed.data.queryText}\nContext: ${JSON.stringify(parsed.data.context || {})}\nPlease gather as many high quality distinct resources as possible from the specified sites around this query and context. Do not restrict the count of resources found.`;

    const text = await callPerplexity([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    let resources = [];
    try {
      const jsonStart = text.indexOf('[');
      const jsonEnd = text.lastIndexOf(']');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        resources = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
      }
    } catch {
      resources = [];
    }

    const searchedSources = Array.from(
      new Set(
        resources
          .map((result: any) =>
            typeof result?.source === "string" ? result.source : undefined,
          )
          .filter((value): value is string => Boolean(value)),
      ),
    );

    return c.json({
      workspaceId: parsed.data.workspaceId,
      queryText: parsed.data.queryText,
      resources,
      searchedSources,
      executionTime: 0,
      sourceDiagnostics: [],
    });
  } catch (error) {
    return errorResponse(
      c,
      500,
      "STRATEGIST_GATHER_FAILED",
      error instanceof Error
        ? error.message
        : "Failed to gather strategist resources",
    );
  }
});

strategist.post("/strategy", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, "BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = StrategySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Invalid request body", {
      issues: parsed.error.issues,
    });
  }

  try {
    const strategistWorkflow = mastra.getWorkflow("strategistPipelineWorkflow");
    const run = await strategistWorkflow.createRun();

    const resourceDigest = parsed.data.gatheredResources
      .slice(0, 40)
      .map((resource: any, index) => {
        const label =
          typeof resource?.label === "string"
            ? resource.label
            : typeof resource?.title === "string"
              ? resource.title
              : `Resource ${index + 1}`;
        const source =
          typeof resource?.source === "string" ? resource.source : "unknown";
        const summary =
          typeof resource?.description === "string"
            ? resource.description
            : typeof resource?.summary === "string"
              ? resource.summary
              : typeof resource?.helpfulness?.explanation === "string"
                ? resource.helpfulness.explanation
                : "";
        const entityType =
          typeof resource?.entityType === "string"
            ? resource.entityType
            : typeof resource?.type === "string"
              ? resource.type
              : "unknown";
        return `- ${label} [source: ${source}] [type: ${entityType}]\n  Summary: ${summary}`.trim();
      })
      .join("\n");

    const prompt = [
      `Business Query: ${parsed.data.queryText}`,
      "",
      "Gathered Evidence:",
      resourceDigest || "No gathered evidence provided.",
      "",
      "Use gathered evidence plus your MCP tools to produce a pragmatic strategy.",
      "If evidence conflicts, explicitly state confidence and assumptions.",
    ].join("\n");

    const result = await run.start({ inputData: { prompt } });
    if (result.status !== "success") {
      throw new Error(
        `Strategist workflow failed: ${result.status} ${JSON.stringify(result)}`,
      );
    }

    const markdown =
      ((result.result as { result?: unknown })?.result as string | undefined) ??
      JSON.stringify(result.result);

    const trustedWebFindings = await fetchTrustedWebFindings(
      parsed.data.queryText,
      parsed.data.gatheredResources,
    );

    return c.json({
      workspaceId: parsed.data.workspaceId,
      queryText: parsed.data.queryText,
      markdown,
      sections: toMarkdownSections(markdown),
      trustedWebFindings,
    });
  } catch (error) {
    return errorResponse(
      c,
      500,
      "STRATEGIST_STRATEGY_FAILED",
      error instanceof Error
        ? error.message
        : "Failed to generate strategist output",
    );
  }
});

strategist.post("/chat", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 400, "BAD_REQUEST", "Invalid JSON body");
  }

  const parsed = ChatSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Invalid request body", {
      issues: parsed.error.issues,
    });
  }

  const evidence = parsed.data.gatheredResources
    .slice(0, 30)
    .map((r: any) => {
      const summary = r?.summary ?? r?.description ?? "No summary available";
      return `- ${r?.label ?? r?.title ?? "Untitled"} [${r?.source ?? "unknown"}]\n  Summary: ${summary}`;
    })
    .join("\n\n");
  const web = (parsed.data.trustedWebFindings ?? [])
    .slice(0, 8)
    .map((w) => `- ${w.title} (${w.source}) ${w.url}`)
    .join("\n");

  const prompt = [
    "You are a strategist copilot. Answer user follow-up questions grounded in gathered evidence.",
    "If evidence is insufficient, explicitly say what is missing.",
    "",
    `User question: ${parsed.data.userQuestion}`,
    "",
    "Strategy draft:",
    parsed.data.strategyMarkdown ?? "No strategy yet",
    "",
    "Gathered resources:",
    evidence,
    "",
    "Trusted web findings:",
    web || "None",
  ].join("\n");

  try {
    const text = await callPerplexity([
      {
        role: "system",
        content:
          "You are a strategic pharma copilot. Stay grounded in provided evidence and highlight uncertainties. If you discover new evidence or resources via web search during your chat, you must include them. YOU MUST RETURN STRICT JSON ONLY, matching EXACTLY this structure: {\"answer\": \"your conversational markdown response answering the user text\", \"newResources\": [{\"id\":\"string\", \"label\":\"string\", \"type\":\"string\", \"source\":\"string\", \"description\":\"string\", \"url\":\"string\"}]}. Do not include markdown codeblocks around the JSON response.",
      },
      { role: "user", content: prompt },
    ]);
    
    let answer = "No response generated.";
    let newResources = [];
    try {
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const parsedRes = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
        answer = parsedRes.answer || answer;
        newResources = parsedRes.newResources || [];
      } else {
        answer = text;
      }
    } catch {
      answer = text;
    }
    
    return c.json({ answer, newResources });
  } catch (error) {
    return errorResponse(
      c,
      500,
      "STRATEGIST_CHAT_FAILED",
      error instanceof Error
        ? error.message
        : "Failed to answer strategist chat",
    );
  }
});

export { strategist };
