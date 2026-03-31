/**
 * PubChem API Client
 * Base URL: https://pubchem.ncbi.nlm.nih.gov/rest/pug
 */

export const PUBCHEM_BASE_URL = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";

/**
 * Fetch data from PubChem PUG REST API
 */
export async function pubchemFetch(
  path: string,
  format: string = "JSON",
): Promise<Response> {
  const url = `${PUBCHEM_BASE_URL}${path}/${format}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Entropy-v2/1.0 (Research Tool)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `PubChem API error: ${response.status} ${response.statusText}`,
    );
  }

  return response;
}
