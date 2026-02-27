const UNIPROT_BASE = "https://rest.uniprot.org/uniprotkb";
export async function uniprotFetch(path, params = {}) {
    const url = new URL(`${UNIPROT_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }
    let res;
    try {
        res = await fetch(url.toString(), {
            headers: { Accept: "application/json" },
        });
    }
    catch (err) {
        throw new Error(`UniProt network error: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!res.ok) {
        if (res.status === 404)
            return null;
        const retryAfter = res.headers.get("Retry-After");
        if (res.status === 429 && retryAfter) {
            throw new Error(`UniProt rate limited. Retry after ${retryAfter} seconds.`);
        }
        throw new Error(`UniProt API error ${res.status}: ${res.statusText}`);
    }
    return res.json();
}
//# sourceMappingURL=uniprot-client.js.map