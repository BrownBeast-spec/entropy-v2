import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { otQuery, resolveTargetId } from "../utils/opentargets-client.js";

export function registerOpenTargetsTools(server: McpServer): void {
  // ─── 1. Validate Target ─────────────────────────────────────────────
  server.tool(
    "validate_target",
    "Validates a target by resolving its gene symbol to an Ensembl ID and fetching associated diseases from Open Targets.",
    {
      geneSymbol: z.string().describe("Gene Symbol (e.g. 'EGFR')"),
    },
    async ({ geneSymbol }) => {
      try {
        const ensemblId = await resolveTargetId(geneSymbol);
        if (!ensemblId) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Gene '${geneSymbol}' not found in OpenTargets.`,
                }),
              },
            ],
          };
        }

        const query = `
          query TargetInfo($id: String!) {
            target(ensemblId: $id) {
              id
              approvedSymbol
              associatedDiseases(page: {index: 0, size: 5}) {
                rows {
                  disease { name }
                  score
                }
              }
            }
          }`;

        const data = await otQuery(query, { id: ensemblId });
        const target = data.target as
          | {
              id: string;
              approvedSymbol: string;
              associatedDiseases?: {
                rows: Array<{ disease: { name: string }; score: number }>;
              };
            }
          | undefined;

        if (!target) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Target data not found for ID: ${ensemblId}`,
                }),
              },
            ],
          };
        }

        const rows = target.associatedDiseases?.rows ?? [];
        const associations = rows.map(
          (r) => `${r.disease.name} (Score: ${Number(r.score).toFixed(2)})`,
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                agent: "OpenTargets",
                gene_symbol: geneSymbol,
                target_id: ensemblId,
                top_associations: associations,
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
                error: `Failed to validate target: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 2. Get Drug Info ───────────────────────────────────────────────
  server.tool(
    "get_drug_info",
    "Get drug information by ChEMBL ID including name, description, clinical phase, and linked diseases.",
    {
      drugId: z.string().describe("ChEMBL Drug ID (e.g. 'CHEMBL1743081')"),
    },
    async ({ drugId }) => {
      try {
        const query = `
          query DrugInfo($id: String!) {
            drug(chemblId: $id) {
              id name description maximumClinicalTrialPhase
              linkedDiseases { count rows { id name } }
            }
          }`;

        const data = await otQuery(query, { id: drugId });
        const drug = data.drug as
          | {
              id: string;
              name?: string;
              description?: string;
              maximumClinicalTrialPhase?: number;
              linkedDiseases?: { rows: Array<{ name: string }> };
            }
          | undefined;

        if (!drug) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: `Drug not found: ${drugId}` }),
              },
            ],
          };
        }

        const diseases = (drug.linkedDiseases?.rows ?? []).map((r) => r.name);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                agent: "OpenTargets",
                drug_id: drugId,
                name: drug.name ?? null,
                description: drug.description ?? null,
                max_clinical_phase: drug.maximumClinicalTrialPhase ?? null,
                linked_diseases: diseases,
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
                error: `Failed to get drug info: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ─── 3. Get Disease Info ────────────────────────────────────────────
  server.tool(
    "get_disease_info",
    "Get disease information by EFO ID including name, description, and therapeutic areas.",
    {
      diseaseId: z.string().describe("Disease EFO ID (e.g. 'EFO_0000685')"),
    },
    async ({ diseaseId }) => {
      try {
        const query = `
          query DiseaseInfo($id: String!) {
            disease(efoId: $id) {
              id name description
              therapeuticAreas { name }
            }
          }`;

        const data = await otQuery(query, { id: diseaseId });
        const disease = data.disease as
          | {
              id: string;
              name?: string;
              description?: string;
              therapeuticAreas?: Array<{ name: string }>;
            }
          | undefined;

        if (!disease) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Disease not found: ${diseaseId}`,
                }),
              },
            ],
          };
        }

        const areas = (disease.therapeuticAreas ?? []).map((t) => t.name);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                agent: "OpenTargets",
                disease_id: diseaseId,
                name: disease.name ?? null,
                description: disease.description ?? null,
                therapeutic_areas: areas,
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
                error: `Failed to get disease info: ${err instanceof Error ? err.message : String(err)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
