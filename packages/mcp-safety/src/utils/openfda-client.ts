const OPENFDA_BASE = "https://api.fda.gov";

export function buildUrl(
  path: string,
  params: Record<string, string | number | undefined>,
): string {
  const url = new URL(`${OPENFDA_BASE}${path}`);
  const apiKey = process.env["OPENFDA_API_KEY"];
  if (apiKey) url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

export async function fdaFetch(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<Record<string, unknown> | null> {
  let res: Response;
  try {
    res = await fetch(buildUrl(path, params));
  } catch (err) {
    throw new Error(
      `OpenFDA network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    if (res.status === 404) return null;

    const retryAfter = res.headers.get("Retry-After");
    if (res.status === 429 && retryAfter) {
      throw new Error(
        `OpenFDA rate limited. Retry after ${retryAfter} seconds.`,
      );
    }

    throw new Error(`OpenFDA API error ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<Record<string, unknown>>;
}
