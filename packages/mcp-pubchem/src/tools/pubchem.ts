import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { pubchemFetch } from "../utils/pubchem-client.js";

export function registerPubChemTools(server: McpServer): void {
  // ─── 1. Search Compounds ──────────────────────────────────────────
  server.tool(
    "search_compounds",
    "Search for chemical compounds in PubChem by name or synonym.",
    {
      compoundName: z
        .string()
        .describe("Compound name or synonym (e.g. 'aspirin', 'acetaminophen')"),
      limit: z.number().optional().default(10).describe("Max results (1-20)"),
    },
    async ({ compoundName, limit }) => {
      try {
        // Search by name - returns CIDs
        const searchResponse = await pubchemFetch(
          `/compound/name/${encodeURIComponent(compoundName)}/cids`,
        );
        const searchData = (await searchResponse.json()) as {
          IdentifierList?: { CID?: number[] };
        };

        const cids = searchData.IdentifierList?.CID?.slice(0, limit) ?? [];

        if (cids.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  query: compoundName,
                  compounds_found: 0,
                  compounds: [],
                }),
              },
            ],
          };
        }

        // Get compound details for the found CIDs
        const cidList = cids.join(",");
        const detailsResponse = await pubchemFetch(
          `/compound/cid/${cidList}/property/MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES,InChI`,
        );
        const detailsData = (await detailsResponse.json()) as {
          PropertyTable?: {
            Properties?: Array<{
              CID: number;
              MolecularFormula?: string;
              MolecularWeight?: number;
              IUPACName?: string;
              CanonicalSMILES?: string;
              InChI?: string;
            }>;
          };
        };

        const compounds =
          detailsData.PropertyTable?.Properties?.map((compound) => ({
            cid: compound.CID,
            molecular_formula: compound.MolecularFormula ?? "Unknown",
            molecular_weight: compound.MolecularWeight ?? null,
            iupac_name: compound.IUPACName ?? "No IUPAC name",
            smiles: compound.CanonicalSMILES ?? null,
            inchi: compound.InChI ?? null,
            pubchem_url: `https://pubchem.ncbi.nlm.nih.gov/compound/${compound.CID}`,
          })) ?? [];

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                query: compoundName,
                compounds_found: compounds.length,
                compounds,
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
                    : "Error searching compounds",
              }),
            },
          ],
        };
      }
    },
  );

  // ─── 2. Get Compound Details ──────────────────────────────────────
  server.tool(
    "get_compound_details",
    "Get detailed information about a compound by CID or name.",
    {
      identifier: z
        .string()
        .describe("PubChem CID (e.g. '2244') or compound name"),
      identifierType: z
        .enum(["cid", "name"])
        .optional()
        .default("name")
        .describe("Type of identifier"),
    },
    async ({ identifier, identifierType }) => {
      try {
        let cid: number;

        if (identifierType === "cid") {
          cid = parseInt(identifier);
        } else {
          // Resolve name to CID first
          const searchResponse = await pubchemFetch(
            `/compound/name/${encodeURIComponent(identifier)}/cids`,
          );
          const searchData = (await searchResponse.json()) as {
            IdentifierList?: { CID?: number[] };
          };
          const cids = searchData.IdentifierList?.CID ?? [];
          if (cids.length === 0) {
            throw new Error("Compound not found");
          }
          cid = cids[0];
        }

        // Get comprehensive details
        const response = await pubchemFetch(
          `/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES,InChI,InChIKey,XLogP,TPSA,Complexity,Charge,HBondDonorCount,HBondAcceptorCount`,
        );
        const data = (await response.json()) as {
          PropertyTable?: {
            Properties?: Array<{
              CID: number;
              MolecularFormula?: string;
              MolecularWeight?: number;
              IUPACName?: string;
              CanonicalSMILES?: string;
              InChI?: string;
              InChIKey?: string;
              XLogP?: number;
              TPSA?: number;
              Complexity?: number;
              Charge?: number;
              HBondDonorCount?: number;
              HBondAcceptorCount?: number;
            }>;
          };
        };

        const compound = data.PropertyTable?.Properties?.[0];

        if (!compound) {
          throw new Error("Compound details not found");
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                cid: compound.CID,
                molecular_formula: compound.MolecularFormula ?? "Unknown",
                molecular_weight: compound.MolecularWeight ?? null,
                iupac_name: compound.IUPACName ?? "No IUPAC name",
                smiles: compound.CanonicalSMILES ?? null,
                inchi: compound.InChI ?? null,
                inchi_key: compound.InChIKey ?? null,
                properties: {
                  xlogp: compound.XLogP ?? null,
                  tpsa: compound.TPSA ?? null,
                  complexity: compound.Complexity ?? null,
                  charge: compound.Charge ?? null,
                  h_bond_donors: compound.HBondDonorCount ?? null,
                  h_bond_acceptors: compound.HBondAcceptorCount ?? null,
                },
                pubchem_url: `https://pubchem.ncbi.nlm.nih.gov/compound/${compound.CID}`,
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
                    : "Error fetching compound details",
              }),
            },
          ],
        };
      }
    },
  );

  // ─── 3. Get Similar Compounds ─────────────────────────────────────
  server.tool(
    "get_similar_compounds",
    "Find structurally similar compounds to a given compound.",
    {
      cid: z.number().describe("PubChem CID of the query compound"),
      threshold: z
        .number()
        .optional()
        .default(90)
        .describe("Similarity threshold (0-100, default: 90)"),
      limit: z.number().optional().default(10).describe("Max results"),
    },
    async ({ cid, threshold, limit }) => {
      try {
        const response = await pubchemFetch(
          `/compound/fastsimilarity_2d/cid/${cid}/cids`,
        );
        const data = (await response.json()) as {
          IdentifierList?: { CID?: number[] };
        };

        const similarCids = data.IdentifierList?.CID?.slice(0, limit) ?? [];

        if (similarCids.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  query_cid: cid,
                  threshold,
                  similar_compounds_found: 0,
                  similar_compounds: [],
                }),
              },
            ],
          };
        }

        // Get details for similar compounds
        const cidList = similarCids.join(",");
        const detailsResponse = await pubchemFetch(
          `/compound/cid/${cidList}/property/MolecularFormula,MolecularWeight,IUPACName`,
        );
        const detailsData = (await detailsResponse.json()) as {
          PropertyTable?: {
            Properties?: Array<{
              CID: number;
              MolecularFormula?: string;
              MolecularWeight?: number;
              IUPACName?: string;
            }>;
          };
        };

        const compounds =
          detailsData.PropertyTable?.Properties?.map((compound) => ({
            cid: compound.CID,
            molecular_formula: compound.MolecularFormula ?? "Unknown",
            molecular_weight: compound.MolecularWeight ?? null,
            iupac_name: compound.IUPACName ?? "No IUPAC name",
            pubchem_url: `https://pubchem.ncbi.nlm.nih.gov/compound/${compound.CID}`,
          })) ?? [];

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                query_cid: cid,
                threshold,
                similar_compounds_found: compounds.length,
                similar_compounds: compounds,
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
                    : "Error finding similar compounds",
              }),
            },
          ],
        };
      }
    },
  );
}
