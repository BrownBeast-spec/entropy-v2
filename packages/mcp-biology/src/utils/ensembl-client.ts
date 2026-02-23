const BASE_URL = "https://rest.ensembl.org";

export async function ensemblFetch(
  path: string,
  params: Record<string, string | undefined> = {},
): Promise<unknown | null> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    throw new Error(
      `Ensembl network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    if (res.status === 404) return null;

    // Respect Retry-After header
    const retryAfter = res.headers.get("Retry-After");
    if (res.status === 429 && retryAfter) {
      throw new Error(
        `Ensembl rate limited. Retry after ${retryAfter} seconds.`,
      );
    }

    throw new Error(`Ensembl API error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}
