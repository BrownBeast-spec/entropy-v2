import { z } from "zod";
import { uniprotFetch } from "../utils/uniprot-client.js";
function getProteinName(entry) {
    return (entry.proteinDescription?.recommendedName?.fullName?.value ??
        entry.proteinDescription?.submissionNames?.[0]?.fullName?.value ??
        null);
}
function getGeneName(entry) {
    return entry.genes?.[0]?.geneName?.value ?? null;
}
function getFunctionDescription(entry) {
    const funcComment = entry.comments?.find((c) => c.commentType === "FUNCTION");
    return funcComment?.texts?.[0]?.value ?? null;
}
export function registerUniprotTools(server) {
    // ─── 1. Get Protein Data ────────────────────────────────────────────
    server.tool("get_protein_data", "Fetch protein entry by UniProt accession (e.g., P00533 for EGFR). Returns accession, protein name, gene name, organism, sequence length, and function description.", {
        accession: z.string().describe("UniProt accession (e.g. 'P00533')"),
    }, async ({ accession }) => {
        try {
            const data = (await uniprotFetch(`/${accession}.json`));
            if (!data) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: `Protein ${accession} not found in UniProt.`,
                            }),
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            agent: "UniProt",
                            accession: data.primaryAccession ?? accession,
                            protein_name: getProteinName(data),
                            gene_name: getGeneName(data),
                            organism: data.organism?.scientificName ?? null,
                            sequence_length: data.sequence?.length ?? null,
                            function_description: getFunctionDescription(data),
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
                            error: `Failed to get protein data: ${err instanceof Error ? err.message : String(err)}`,
                        }),
                    },
                ],
                isError: true,
            };
        }
    });
    // ─── 2. Get Protein Function ────────────────────────────────────────
    server.tool("get_protein_function", "Fetch functional annotations for a protein from UniProt. Parses FUNCTION, CATALYTIC_ACTIVITY, and SUBCELLULAR_LOCATION comments.", {
        accession: z.string().describe("UniProt accession (e.g. 'P00533')"),
    }, async ({ accession }) => {
        try {
            const data = (await uniprotFetch(`/${accession}.json`));
            if (!data) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: `Protein ${accession} not found in UniProt.`,
                            }),
                        },
                    ],
                };
            }
            const comments = data.comments ?? [];
            const functions = comments
                .filter((c) => c.commentType === "FUNCTION")
                .flatMap((c) => c.texts?.map((t) => t.value) ?? [])
                .filter(Boolean);
            const catalyticActivities = comments
                .filter((c) => c.commentType === "CATALYTIC ACTIVITY")
                .map((c) => c.reaction?.name ?? c.reaction?.ecNumber ?? null)
                .filter(Boolean);
            const subcellularLocations = comments
                .filter((c) => c.commentType === "SUBCELLULAR LOCATION")
                .flatMap((c) => c.subcellularLocations?.map((sl) => sl.location?.value) ?? [])
                .filter(Boolean);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            agent: "UniProt",
                            accession,
                            functions,
                            catalytic_activities: catalyticActivities,
                            subcellular_locations: subcellularLocations,
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
                            error: `Failed to get protein function: ${err instanceof Error ? err.message : String(err)}`,
                        }),
                    },
                ],
                isError: true,
            };
        }
    });
    // ─── 3. Search UniProt ──────────────────────────────────────────────
    server.tool("search_uniprot", "Search UniProt by query string. Returns top 5 results with accession, protein name, and organism.", {
        query: z.string().describe("Search query string"),
    }, async ({ query }) => {
        try {
            const data = (await uniprotFetch("/search", {
                query,
                format: "json",
                size: "5",
            }));
            if (!data || !data.results) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                error: `No results found for query: ${query}`,
                            }),
                        },
                    ],
                };
            }
            const results = data.results.map((entry) => ({
                accession: entry.primaryAccession ?? null,
                protein_name: getProteinName(entry),
                organism: entry.organism?.scientificName ?? null,
            }));
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            agent: "UniProt",
                            query,
                            total_results: results.length,
                            results,
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
                            error: `Failed to search UniProt: ${err instanceof Error ? err.message : String(err)}`,
                        }),
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=uniprot.js.map