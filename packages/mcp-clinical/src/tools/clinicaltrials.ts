import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ctFetch } from "../utils/clinicaltrials-client.js";

export function registerClinicalTrialsTools(server: McpServer): void {
  // ─── 1. Search Studies ──────────────────────────────────────────────
  server.tool(
    "search_studies",
    "Search ClinicalTrials.gov for clinical trials by term.",
    {
      term: z.string().describe("Search term (e.g. disease, drug name)"),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe("Max results to return"),
    },
    async ({ term, limit }) => {
      try {
        const data = (await ctFetch("/studies", {
          "query.term": term,
          pageSize: String(limit),
        })) as Record<string, unknown> | null;

        if (!data) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "No results found." }),
              },
            ],
          };
        }

        const studies = (data.studies as Array<Record<string, unknown>>) ?? [];

        const results = studies.map((study) => {
          const protocol =
            (study.protocolSection as Record<string, unknown>) ?? {};
          const idModule =
            (protocol.identificationModule as Record<string, unknown>) ?? {};
          const statusModule =
            (protocol.statusModule as Record<string, unknown>) ?? {};
          const designModule =
            (protocol.designModule as Record<string, unknown>) ?? {};
          const conditionsModule =
            (protocol.conditionsModule as Record<string, unknown>) ?? {};
          const interventionsModule =
            (protocol.armsInterventionsModule as Record<string, unknown>) ?? {};
          const contactsModule =
            (protocol.contactsLocationsModule as Record<string, unknown>) ?? {};

          return {
            nct_id: (idModule.nctId as string) ?? null,
            title: (idModule.briefTitle as string) ?? null,
            status: (statusModule.overallStatus as string) ?? null,
            phase: (designModule.phases as string[]) ?? [],
            conditions: (conditionsModule.conditions as string[]) ?? [],
            interventions: (
              (interventionsModule.interventions as Array<
                Record<string, unknown>
              >) ?? []
            ).map((i) => i.name as string),
            locations: (contactsModule.locations as Array<unknown> | undefined)
              ? (contactsModule.locations as Array<unknown>).length
              : 0,
          };
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                query: term,
                total_found: (data.totalCount as number) ?? results.length,
                studies: results,
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
                error: `Failed to search studies: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 2. Get Study Details ───────────────────────────────────────────
  server.tool(
    "get_study_details",
    "Get detailed info for a specific clinical trial by NCT ID.",
    {
      nctId: z.string().describe("NCT ID (e.g. NCT12345678)"),
    },
    async ({ nctId }) => {
      try {
        const data = (await ctFetch(`/studies/${nctId}`)) as Record<
          string,
          unknown
        > | null;

        if (!data) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Study not found: ${nctId}`,
                }),
              },
            ],
          };
        }

        const protocol =
          (data.protocolSection as Record<string, unknown>) ?? {};
        const idModule =
          (protocol.identificationModule as Record<string, unknown>) ?? {};
        const statusModule =
          (protocol.statusModule as Record<string, unknown>) ?? {};
        const designModule =
          (protocol.designModule as Record<string, unknown>) ?? {};
        const conditionsModule =
          (protocol.conditionsModule as Record<string, unknown>) ?? {};
        const interventionsModule =
          (protocol.armsInterventionsModule as Record<string, unknown>) ?? {};
        const eligibilityModule =
          (protocol.eligibilityModule as Record<string, unknown>) ?? {};
        const descriptionModule =
          (protocol.descriptionModule as Record<string, unknown>) ?? {};
        const sponsorModule =
          (protocol.sponsorCollaboratorsModule as Record<string, unknown>) ??
          {};

        const leadSponsor =
          (sponsorModule.leadSponsor as Record<string, unknown>) ?? {};

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                nct_id: (idModule.nctId as string) ?? nctId,
                title: (idModule.briefTitle as string) ?? null,
                status: (statusModule.overallStatus as string) ?? null,
                phase: (designModule.phases as string[]) ?? [],
                conditions: (conditionsModule.conditions as string[]) ?? [],
                interventions: (
                  (interventionsModule.interventions as Array<
                    Record<string, unknown>
                  >) ?? []
                ).map((i) => i.name as string),
                eligibility_criteria:
                  (eligibilityModule.eligibilityCriteria as string) ?? null,
                start_date:
                  (statusModule.startDateStruct as Record<string, unknown>)
                    ?.date ?? null,
                completion_date:
                  (statusModule.completionDateStruct as Record<string, unknown>)
                    ?.date ?? null,
                sponsor: (leadSponsor.name as string) ?? null,
                brief_summary:
                  (descriptionModule.briefSummary as string) ?? null,
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
                error: `Failed to get study details: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 3. Get Eligibility Criteria ────────────────────────────────────
  server.tool(
    "get_eligibility_criteria",
    "Get eligibility criteria for a specific clinical trial by NCT ID.",
    {
      nctId: z.string().describe("NCT ID (e.g. NCT12345678)"),
    },
    async ({ nctId }) => {
      try {
        const data = (await ctFetch(`/studies/${nctId}`)) as Record<
          string,
          unknown
        > | null;

        if (!data) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Study not found: ${nctId}`,
                }),
              },
            ],
          };
        }

        const protocol =
          (data.protocolSection as Record<string, unknown>) ?? {};
        const eligibilityModule =
          (protocol.eligibilityModule as Record<string, unknown>) ?? {};

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                nct_id: nctId,
                eligibility_criteria:
                  (eligibilityModule.eligibilityCriteria as string) ?? null,
                sex: (eligibilityModule.sex as string) ?? null,
                minimum_age: (eligibilityModule.minimumAge as string) ?? null,
                maximum_age: (eligibilityModule.maximumAge as string) ?? null,
                healthy_volunteers:
                  (eligibilityModule.healthyVolunteers as string) ?? null,
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
                error: `Failed to get eligibility criteria: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
