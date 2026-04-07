import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const DAILYMED_SPLS_URL =
  "https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json";

type DailyMedSplItem = {
  title?: string;
  setid?: string;
  published_date?: string;
};

type DailyMedResponse = {
  data?: DailyMedSplItem[];
  metadata?: {
    total_elements?: number;
  };
};

function parseRouteFromTitle(title: string): string {
  const upper = title.toUpperCase();
  if (upper.includes("ORAL")) return "ORAL";
  if (upper.includes("INJECTION") || upper.includes("INTRAVENOUS"))
    return "INTRAVENOUS";
  if (upper.includes("SUBCUTANEOUS")) return "SUBCUTANEOUS";
  if (upper.includes("TOPICAL")) return "TOPICAL";
  if (upper.includes("INHALATION")) return "INHALATION";
  return "UNKNOWN";
}

function parseDosageFormFromTitle(title: string): string {
  const forms = [
    "TABLET, EXTENDED RELEASE",
    "TABLET, FILM COATED",
    "TABLET",
    "CAPSULE",
    "SOLUTION",
    "INJECTION",
    "SUSPENSION",
    "CREAM",
    "OINTMENT",
  ];

  const upper = title.toUpperCase();
  const found = forms.find((f) => upper.includes(f));
  return found ?? "UNKNOWN";
}

export function registerOpenFDATools(server: McpServer): void {
  server.tool(
    "get_approved_formulations",
    "Queries DailyMed SPL API to find approved delivery mechanisms and dosage forms for a drug.",
    {
      drugName: z
        .string()
        .describe("Active ingredient or generic name (e.g. 'metformin')"),
    },
    async ({ drugName }) => {
      try {
        const url = new URL(DAILYMED_SPLS_URL);
        url.searchParams.set("drug_name", drugName);
        url.searchParams.set("pagesize", "100");
        url.searchParams.set("page", "1");

        const res = await fetch(url.toString(), {
          signal: AbortSignal.timeout(15000),
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          throw new Error(
            `DailyMed API error: ${res.status} ${res.statusText}`,
          );
        }

        const data = (await res.json()) as DailyMedResponse;
        const results = data.data ?? [];

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "No approved products found for this drug.",
                }),
              },
            ],
          };
        }

        const routes = new Set<string>();
        const productsInfo = results.map((item) => {
          const title = item.title ?? "";
          const route = parseRouteFromTitle(title);
          const dosage_form = parseDosageFormFromTitle(title);
          routes.add(route);
          return {
            label_title: title,
            setid: item.setid ?? null,
            published_date: item.published_date ?? null,
            route,
            dosage_form,
          };
        });

        const approved_routes = Array.from(routes);
        const common_routes = [
          "ORAL",
          "INTRAVENOUS",
          "SUBCUTANEOUS",
          "TOPICAL",
          "INTRAMUSCULAR",
          "INHALATION",
        ];
        const whitespace_opportunities = common_routes.filter(
          (r) => !approved_routes.includes(r),
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                drug_name: drugName,
                source: "DailyMed SPL API",
                approved_delivery_routes: approved_routes,
                whitespace_opportunities,
                total_products_checked: results.length,
                sample_products: productsInfo.slice(0, 10),
              }),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: `Failed to query DailyMed: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
