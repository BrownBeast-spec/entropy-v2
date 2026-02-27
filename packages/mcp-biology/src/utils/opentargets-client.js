const OPENTARGETS_BASE = "https://api.platform.opentargets.org/api/v4/graphql";
export async function otQuery(query, variables = {}) {
    let res;
    try {
        res = await fetch(OPENTARGETS_BASE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, variables }),
        });
    }
    catch (err) {
        throw new Error(`OpenTargets network error: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!res.ok) {
        throw new Error(`OpenTargets GraphQL error: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json());
    if (data.errors) {
        throw new Error(`GraphQL Errors: ${JSON.stringify(data.errors)}`);
    }
    return data.data ?? {};
}
export async function resolveTargetId(symbol) {
    const query = `
    query Search($term: String!) {
      search(queryString: $term, entityNames: ["target"], page: {index: 0, size: 1}) {
        hits { id }
      }
    }
  `;
    const data = await otQuery(query, { term: symbol });
    const search = data.search;
    const hits = search?.hits;
    return hits && hits.length > 0 ? hits[0].id : null;
}
//# sourceMappingURL=opentargets-client.js.map