/**
 * Europe PMC API Client
 * Base URL: https://www.ebi.ac.uk/europepmc/webservices/rest
 */

export const EUROPEPMC_BASE_URL =
  "https://www.ebi.ac.uk/europepmc/webservices/rest";

export interface EuropePMCParams {
  query?: string;
  format?: string;
  resultType?: string;
  pageSize?: number;
  cursorMark?: string;
  synonym?: boolean;
}

/**
 * Fetch data from Europe PMC API
 */
export async function europePMCFetch(
  endpoint: string,
  params: EuropePMCParams = {},
): Promise<Response> {
  const url = new URL(`${EUROPEPMC_BASE_URL}/${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Entropy-v2/1.0 (Research Tool)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Europe PMC API error: ${response.status} ${response.statusText}`,
    );
  }

  return response;
}
