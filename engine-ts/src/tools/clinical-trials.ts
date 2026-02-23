import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const BASE_URL = "https://clinicaltrials.gov/api/v2/studies";

export const searchStudies = createTool({
    id: "ct-search-studies",
    description: "Search for clinical trials by term on ClinicalTrials.gov.",
    inputSchema: z.object({
        term: z.string().describe("Search term (e.g. disease, drug name)"),
        limit: z.number().optional().default(10).describe("Max results to return"),
    }),
    outputSchema: z.object({
        agent: z.string(),
        query: z.string(),
        total_found: z.number(),
        studies: z.array(z.object({
            nct_id: z.string().nullable(),
            title: z.string().nullable(),
            status: z.string().nullable(),
            phase: z.array(z.string()),
            conditions: z.array(z.string()),
            interventions: z.array(z.string()),
            locations: z.number().nullable(),
        })),
    }),
    execute: async (context: any) => {
        const url = new URL(BASE_URL);
        url.searchParams.set("query.term", context.term);
        url.searchParams.set("pageSize", String(context.limit));

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`ClinicalTrials API error: ${res.statusText}`);

        const data = await res.json() as any;
        const studies = data.studies || [];

        const results = studies.map((study: any) => {
            const protocol = study.protocolSection ?? {};
            const idModule = protocol.identificationModule ?? {};
            const statusModule = protocol.statusModule ?? {};
            const designModule = protocol.designModule ?? {};
            const conditionsModule = protocol.conditionsModule ?? {};
            const interventionsModule = protocol.armsInterventionsModule ?? {};
            const contactsModule = protocol.contactsLocationsModule ?? {};

            return {
                nct_id: idModule.nctId ?? null,
                title: idModule.briefTitle ?? null,
                status: statusModule.overallStatus ?? null,
                phase: designModule.phases ?? [],
                conditions: conditionsModule.conditions ?? [],
                interventions: (interventionsModule.interventions || []).map((i: any) => i.name),
                locations: contactsModule.locations ? contactsModule.locations.length : 0,
            };
        });

        return {
            agent: "ClinicalTrials",
            query: context.term,
            total_found: data.totalCount ?? results.length,
            studies: results,
        };
    },
});
