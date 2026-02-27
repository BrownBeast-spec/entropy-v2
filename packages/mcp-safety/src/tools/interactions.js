import { z } from "zod";
import { rxnavFetch } from "../utils/rxnav-client.js";
import { fdaFetch } from "../utils/openfda-client.js";
export function registerInteractionTools(server) {
    server.tool("get_drug_interactions", "Get known drug interaction information for a drug. Accepts either an RxCUI (resolved to drug name via RxNav) or a drug name directly. Returns drug interaction text from FDA drug labels.", {
        drug: z
            .string()
            .describe("Drug name (e.g. 'aspirin') or RxNorm Concept Unique Identifier (RxCUI)"),
    }, async ({ drug }) => {
        try {
            let drugName = drug;
            // If it looks like an RxCUI (all digits), resolve to drug name via RxNav
            if (/^\d+$/.test(drug)) {
                const data = await rxnavFetch("/rxcui/" + drug + "/allProperties.json", {
                    prop: "names",
                });
                const props = data?.propConceptGroup;
                const nameProp = props?.propConcept?.find((p) => p.propName === "RxNorm Name");
                if (nameProp?.propValue) {
                    drugName = nameProp.propValue;
                }
                else {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    error: `Could not resolve RxCUI ${drug} to a drug name.`,
                                }),
                            },
                        ],
                        isError: true,
                    };
                }
            }
            // Query OpenFDA drug label for interactions
            const searchTerm = `openfda.generic_name:"${drugName}" AND drug_interactions:*`;
            const data = await fdaFetch("/drug/label.json", {
                search: searchTerm,
                limit: "3",
            });
            if (!data) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                drug: drugName,
                                interaction_count: 0,
                                interactions: [],
                                source: "OpenFDA Drug Labels",
                            }),
                        },
                    ],
                };
            }
            const results = data.results ?? [];
            const interactions = [];
            for (const result of results) {
                const interactionTexts = result.drug_interactions ?? [];
                const openfda = result.openfda;
                const brandName = openfda?.brand_name?.[0] ?? null;
                for (const text of interactionTexts) {
                    interactions.push({
                        brand_name: brandName,
                        interaction_text: text.length > 500 ? text.slice(0, 500) + "…" : text,
                    });
                }
            }
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            drug: drugName,
                            interaction_count: interactions.length,
                            interactions: interactions.slice(0, 10),
                            source: "OpenFDA Drug Labels",
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
                            error: `Failed to get drug interactions: ${err instanceof Error ? err.message : String(err)}`,
                        }),
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=interactions.js.map