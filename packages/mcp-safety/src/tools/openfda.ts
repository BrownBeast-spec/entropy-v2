import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fdaFetch } from "../utils/openfda-client.js";

export function registerOpenFdaTools(server: McpServer): void {
  // ─── 1. Check Drug Safety ────────────────────────────────────────────
  server.tool(
    "check_drug_safety",
    "Check drug safety including label, boxed warning, contraindications and indications from OpenFDA.",
    {
      drug: z.string().describe("Brand name of the drug (e.g. 'Humira')"),
    },
    async ({ drug }) => {
      try {
        const data = await fdaFetch("/drug/label.json", {
          search: `openfda.brand_name:${drug}`,
          limit: 1,
        });

        if (
          !data ||
          !Array.isArray(data["results"]) ||
          data["results"].length === 0
        ) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  drug,
                  risk_level: "Unknown",
                  boxed_warning: "N/A",
                  contraindications: "N/A",
                  indications: "N/A",
                  dosage: "N/A",
                }),
              },
            ],
          };
        }

        const r = data["results"][0] as Record<string, unknown>;
        const getText = (v: unknown): string =>
          Array.isArray(v)
            ? (v as string[]).join(" ").trim()
            : v
              ? String(v).trim()
              : "N/A";

        const boxedWarning = getText(r["boxed_warning"]);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                drug,
                risk_level: boxedWarning !== "N/A" ? "HIGH_RISK" : "Standard",
                boxed_warning: boxedWarning,
                contraindications: getText(r["contraindications"]),
                indications: getText(r["indications_and_usage"]),
                dosage: getText(
                  r["dosage_and_administration_table"] ??
                    r["dosage_and_administration"],
                ),
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
                error: `Failed to check drug safety: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 2. Check Adverse Events ─────────────────────────────────────────
  server.tool(
    "check_adverse_events",
    "Get the top reported adverse reaction terms for a drug from OpenFDA FAERS.",
    {
      drug: z.string().describe("Drug name (generic or brand)"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Max number of reactions to return"),
    },
    async ({ drug, limit }) => {
      try {
        const data = await fdaFetch("/drug/event.json", {
          search: `patient.drug.medicinalproduct:${drug}`,
          count: "patient.reaction.reactionmeddrapt.exact",
          limit,
        });

        const results =
          (data?.["results"] as Array<{ term: string; count: number }>) ?? [];
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                drug,
                top_reactions: results.map((r) => ({
                  reaction: r.term,
                  count: r.count,
                })),
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
                error: `Failed to check adverse events: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 3. Check Recalls ────────────────────────────────────────────────
  server.tool(
    "check_recalls",
    "Get recent FDA enforcement actions (recalls) for a drug.",
    {
      drug: z.string().describe("Drug name to search enforcement records for"),
    },
    async ({ drug }) => {
      try {
        const data = await fdaFetch("/drug/enforcement.json", {
          search: `product_description:${drug}`,
          limit: 5,
          sort: "report_date:desc",
        });

        if (!data) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ drug, found: 0, recalls: [] }),
              },
            ],
          };
        }

        const results =
          (data["results"] as Array<Record<string, unknown>>) ?? [];
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                drug,
                found: results.length,
                recalls: results.map((r) => ({
                  reason: (r["reason_for_recall"] as string) ?? null,
                  status: (r["status"] as string) ?? null,
                  date: (r["report_date"] as string) ?? null,
                  classification: (r["classification"] as string) ?? null,
                })),
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
                error: `Failed to check recalls: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 4. Get NDC Info ──────────────────────────────────────────────────
  server.tool(
    "get_ndc_info",
    "Get National Drug Code (NDC) directory info — labeler, dosage form, active ingredients.",
    {
      ndc: z.string().describe("NDC code (e.g. '0173-0715')"),
    },
    async ({ ndc }) => {
      try {
        const data = await fdaFetch("/drug/ndc.json", {
          search: `product_ndc:${ndc}`,
          limit: 1,
        });

        if (
          !data ||
          !Array.isArray(data["results"]) ||
          data["results"].length === 0
        ) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  ndc,
                  brand_name: null,
                  generic_name: null,
                  labeler_name: null,
                  dosage_form: null,
                  route: [],
                  active_ingredients: [],
                }),
              },
            ],
          };
        }

        const r = data["results"][0] as Record<string, unknown>;
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                ndc,
                brand_name: (r["brand_name"] as string) ?? null,
                generic_name: (r["generic_name"] as string) ?? null,
                labeler_name: (r["labeler_name"] as string) ?? null,
                dosage_form: (r["dosage_form"] as string) ?? null,
                route: (r["route"] as string[]) ?? [],
                active_ingredients:
                  (r["active_ingredients"] as unknown[]) ?? [],
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
                error: `Failed to get NDC info: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 5. Search Drugs@FDA ──────────────────────────────────────────────
  server.tool(
    "search_drugs_fda",
    "Search the Drugs@FDA database for approved drug products and their regulatory history.",
    {
      query: z.string().describe("Brand or generic drug name to search"),
      limit: z.number().optional().default(10),
    },
    async ({ query, limit }) => {
      try {
        const data = await fdaFetch("/drug/drugsfda.json", {
          search: `openfda.brand_name:${query}`,
          limit,
        });

        if (!data || !Array.isArray(data["results"])) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  query,
                  total_found: 0,
                  drugs: [],
                }),
              },
            ],
          };
        }

        const drugs: Array<{
          application_number: string | null;
          sponsor_name: string | null;
          brand_name: string | null;
          dosage_form: string | null;
          marketing_status: string | null;
        }> = [];

        for (const result of data["results"] as Array<
          Record<string, unknown>
        >) {
          for (const product of (result["products"] as Array<
            Record<string, unknown>
          >) ?? []) {
            drugs.push({
              application_number:
                (result["application_number"] as string) ?? null,
              sponsor_name: (result["sponsor_name"] as string) ?? null,
              brand_name: (product["brand_name"] as string) ?? null,
              dosage_form: (product["dosage_form"] as string) ?? null,
              marketing_status: (product["marketing_status"] as string) ?? null,
            });
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                query,
                total_found: drugs.length,
                drugs,
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
                error: `Failed to search Drugs@FDA: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 6. Get Drug Shortages ────────────────────────────────────────────
  server.tool(
    "get_drug_shortages",
    "Get current FDA drug shortage information, critical for supply chain context.",
    {
      drug: z
        .string()
        .optional()
        .describe("Drug name to filter by (leave empty for recent shortages)"),
    },
    async ({ drug }) => {
      try {
        const params: Record<string, string | number | undefined> = {
          limit: 20,
        };
        if (drug) params["search"] = `product_description:${drug}`;

        const data = await fdaFetch("/drug/drugshortages.json", params);

        if (!data) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  query: drug ?? null,
                  total_shortages: 0,
                  shortages: [],
                }),
              },
            ],
          };
        }

        const results =
          (data["results"] as Array<Record<string, unknown>>) ?? [];
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                query: drug ?? null,
                total_shortages: results.length,
                shortages: results.map((r) => ({
                  product_description:
                    (r["product_description"] as string) ?? null,
                  status: (r["status"] as string) ?? null,
                  reason: (r["reason"] as unknown[]) ?? [],
                })),
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
                error: `Failed to get drug shortages: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
