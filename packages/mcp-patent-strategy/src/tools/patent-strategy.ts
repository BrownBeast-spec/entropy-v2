/**
 * Patent Strategy Tools
 *
 * MCP tools for pharmaceutical patent strategy analysis, combining:
 * - FDA Orange Book data (approved drugs + regulatory exclusivity)
 * - USPTO PatentsView API (patent landscape analysis)
 *
 * These tools support IP strategy research with government-cited facts.
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildCitation, type CitedFact } from "@entropy/mcp-shared";
import {
  searchOrangeBookByIngredient,
  getOrangeBookByApplNo,
} from "../utils/orange-book-loader.js";
import {
  searchPatentsByKeyword,
  getPatentDetails,
  getPatentsByAssignee,
} from "../utils/patents-client.js";

const ORANGE_BOOK_BASE_URL =
  "https://www.fda.gov/drugs/drug-approvals-and-databases/approved-drug-products-therapeutic-equivalence-evaluations-orange-book";

export function registerPatentStrategyTools(server: McpServer): void {
  // ─── 1. Search Orange Book ────────────────────────────────────────
  server.tool(
    "search_orange_book",
    "Search FDA Orange Book for approved drug products by active ingredient name. Returns patent and exclusivity data.",
    {
      ingredient: z
        .string()
        .describe("Active ingredient name (e.g., 'metformin', 'atorvastatin')"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Max results to return (default: 10)"),
    },
    async ({ ingredient, limit }) => {
      try {
        const products = await searchOrangeBookByIngredient(ingredient);
        const limitedProducts = products.slice(0, limit);

        const facts: CitedFact[] = limitedProducts.map((product) => {
          const factDescription = `${product.ingredient} - ${product.tradeName} (${product.dfRoute}, ${product.strength}) - Applicant: ${product.applicant}, Appl No: ${product.applNo}, Approved: ${product.approvalDate || "N/A"}`;

          return buildCitation(
            `Approved drug product in FDA Orange Book`,
            factDescription,
            "FDA Orange Book",
            ORANGE_BOOK_BASE_URL,
            product.applNo,
            "verified",
          );
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                ingredient,
                total_found: products.length,
                results_returned: facts.length,
                results: facts.map((f) => ({
                  claim: f.claim,
                  value: f.value,
                  source: f.source,
                  confidence: f.confidence,
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
                    : "Failed to search Orange Book",
              }),
            },
          ],
        };
      }
    },
  );

  // ─── 2. Get Patent Details ────────────────────────────────────────
  server.tool(
    "get_patent_details",
    "Get detailed information about a specific USPTO patent by patent number.",
    {
      patentNumber: z
        .string()
        .describe("USPTO patent number (e.g., '6303607', '8158152')"),
    },
    async ({ patentNumber }) => {
      try {
        const patent = await getPatentDetails(patentNumber);

        if (!patent) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "Patent not found",
                }),
              },
            ],
          };
        }

        const patentUrl = `https://patents.google.com/patent/US${patentNumber}`;
        const factDescription = `Patent ${patentNumber}: ${patent.patent_title}. Filed: ${patent.patent_date}. Abstract: ${patent.patent_abstract?.substring(0, 300)}...`;

        const cited = buildCitation(
          "USPTO patent",
          factDescription,
          "USPTO Patents View",
          patentUrl,
          patentNumber,
          "verified",
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                patent_number: patent.patent_number,
                title: patent.patent_title,
                abstract: patent.patent_abstract,
                date: patent.patent_date,
                assignees:
                  patent.assignees
                    ?.map((a) => a.assignee_organization)
                    .filter(Boolean) || [],
                inventors:
                  patent.inventors
                    ?.map(
                      (i) => `${i.inventor_first_name} ${i.inventor_last_name}`,
                    )
                    .filter(Boolean) || [],
                citation: cited,
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
                    : "Failed to get patent details",
              }),
            },
          ],
        };
      }
    },
  );

  // ─── 3. Analyze Patent Landscape ─────────────────────────────────
  server.tool(
    "analyze_patent_landscape",
    "Analyze the patent landscape for a drug/compound by combining Orange Book data with USPTO patent searches.",
    {
      drugName: z
        .string()
        .describe("Drug or compound name (e.g., 'metformin')"),
      includeCompetitors: z
        .boolean()
        .optional()
        .default(false)
        .describe("Include competitor patent analysis (default: false)"),
    },
    async ({ drugName, includeCompetitors }) => {
      try {
        // 1. Search Orange Book
        const orangeBookProducts = await searchOrangeBookByIngredient(drugName);

        // 2. Get patents for top products
        const productDetails = await Promise.all(
          orangeBookProducts
            .slice(0, 3)
            .map((p) => getOrangeBookByApplNo(p.applNo)),
        );

        // 3. Search USPTO for related patents
        const usptoResults = await searchPatentsByKeyword(drugName, {
          yearFrom: 2010,
          limit: 20,
        });

        // 4. Group assignees
        const assigneeCounts = new Map<string, number>();
        usptoResults.patents?.forEach((patent) => {
          patent.assignees?.forEach((a) => {
            if (a.assignee_organization) {
              assigneeCounts.set(
                a.assignee_organization,
                (assigneeCounts.get(a.assignee_organization) || 0) + 1,
              );
            }
          });
        });

        const topAssignees = Array.from(assigneeCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => ({ name, patent_count: count }));

        const cited = buildCitation(
          "Patent landscape analysis",
          `${orangeBookProducts.length} approved products, ${usptoResults.total_patent_count} related patents since 2010`,
          "FDA Orange Book + USPTO PatentsView",
          ORANGE_BOOK_BASE_URL,
          undefined,
          "verified",
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                drug_name: drugName,
                approved_products_count: orangeBookProducts.length,
                total_patents_found: usptoResults.total_patent_count,
                top_assignees: topAssignees,
                sample_products: orangeBookProducts.slice(0, 5).map((p) => ({
                  trade_name: p.tradeName,
                  applicant: p.applicant,
                  approval_date: p.approvalDate,
                })),
                citation: cited,
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
                    : "Failed to analyze patent landscape",
              }),
            },
          ],
        };
      }
    },
  );

  // ─── 4. Get Company Patent Timeline ─────────────────────────────
  server.tool(
    "get_company_patent_timeline",
    "Get patent filing timeline for a pharmaceutical company to identify IP strategy trends.",
    {
      company: z
        .string()
        .describe("Company/organization name (e.g., 'Pfizer', 'Novartis')"),
      drugKeyword: z
        .string()
        .optional()
        .describe("Optional drug keyword to filter patents"),
      yearFrom: z
        .number()
        .optional()
        .default(2015)
        .describe("Start year (default: 2015)"),
      yearTo: z
        .number()
        .optional()
        .default(new Date().getFullYear())
        .describe("End year (default: current year)"),
    },
    async ({ company, drugKeyword, yearFrom, yearTo }) => {
      try {
        const results = await getPatentsByAssignee(company, {
          yearFrom,
          yearTo,
          drugKeyword,
          limit: 100,
        });

        const patents = results.patents || [];

        // Group by year
        const yearCounts = new Map<number, number>();
        patents.forEach((patent) => {
          const year = parseInt(patent.patent_date.substring(0, 4));
          yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
        });

        const timeline = Array.from(yearCounts.entries())
          .map(([year, count]) => ({ year, count }))
          .sort((a, b) => a.year - b.year);

        const cited = buildCitation(
          "Company patent timeline",
          `${patents.length} patents filed${drugKeyword ? ` related to ${drugKeyword}` : ""}`,
          "USPTO PatentsView",
          `https://search.patentsview.org`,
          undefined,
          "verified",
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                company,
                drug_keyword: drugKeyword || "all",
                year_range: `${yearFrom}-${yearTo}`,
                total_patents: results.total_patent_count || patents.length,
                timeline,
                recent_patents: patents.slice(0, 10).map((p) => ({
                  number: p.patent_number,
                  title: p.patent_title,
                  date: p.patent_date,
                })),
                citation: cited,
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
                    : "Failed to get company patent timeline",
              }),
            },
          ],
        };
      }
    },
  );
}
