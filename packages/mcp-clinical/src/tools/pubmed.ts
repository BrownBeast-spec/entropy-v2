import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as xml2js from "xml2js";
import { ncbiFetch, SEARCH_URL, FETCH_URL } from "../utils/ncbi-client.js";

export function registerPubMedTools(server: McpServer): void {
  // ─── 1. Search Literature ──────────────────────────────────────────
  server.tool(
    "search_literature",
    "Search PubMed for scientific papers by disease/topic.",
    {
      disease: z.string().describe("Topic or disease to search (e.g. 'NSCLC')"),
      year: z.number().optional().default(2024).describe("Publication year"),
      limit: z.number().optional().default(5).describe("Max results"),
    },
    async ({ disease, year, limit }) => {
      try {
        // 1. Search for IDs
        const searchRes = await ncbiFetch(SEARCH_URL, {
          db: "pubmed",
          term: `${disease}[Title/Abstract] AND ${year}[pdat]`,
          retmode: "json",
          retmax: limit,
        });

        const searchData = (await searchRes.json()) as Record<string, unknown>;
        const esearchResult =
          (searchData.esearchresult as Record<string, unknown>) ?? {};
        const idList = (esearchResult.idlist as string[]) ?? [];

        if (idList.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  topic: disease,
                  total_found: "0",
                  top_papers: [],
                }),
              },
            ],
          };
        }

        // 2. Fetch XML details
        const fetchRes = await ncbiFetch(FETCH_URL, {
          db: "pubmed",
          id: idList.join(","),
          retmode: "xml",
        });

        const xmlText = await fetchRes.text();

        // 3. Parse XML
        const parser = new xml2js.Parser({
          explicitArray: false,
          ignoreAttrs: false,
        });
        const result = await parser.parseStringPromise(xmlText);

        const articles =
          (result as Record<string, Record<string, unknown>>).PubmedArticleSet
            ?.PubmedArticle ?? [];
        const articlesArray = Array.isArray(articles) ? articles : [articles];

        const papers = articlesArray.map((article: Record<string, unknown>) => {
          const medlineCitation = article.MedlineCitation as Record<
            string,
            unknown
          >;
          const articleData = medlineCitation?.Article as Record<
            string,
            unknown
          >;
          const titleNode = articleData?.ArticleTitle;
          const title =
            typeof titleNode === "string"
              ? titleNode
              : (((titleNode as Record<string, unknown>)?._ as string) ??
                "No Title");

          // Abstract parsing
          let fullAbstract = "No Abstract Available.";
          const abstractNode = (
            articleData?.Abstract as Record<string, unknown>
          )?.AbstractText;
          if (abstractNode) {
            if (Array.isArray(abstractNode)) {
              fullAbstract = abstractNode
                .map((node: Record<string, unknown>) => {
                  const label = (node.$ as Record<string, string>)?.Label;
                  const text = (node._ as string) ?? node;
                  return label ? `**${label}:** ${text}` : text;
                })
                .join("\n\n");
            } else {
              fullAbstract =
                typeof abstractNode === "string"
                  ? abstractNode
                  : (((abstractNode as Record<string, unknown>)._ as string) ??
                    "");
            }
          }

          const pmidNode = medlineCitation?.PMID;
          const pmid =
            typeof pmidNode === "string"
              ? pmidNode
              : ((pmidNode as Record<string, unknown>)?._ as string);
          const journal =
            ((articleData?.Journal as Record<string, unknown>)
              ?.Title as string) ?? "Unknown Journal";

          const pubDateNode = (
            (articleData?.Journal as Record<string, unknown>)
              ?.JournalIssue as Record<string, unknown>
          )?.PubDate as Record<string, string> | undefined;
          let pubDate = "Unknown Date";
          if (pubDateNode) {
            const { Year, Month, Day, MedlineDate } = pubDateNode;
            if (MedlineDate) pubDate = MedlineDate;
            else pubDate = `${Year ?? ""} ${Month ?? ""} ${Day ?? ""}`.trim();
          }

          return {
            id: pmid,
            title,
            journal,
            pub_date: pubDate,
            abstract: fullAbstract,
            link: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : null,
          };
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                topic: disease,
                total_found: (esearchResult.count as string) ?? null,
                top_papers: papers,
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
                error: `Failed to search literature: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 2. Search Preprints ───────────────────────────────────────────
  server.tool(
    "search_preprints",
    "Search bioRxiv/medRxiv for preprints by topic.",
    {
      topic: z.string().describe("Topic to filter by"),
      server: z
        .string()
        .optional()
        .default("biorxiv")
        .describe("Server to search (biorxiv or medrxiv)"),
      days: z.number().optional().default(30).describe("Days back to search"),
    },
    async ({ topic, server: srv, days }) => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        const formatDate = (d: Date) => d.toISOString().split("T")[0];
        const interval = `${formatDate(startDate)}/${formatDate(endDate)}`;

        let res: Response;
        try {
          res = await fetch(
            `https://api.biorxiv.org/details/${srv}/${interval}`,
          );
        } catch (err) {
          throw new Error(
            `Preprint network error: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        if (!res.ok) {
          throw new Error(`Preprint API error: ${res.statusText}`);
        }

        const data = (await res.json()) as Record<string, unknown>;
        const collection =
          (data.collection as Array<Record<string, unknown>>) ?? [];

        const term = topic.toLowerCase();
        const matches: Array<Record<string, unknown>> = [];

        for (const paper of collection) {
          const paperTitle = ((paper.title as string) ?? "").toLowerCase();
          const paperAbstract = (
            (paper.abstract as string) ?? ""
          ).toLowerCase();
          if (paperTitle.includes(term) || paperAbstract.includes(term)) {
            matches.push({
              id: (paper.doi as string) ?? null,
              title: (paper.title as string) ?? null,
              date: (paper.date as string) ?? null,
              server: srv,
              link: paper.doi ? `https://doi.org/${paper.doi}` : null,
              abstract: (paper.abstract as string) ?? null,
            });
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                source: srv,
                topic,
                interval,
                total_scanned: collection.length,
                matched: matches.length,
                top_papers: matches.slice(0, 10),
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
                error: `Failed to search preprints: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 3. Get Abstract ──────────────────────────────────────────────
  server.tool(
    "get_abstract",
    "Get abstract for a specific PubMed article by PMID.",
    {
      pmid: z.string().describe("PubMed ID"),
    },
    async ({ pmid }) => {
      try {
        const fetchRes = await ncbiFetch(FETCH_URL, {
          db: "pubmed",
          id: pmid,
          retmode: "xml",
        });

        const xmlText = await fetchRes.text();

        const parser = new xml2js.Parser({
          explicitArray: false,
          ignoreAttrs: false,
        });
        const result = await parser.parseStringPromise(xmlText);

        const articleSet = (result as Record<string, Record<string, unknown>>)
          .PubmedArticleSet;
        const pubmedArticle = articleSet?.PubmedArticle as Record<
          string,
          unknown
        >;

        if (!pubmedArticle) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Article not found: ${pmid}`,
                }),
              },
            ],
          };
        }

        const medlineCitation = pubmedArticle.MedlineCitation as Record<
          string,
          unknown
        >;
        const articleData = medlineCitation?.Article as Record<string, unknown>;
        const titleNode = articleData?.ArticleTitle;
        const title =
          typeof titleNode === "string"
            ? titleNode
            : (((titleNode as Record<string, unknown>)?._ as string) ??
              "No Title");

        let abstractText = "No Abstract Available.";
        const abstractNode = (articleData?.Abstract as Record<string, unknown>)
          ?.AbstractText;
        if (abstractNode) {
          if (Array.isArray(abstractNode)) {
            abstractText = abstractNode
              .map((node: Record<string, unknown>) => {
                const label = (node.$ as Record<string, string>)?.Label;
                const text = (node._ as string) ?? node;
                return label ? `**${label}:** ${text}` : text;
              })
              .join("\n\n");
          } else {
            abstractText =
              typeof abstractNode === "string"
                ? abstractNode
                : (((abstractNode as Record<string, unknown>)._ as string) ??
                  "");
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                pmid,
                title,
                abstract: abstractText,
                link: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
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
                error: `Failed to get abstract: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 4. Get Paper Metadata ────────────────────────────────────────
  server.tool(
    "get_paper_metadata",
    "Get full metadata for a PubMed article by PMID.",
    {
      pmid: z.string().describe("PubMed ID"),
    },
    async ({ pmid }) => {
      try {
        const fetchRes = await ncbiFetch(FETCH_URL, {
          db: "pubmed",
          id: pmid,
          retmode: "xml",
        });

        const xmlText = await fetchRes.text();

        const parser = new xml2js.Parser({
          explicitArray: false,
          ignoreAttrs: false,
        });
        const result = await parser.parseStringPromise(xmlText);

        const articleSet = (result as Record<string, Record<string, unknown>>)
          .PubmedArticleSet;
        const pubmedArticle = articleSet?.PubmedArticle as Record<
          string,
          unknown
        >;

        if (!pubmedArticle) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Article not found: ${pmid}`,
                }),
              },
            ],
          };
        }

        const medlineCitation = pubmedArticle.MedlineCitation as Record<
          string,
          unknown
        >;
        const articleData = medlineCitation?.Article as Record<string, unknown>;
        const titleNode = articleData?.ArticleTitle;
        const title =
          typeof titleNode === "string"
            ? titleNode
            : (((titleNode as Record<string, unknown>)?._ as string) ??
              "No Title");

        // Authors
        const authorList = (articleData?.AuthorList as Record<string, unknown>)
          ?.Author;
        let authors: string[] = [];
        if (authorList) {
          const authorArray = Array.isArray(authorList)
            ? authorList
            : [authorList];
          authors = authorArray.map((a: Record<string, unknown>) => {
            const last = (a.LastName as string) ?? "";
            const initials = (a.Initials as string) ?? "";
            return `${last} ${initials}`.trim();
          });
        }

        // Journal
        const journal =
          ((articleData?.Journal as Record<string, unknown>)
            ?.Title as string) ?? "Unknown Journal";

        // Pub date
        const pubDateNode = (
          (articleData?.Journal as Record<string, unknown>)
            ?.JournalIssue as Record<string, unknown>
        )?.PubDate as Record<string, string> | undefined;
        let pubDate = "Unknown Date";
        if (pubDateNode) {
          const { Year, Month, Day, MedlineDate } = pubDateNode;
          if (MedlineDate) pubDate = MedlineDate;
          else pubDate = `${Year ?? ""} ${Month ?? ""} ${Day ?? ""}`.trim();
        }

        // DOI
        const articleIdList = (
          pubmedArticle.PubmedData as Record<string, unknown>
        )?.ArticleIdList as Record<string, unknown> | undefined;
        let doi: string | null = null;
        if (articleIdList) {
          const idItems = articleIdList.ArticleId;
          const idArray = Array.isArray(idItems) ? idItems : [idItems];
          for (const item of idArray) {
            if (
              typeof item === "object" &&
              item !== null &&
              (item as Record<string, unknown>).$ &&
              (item as Record<string, Record<string, string>>).$.IdType ===
                "doi"
            ) {
              doi = (item as Record<string, unknown>)._ as string;
            }
          }
        }

        // MeSH terms
        const meshList = medlineCitation?.MeshHeadingList as Record<
          string,
          unknown
        >;
        let meshTerms: string[] = [];
        if (meshList) {
          const headings = meshList.MeshHeading;
          const headingArray = Array.isArray(headings) ? headings : [headings];
          meshTerms = headingArray
            .map((h: Record<string, unknown>) => {
              const desc = h.DescriptorName;
              if (typeof desc === "string") return desc;
              return (desc as Record<string, unknown>)?._ as string;
            })
            .filter(Boolean);
        }

        // Keywords
        const keywordList = medlineCitation?.KeywordList as Record<
          string,
          unknown
        >;
        let keywords: string[] = [];
        if (keywordList) {
          const kws = keywordList.Keyword;
          const kwArray = Array.isArray(kws) ? kws : [kws];
          keywords = kwArray
            .map((k: unknown) =>
              typeof k === "string"
                ? k
                : ((k as Record<string, unknown>)?._ as string),
            )
            .filter(Boolean);
        }

        // Abstract
        let abstractText = "No Abstract Available.";
        const abstractNode = (articleData?.Abstract as Record<string, unknown>)
          ?.AbstractText;
        if (abstractNode) {
          if (Array.isArray(abstractNode)) {
            abstractText = abstractNode
              .map((node: Record<string, unknown>) => {
                const label = (node.$ as Record<string, string>)?.Label;
                const text = (node._ as string) ?? node;
                return label ? `**${label}:** ${text}` : text;
              })
              .join("\n\n");
          } else {
            abstractText =
              typeof abstractNode === "string"
                ? abstractNode
                : (((abstractNode as Record<string, unknown>)._ as string) ??
                  "");
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                pmid,
                title,
                authors,
                journal,
                pub_date: pubDate,
                doi,
                mesh_terms: meshTerms,
                keywords,
                abstract: abstractText,
                link: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
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
                error: `Failed to get paper metadata: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
