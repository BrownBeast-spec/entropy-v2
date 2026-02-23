export const SEARCH_URL =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
export const FETCH_URL =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";

export async function ncbiFetch(
  url: string,
  params: Record<string, string | number>,
): Promise<Response> {
  const finalUrl = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    finalUrl.searchParams.set(k, String(v));
  }

  const email = process.env["NCBI_EMAIL"];
  const apiKey = process.env["NCBI_API_KEY"];
  if (email) finalUrl.searchParams.set("email", email);
  if (apiKey) finalUrl.searchParams.set("api_key", apiKey);

  let res: Response;
  try {
    res = await fetch(finalUrl.toString());
  } catch (err) {
    throw new Error(
      `NCBI network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    throw new Error(`NCBI API error: ${res.status} ${res.statusText}`);
  }

  return res;
}
