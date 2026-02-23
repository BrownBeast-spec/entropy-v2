import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const BASE_URL = "https://api.fda.gov";
const API_KEY = process.env["OPENFDA_API_KEY"];

function buildUrl(path: string, params: Record<string, string | number | undefined>): string {
    const url = new URL(`${BASE_URL}${path}`);
    if (API_KEY) url.searchParams.set("api_key", API_KEY);
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
    }
    return url.toString();
}

async function fdaFetch(path: string, params: Record<string, string | number | undefined>) {
    const res = await fetch(buildUrl(path, params));
    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`OpenFDA API error ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<Record<string, unknown>>;
}

// ─── 1. Drug Safety (Labels + Boxed Warning) ──────────────────────────────

export const checkDrugSafety = createTool({
    id: "check-drug-safety",
    description: "Check drug safety including label, boxed warning, contraindications and indications from OpenFDA.",
    inputSchema: z.object({
        drug: z.string().describe("Brand name of the drug (e.g. 'Humira')"),
    }),
    outputSchema: z.object({
        drug: z.string(),
        risk_level: z.string(),
        boxed_warning: z.string(),
        contraindications: z.string(),
        indications: z.string(),
        dosage: z.string(),
    }),
    execute: async (context: any) => {
        const data = await fdaFetch("/drug/label.json", {
            search: `openfda.brand_name:${context.drug}`,
            limit: 1,
        });

        if (!data || !Array.isArray(data["results"]) || data["results"].length === 0) {
            return { drug: context.drug, risk_level: "Unknown", boxed_warning: "N/A", contraindications: "N/A", indications: "N/A", dosage: "N/A" };
        }

        const r = data["results"][0] as Record<string, unknown>;
        const getText = (v: unknown): string => Array.isArray(v) ? (v as string[]).join(" ").trim() : v ? String(v).trim() : "N/A";

        const boxedWarning = getText(r["boxed_warning"]);
        return {
            drug: context.drug,
            risk_level: boxedWarning !== "N/A" ? "HIGH_RISK" : "Standard",
            boxed_warning: boxedWarning,
            contraindications: getText(r["contraindications"]),
            indications: getText(r["indications_and_usage"]),
            dosage: getText(r["dosage_and_administration_table"] ?? r["dosage_and_administration"]),
        };
    },
});

// ─── 2. Adverse Events ────────────────────────────────────────────────────

export const checkAdverseEvents = createTool({
    id: "check-adverse-events",
    description: "Get the top reported adverse reaction terms for a drug from OpenFDA FAERS.",
    inputSchema: z.object({
        drug: z.string().describe("Drug name (generic or brand)"),
        limit: z.number().optional().default(10).describe("Max number of reactions to return"),
    }),
    outputSchema: z.object({
        drug: z.string(),
        top_reactions: z.array(z.object({ reaction: z.string(), count: z.number() })),
    }),
    execute: async (context: any) => {
        const data = await fdaFetch("/drug/event.json", {
            search: `patient.drug.medicinalproduct:${context.drug}`,
            count: "patient.reaction.reactionmeddrapt.exact",
            limit: context.limit,
        });

        const results = (data?.["results"] as Array<{ term: string; count: number }>) ?? [];
        return {
            drug: context.drug,
            top_reactions: results.map(r => ({ reaction: r.term, count: r.count })),
        };
    },
});

// ─── 3. Drug Recalls ──────────────────────────────────────────────────────

export const checkRecalls = createTool({
    id: "check-recalls",
    description: "Get recent FDA enforcement actions (recalls) for a drug.",
    inputSchema: z.object({
        drug: z.string().describe("Drug name to search enforcement records for"),
    }),
    outputSchema: z.object({
        drug: z.string(),
        found: z.number(),
        recalls: z.array(z.object({
            reason: z.string().nullable(),
            status: z.string().nullable(),
            date: z.string().nullable(),
            classification: z.string().nullable(),
        })),
    }),
    execute: async (context: any) => {
        const data = await fdaFetch("/drug/enforcement.json", {
            search: `product_description:${context.drug}`,
            limit: 5,
            sort: "report_date:desc",
        });

        if (!data) return { drug: context.drug, found: 0, recalls: [] };
        const results = (data["results"] as Array<Record<string, unknown>>) ?? [];
        return {
            drug: context.drug,
            found: results.length,
            recalls: results.map(r => ({
                reason: (r["reason_for_recall"] as string) ?? null,
                status: (r["status"] as string) ?? null,
                date: (r["report_date"] as string) ?? null,
                classification: (r["classification"] as string) ?? null,
            })),
        };
    },
});

// ─── 4. NDC Directory ─────────────────────────────────────────────────────

export const getNdcInfo = createTool({
    id: "get-ndc-info",
    description: "Get National Drug Code (NDC) directory info — labeler, dosage form, active ingredients.",
    inputSchema: z.object({
        ndc: z.string().describe("NDC code (e.g. '0173-0715')"),
    }),
    outputSchema: z.object({
        ndc: z.string(),
        brand_name: z.string().nullable(),
        generic_name: z.string().nullable(),
        labeler_name: z.string().nullable(),
        dosage_form: z.string().nullable(),
        route: z.array(z.string()),
        active_ingredients: z.array(z.unknown()),
    }),
    execute: async (context: any) => {
        const data = await fdaFetch("/drug/ndc.json", {
            search: `product_ndc:${context.ndc}`,
            limit: 1,
        });

        if (!data || !Array.isArray(data["results"]) || data["results"].length === 0) {
            return { ndc: context.ndc, brand_name: null, generic_name: null, labeler_name: null, dosage_form: null, route: [], active_ingredients: [] };
        }

        const r = data["results"][0] as Record<string, unknown>;
        return {
            ndc: context.ndc,
            brand_name: (r["brand_name"] as string) ?? null,
            generic_name: (r["generic_name"] as string) ?? null,
            labeler_name: (r["labeler_name"] as string) ?? null,
            dosage_form: (r["dosage_form"] as string) ?? null,
            route: (r["route"] as string[]) ?? [],
            active_ingredients: (r["active_ingredients"] as unknown[]) ?? [],
        };
    },
});

// ─── 5. Drugs@FDA Search ─────────────────────────────────────────────────

export const searchDrugsFda = createTool({
    id: "search-drugs-fda",
    description: "Search the Drugs@FDA database for approved drug products and their regulatory history.",
    inputSchema: z.object({
        query: z.string().describe("Brand or generic drug name to search"),
        limit: z.number().optional().default(10),
    }),
    outputSchema: z.object({
        query: z.string(),
        total_found: z.number(),
        drugs: z.array(z.object({
            application_number: z.string().nullable(),
            sponsor_name: z.string().nullable(),
            brand_name: z.string().nullable(),
            dosage_form: z.string().nullable(),
            marketing_status: z.string().nullable(),
        })),
    }),
    execute: async (context: any) => {
        const data = await fdaFetch("/drug/drugsfda.json", {
            search: `openfda.brand_name:${context.query}`,
            limit: context.limit,
        });

        if (!data || !Array.isArray(data["results"])) {
            return { query: context.query, total_found: 0, drugs: [] };
        }

        const drugs: Array<{ application_number: string | null; sponsor_name: string | null; brand_name: string | null; dosage_form: string | null; marketing_status: string | null }> = [];
        for (const result of data["results"] as Array<Record<string, unknown>>) {
            for (const product of (result["products"] as Array<Record<string, unknown>>) ?? []) {
                drugs.push({
                    application_number: (result["application_number"] as string) ?? null,
                    sponsor_name: (result["sponsor_name"] as string) ?? null,
                    brand_name: (product["brand_name"] as string) ?? null,
                    dosage_form: (product["dosage_form"] as string) ?? null,
                    marketing_status: (product["marketing_status"] as string) ?? null,
                });
            }
        }

        return { query: context.query, total_found: drugs.length, drugs };
    },
});

// ─── 6. Drug Shortages ────────────────────────────────────────────────────

export const getDrugShortages = createTool({
    id: "get-drug-shortages",
    description: "Get current FDA drug shortage information, critical for supply chain context.",
    inputSchema: z.object({
        drug: z.string().optional().describe("Drug name to filter by (leave empty for recent shortages)"),
    }),
    outputSchema: z.object({
        query: z.string().nullable(),
        total_shortages: z.number(),
        shortages: z.array(z.object({
            product_description: z.string().nullable(),
            status: z.string().nullable(),
            reason: z.array(z.unknown()),
        })),
    }),
    execute: async (context: any) => {
        const params: Record<string, string | number | undefined> = { limit: 20 };
        if (context.drug) params["search"] = `product_description:${context.drug}`;

        const data = await fdaFetch("/drug/drugshortages.json", params);
        if (!data) return { query: context.drug ?? null, total_shortages: 0, shortages: [] };

        const results = (data["results"] as Array<Record<string, unknown>>) ?? [];
        return {
            query: context.drug ?? null,
            total_shortages: results.length,
            shortages: results.map(r => ({
                product_description: (r["product_description"] as string) ?? null,
                status: (r["status"] as string) ?? null,
                reason: (r["reason"] as unknown[]) ?? [],
            })),
        };
    },
});
