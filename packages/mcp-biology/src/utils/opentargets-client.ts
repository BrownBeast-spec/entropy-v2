const OPENTARGETS_BASE = "https://api.platform.opentargets.org/api/v4/graphql";

export interface GraphQLResponse {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string }>;
}

export async function otQuery(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(OPENTARGETS_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
  } catch (err) {
    throw new Error(
      `OpenTargets network error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    throw new Error(
      `OpenTargets GraphQL error: ${res.status} ${res.statusText}`,
    );
  }

  const data = (await res.json()) as GraphQLResponse;
  if (data.errors) {
    throw new Error(`GraphQL Errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data ?? {};
}

export async function resolveTargetId(symbol: string): Promise<string | null> {
  const query = `
    query Search($term: String!) {
      search(queryString: $term, entityNames: ["target"], page: {index: 0, size: 1}) {
        hits { id }
      }
    }
  `;
  const data = await otQuery(query, { term: symbol });
  const search = data.search as { hits?: Array<{ id: string }> } | undefined;
  const hits = search?.hits;
  return hits && hits.length > 0 ? hits[0].id : null;
}
