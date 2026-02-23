const NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export async function ncbiFetch(
  endpoint: string,
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const url = new URL(`${NCBI_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const email = process.env["NCBI_EMAIL"];
  const apiKey = process.env["NCBI_API_KEY"];
  if (email) url.searchParams.set("email", email);
  if (apiKey) url.searchParams.set("api_key", apiKey);

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch (err) {
    throw new Error(
      `NCBI network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    throw new Error(`NCBI API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<Record<string, unknown>>;
}
