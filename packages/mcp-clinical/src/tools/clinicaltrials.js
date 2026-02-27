import { z } from "zod";
import { ctFetch } from "../utils/clinicaltrials-client.js";
export function registerClinicalTrialsTools(server) {
    // ─── 1. Search Studies ──────────────────────────────────────────────
    server.tool("search_studies", "Search ClinicalTrials.gov for clinical trials by term.", {
        term: z.string().describe("Search term (e.g. disease, drug name)"),
        limit: z
            .number()
            .optional()
            .default(10)
            .describe("Max results to return"),
    }, async ({ term, limit }) => {
        try {
            const data = (await ctFetch("/studies", {
                "query.term": term,
                pageSize: String(limit),
            }));
            if (!data) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ error: "No results found." }),
                        },
                    ],
                };
            }
            const studies = data.studies ?? [];
            const results = studies.map((study) => {
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
                    interventions: (interventionsModule.interventions ?? []).map((i) => i.name),
                    locations: contactsModule.locations
                        ? contactsModule.locations.length
                        : 0,
                };
            });
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            query: term,
                            total_found: data.totalCount ?? results.length,
                            studies: results,
                        }),
                    },
                ],
            };
        }
        catch (err) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: `Failed to search studies: ${err instanceof Error ? err.message : String(err)}`,
                        }),
                    },
                ],
                isError: true,
            };
        }
    });
    // ─── 2. Get Study Details ───────────────────────────────────────────
    server.tool("get_study_details", "Get detailed info for a specific clinical trial by NCT ID.", {
        nctId: z.string().describe("NCT ID (e.g. NCT12345678)"),
    }, async ({ nctId }) => {
        try {
            const data = (await ctFetch(`/studies/${nctId}`));
            if (!data) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: `Study not found: ${nctId}`,
                            }),
                        },
                    ],
                };
            }
            const protocol = data.protocolSection ?? {};
            const idModule = protocol.identificationModule ?? {};
            const statusModule = protocol.statusModule ?? {};
            const designModule = protocol.designModule ?? {};
            const conditionsModule = protocol.conditionsModule ?? {};
            const interventionsModule = protocol.armsInterventionsModule ?? {};
            const eligibilityModule = protocol.eligibilityModule ?? {};
            const descriptionModule = protocol.descriptionModule ?? {};
            const sponsorModule = protocol.sponsorCollaboratorsModule ??
                {};
            const leadSponsor = sponsorModule.leadSponsor ?? {};
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            nct_id: idModule.nctId ?? nctId,
                            title: idModule.briefTitle ?? null,
                            status: statusModule.overallStatus ?? null,
                            phase: designModule.phases ?? [],
                            conditions: conditionsModule.conditions ?? [],
                            interventions: (interventionsModule.interventions ?? []).map((i) => i.name),
                            eligibility_criteria: eligibilityModule.eligibilityCriteria ?? null,
                            start_date: statusModule.startDateStruct
                                ?.date ?? null,
                            completion_date: statusModule.completionDateStruct
                                ?.date ?? null,
                            sponsor: leadSponsor.name ?? null,
                            brief_summary: descriptionModule.briefSummary ?? null,
                        }),
                    },
                ],
            };
        }
        catch (err) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: `Failed to get study details: ${err instanceof Error ? err.message : String(err)}`,
                        }),
                    },
                ],
                isError: true,
            };
        }
    });
    // ─── 3. Get Eligibility Criteria ────────────────────────────────────
    server.tool("get_eligibility_criteria", "Get eligibility criteria for a specific clinical trial by NCT ID.", {
        nctId: z.string().describe("NCT ID (e.g. NCT12345678)"),
    }, async ({ nctId }) => {
        try {
            const data = (await ctFetch(`/studies/${nctId}`));
            if (!data) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: `Study not found: ${nctId}`,
                            }),
                        },
                    ],
                };
            }
            const protocol = data.protocolSection ?? {};
            const eligibilityModule = protocol.eligibilityModule ?? {};
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            nct_id: nctId,
                            eligibility_criteria: eligibilityModule.eligibilityCriteria ?? null,
                            sex: eligibilityModule.sex ?? null,
                            minimum_age: eligibilityModule.minimumAge ?? null,
                            maximum_age: eligibilityModule.maximumAge ?? null,
                            healthy_volunteers: eligibilityModule.healthyVolunteers ?? null,
                        }),
                    },
                ],
            };
        }
        catch (err) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: `Failed to get eligibility criteria: ${err instanceof Error ? err.message : String(err)}`,
                        }),
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=clinicaltrials.js.map