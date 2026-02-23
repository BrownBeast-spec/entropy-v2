import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import * as xml2js from "xml2js";

const SEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const FETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";

async function ncbiFetch(url: string, params: Record<string, string | number>) {
    const finalUrl = new URL(url);
    for (const [k, v] of Object.entries(params)) finalUrl.searchParams.set(k, String(v));

    const email = process.env["NCBI_EMAIL"];
    const apiKey = process.env["NCBI_API_KEY"];
    if (email) finalUrl.searchParams.set("email", email);
    if (apiKey) finalUrl.searchParams.set("api_key", apiKey);

    const res = await fetch(finalUrl.toString());
    if (!res.ok) throw new Error(`NCBI API error: ${res.statusText}`);
    return res;
}

// ─── 1. Search Literature (PubMed) ────────────────────────────────────────

export const searchLiterature = createTool({
    id: "pubmed-search-literature",
    description: "Search scientific literature by topic/disease on PubMed.",
    inputSchema: z.object({
        disease: z.string().describe("Topic or disease to search (e.g. 'NSCLC')"),
        year: z.number().optional().default(2024).describe("Publication year"),
        limit: z.number().optional().default(5).describe("Max results"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        topic: z.string(),
        total_found: z.string().nullable(),
        top_papers: z.array(z.object({
            id: z.string().nullable(),
            title: z.string().nullable(),
            journal: z.string().nullable(),
            pub_date: z.string().nullable(),
            abstract: z.string().nullable(),
            link: z.string().nullable(),
        })),
    }),
    execute: async (context: any) => {
        // 1. Search for IDs
        const searchRes = await ncbiFetch(SEARCH_URL, {
            db: "pubmed",
            term: `${context.disease}[Title/Abstract] AND ${context.year}[pdat]`,
            retmode: "json",
            retmax: context.limit,
        });

        const searchData = await searchRes.json() as any;
        const idList = searchData?.esearchresult?.idlist || [];
        if (idList.length === 0) throw new Error("No papers found.");

        // 2. Fetch XML details
        const fetchRes = await ncbiFetch(FETCH_URL, {
            db: "pubmed",
            id: idList.join(","),
            retmode: "xml",
        });

        const xmlText = await fetchRes.text();

        // 3. Parse XML using xml2js
        const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
        const result = await parser.parseStringPromise(xmlText);

        const articles = result.PubmedArticleSet?.PubmedArticle || [];
        const articlesArray = Array.isArray(articles) ? articles : [articles];

        const papers = articlesArray.map(article => {
            const medlineCitation = article.MedlineCitation;
            const articleData = medlineCitation?.Article;
            const title = typeof articleData?.ArticleTitle === 'string' ? articleData.ArticleTitle : articleData?.ArticleTitle?._ || "No Title";

            // Abstract parsing
            let fullAbstract = "No Abstract Available.";
            const abstractNode = articleData?.Abstract?.AbstractText;
            if (abstractNode) {
                if (Array.isArray(abstractNode)) {
                    fullAbstract = abstractNode.map((node: any) => {
                        const label = node.$?.Label;
                        const text = node._ || node;
                        return label ? `**${label}:** ${text}` : text;
                    }).join("\n\n");
                } else {
                    fullAbstract = typeof abstractNode === 'string' ? abstractNode : (abstractNode._ || "");
                }
            }

            const pmid = typeof medlineCitation?.PMID === 'string' ? medlineCitation.PMID : medlineCitation?.PMID?._;
            const journal = articleData?.Journal?.Title || "Unknown Journal";

            const pubDateNode = articleData?.Journal?.JournalIssue?.PubDate;
            let pubDate = "Unknown Date";
            if (pubDateNode) {
                const { Year, Month, Day, MedlineDate } = pubDateNode;
                if (MedlineDate) pubDate = MedlineDate;
                else pubDate = `${Year || ""} ${Month || ""} ${Day || ""}`.trim();
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
            agent: "PubMed",
            topic: context.disease,
            total_found: searchData?.esearchresult?.count ?? null,
            top_papers: papers,
        };
    },
});

// ─── 2. Search Preprints (bioRxiv/medRxiv) ────────────────────────────────

export const searchPreprints = createTool({
    id: "pubmed-search-preprints",
    description: "Fetch recent preprints from bioRxiv/medRxiv and filter by topic.",
    inputSchema: z.object({
        topic: z.string().describe("Topic to filter by"),
        server: z.string().optional().default("biorxiv").describe("Server to search (biorxiv or medrxiv)"),
        days: z.number().optional().default(30).describe("Days back to search"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        source: z.string(),
        topic: z.string(),
        interval: z.string(),
        total_scanned: z.number(),
        matched: z.number(),
        top_papers: z.array(z.object({
            id: z.string().nullable(),
            title: z.string().nullable(),
            date: z.string().nullable(),
            server: z.string().nullable(),
            link: z.string().nullable(),
            abstract: z.string().nullable(),
        })),
    }),
    execute: async (context: any) => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - context.days);

        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        const interval = `${formatDate(startDate)}/${formatDate(endDate)}`;

        const res = await fetch(`https://api.biorxiv.org/details/${context.server}/${interval}`);
        if (!res.ok) throw new Error(`Preprint API error: ${res.statusText}`);

        const data = await res.json() as any;
        const collection = data.collection || [];

        const term = context.topic.toLowerCase();
        const matches = [];

        for (const paper of collection) {
            const title = (paper.title || "").toLowerCase();
            const abstract = (paper.abstract || "").toLowerCase();
            if (title.includes(term) || abstract.includes(term)) {
                matches.push({
                    id: paper.doi ?? null,
                    title: paper.title ?? null,
                    date: paper.date ?? null,
                    server: context.server,
                    link: paper.doi ? `https://doi.org/${paper.doi}` : null,
                    abstract: paper.abstract ?? null,
                });
            }
        }

        return {
            agent: "PubMed",
            source: context.server,
            topic: context.topic,
            interval,
            total_scanned: collection.length,
            matched: matches.length,
            top_papers: matches.slice(0, 10),
        };
    },
});
