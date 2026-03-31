import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { patentsViewFetch } from "../utils/patents-client.js";

export function registerPatentsTools(server: McpServer): void {
  // ─── 1. Search Patents by Drug Name ───────────────────────────────
  server.tool(
    "search_patents_by_drug",
    "Search pharmaceutical patents by drug name or compound.",
    {
      drugName: z
        .string()
        .describe("Drug or compound name (e.g. 'metformin', 'aspirin')"),
      yearFrom: z.number().optional().describe("Start year (e.g. 2020)"),
      yearTo: z.number().optional().describe("End year (e.g. 2024)"),
      limit: z.number().optional().default(20).describe("Max results (1-100)"),
    },
    async ({ drugName, yearFrom, yearTo, limit }) => {
      try {
        const query: {
          q: {
            _text_any: { patent_abstract: string };
            _gte?: { patent_date: string };
            _lte?: { patent_date: string };
          };
          f: string[];
          o: { per_page: number; page: number };
          s: Array<{ patent_date: string }>;
        } = {
          q: {
            _text_any: {
              patent_abstract: drugName,
            },
          },
          f: [
            "patent_number",
            "patent_title",
            "patent_abstract",
            "patent_date",
            "assignee_organization",
            "inventor_first_name",
            "inventor_last_name",
          ],
          o: {
            per_page: Math.min(limit, 100),
            page: 1,
          },
          s: [{ patent_date: "desc" }],
        };

        // Add date filters if provided
        if (yearFrom) {
          query.q._gte = { patent_date: `${yearFrom}-01-01` };
        }
        if (yearTo) {
          query.q._lte = { patent_date: `${yearTo}-12-31` };
        }

        const response = await patentsViewFetch("patent", query);
        const data = (await response.json()) as {
          patents?: Array<{
            patent_number: string;
            patent_title: string;
            patent_abstract: string;
            patent_date: string;
            assignees?: Array<{ assignee_organization?: string }>;
            inventors?: Array<{
              inventor_first_name?: string;
              inventor_last_name?: string;
            }>;
          }>;
          count?: number;
          total_patent_count?: number;
        };

        const patents = (data.patents ?? []).map((patent) => {
          const assignees =
            patent.assignees
              ?.map((a) => a.assignee_organization)
              .filter(Boolean) ?? [];
          const inventors =
            patent.inventors
              ?.map((i) =>
                `${i.inventor_first_name ?? ""} ${i.inventor_last_name ?? ""}`.trim(),
              )
              .filter(Boolean) ?? [];

          return {
            patent_number: patent.patent_number,
            title: patent.patent_title,
            abstract: patent.patent_abstract
              ? patent.patent_abstract.substring(0, 300) +
                (patent.patent_abstract.length > 300 ? "..." : "")
              : "No abstract available",
            date: patent.patent_date,
            assignees: assignees.length > 0 ? assignees : ["Unknown"],
            inventors:
              inventors.length > 0 ? inventors.slice(0, 5) : ["Unknown"],
            url: `https://patents.google.com/patent/US${patent.patent_number}`,
          };
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                drug: drugName,
                total_found: data.total_patent_count ?? 0,
                results_returned: patents.length,
                patents,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Unknown error searching patents",
              }),
            },
          ],
        };
      }
    },
  );

  // ─── 2. Get Patent Timeline by Assignee ───────────────────────────
  server.tool(
    "get_patent_timeline",
    "Get patent filing timeline for a company/organization.",
    {
      assignee: z
        .string()
        .describe("Company or organization name (e.g. 'Pfizer', 'Merck')"),
      drugKeyword: z
        .string()
        .optional()
        .describe("Optional drug keyword to filter patents"),
      yearFrom: z.number().optional().default(2015).describe("Start year"),
      yearTo: z.number().optional().default(2025).describe("End year"),
    },
    async ({ assignee, drugKeyword, yearFrom, yearTo }) => {
      try {
        const query: {
          q: {
            _and: Array<{
              assignee_organization?: string;
              _gte?: { patent_date: string };
              _lte?: { patent_date: string };
              _text_any?: { patent_abstract: string };
            }>;
          };
          f: string[];
          o: { per_page: number };
          s: Array<{ patent_date: string }>;
        } = {
          q: {
            _and: [
              { assignee_organization: assignee },
              { _gte: { patent_date: `${yearFrom}-01-01` } },
              { _lte: { patent_date: `${yearTo}-12-31` } },
            ],
          },
          f: ["patent_number", "patent_title", "patent_date"],
          o: { per_page: 100 },
          s: [{ patent_date: "desc" }],
        };

        if (drugKeyword) {
          query.q._and.push({
            _text_any: { patent_abstract: drugKeyword },
          });
        }

        const response = await patentsViewFetch("patent", query);
        const data = (await response.json()) as {
          patents?: Array<{
            patent_number: string;
            patent_title: string;
            patent_date: string;
          }>;
          total_patent_count?: number;
        };

        const patents = data.patents ?? [];

        // Group by year
        const yearCounts: Record<string, number> = {};
        patents.forEach((patent) => {
          const year = patent.patent_date.substring(0, 4);
          yearCounts[year] = (yearCounts[year] ?? 0) + 1;
        });

        const timeline = Object.entries(yearCounts)
          .map(([year, count]) => ({ year: parseInt(year), count }))
          .sort((a, b) => a.year - b.year);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                assignee,
                drug_keyword: drugKeyword ?? "all",
                year_range: `${yearFrom}-${yearTo}`,
                total_patents: data.total_patent_count ?? 0,
                timeline,
                recent_patents: patents.slice(0, 10).map((p) => ({
                  number: p.patent_number,
                  title: p.patent_title,
                  date: p.patent_date,
                })),
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Error fetching patent timeline",
              }),
            },
          ],
        };
      }
    },
  );

  // ─── 3. Get Top Patent Assignees ──────────────────────────────────
  server.tool(
    "get_top_assignees",
    "Find companies with most patents for a drug/technology.",
    {
      drugKeyword: z.string().describe("Drug or technology keyword"),
      yearFrom: z.number().optional().default(2020).describe("Start year"),
      yearTo: z.number().optional().default(2025).describe("End year"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Max assignees to return"),
    },
    async ({ drugKeyword, yearFrom, yearTo, limit }) => {
      try {
        const query = {
          q: {
            _and: [
              { _text_any: { patent_abstract: drugKeyword } },
              { _gte: { patent_date: `${yearFrom}-01-01` } },
              { _lte: { patent_date: `${yearTo}-12-31` } },
            ],
          },
          f: ["patent_number", "assignee_organization"],
          o: { per_page: 500 }, // Get more to aggregate
        };

        const response = await patentsViewFetch("patent", query);
        const data = (await response.json()) as {
          patents?: Array<{
            patent_number: string;
            assignees?: Array<{ assignee_organization?: string }>;
          }>;
          total_patent_count?: number;
        };

        const patents = data.patents ?? [];

        // Count patents by assignee
        const assigneeCounts: Record<string, number> = {};
        patents.forEach((patent) => {
          const assignees = patent.assignees ?? [];
          assignees.forEach((assignee) => {
            const org = assignee.assignee_organization;
            if (org) {
              assigneeCounts[org] = (assigneeCounts[org] ?? 0) + 1;
            }
          });
        });

        const topAssignees = Object.entries(assigneeCounts)
          .map(([name, count]) => ({ name, patent_count: count }))
          .sort((a, b) => b.patent_count - a.patent_count)
          .slice(0, limit);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                drug_keyword: drugKeyword,
                year_range: `${yearFrom}-${yearTo}`,
                total_patents: data.total_patent_count ?? 0,
                top_assignees: topAssignees,
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Error fetching top assignees",
              }),
            },
          ],
        };
      }
    },
  );
}
