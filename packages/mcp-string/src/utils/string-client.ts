/**
 * STRING DB API Client
 * Base URL: https://string-db.org/api
 * Rate limit: ~1000 requests/day - cache aggressively!
 */

export const STRING_BASE_URL = "https://string-db.org/api";

/**
 * Fetch data from STRING DB API
 */
export async function stringFetch(
  format: string,
  method: string,
  params: Record<string, string | number>,
): Promise<Response> {
  const url = new URL(`${STRING_BASE_URL}/${format}/${method}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "Entropy-v2/1.0 (Research Tool)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `STRING DB API error: ${response.status} ${response.statusText}`,
    );
  }

  return response;
}
