const RXNAV_BASE = "https://rxnav.nlm.nih.gov/REST";
export async function rxnavFetch(endpoint, params = {}) {
    const url = new URL(`${RXNAV_BASE}${endpoint}`);
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
        throw new Error(`RxNav network error: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!res.ok) {
        if (res.status === 404)
            return null;
        throw new Error(`RxNav API error ${res.status}: ${res.statusText}`);
    }
    return res.json();
}
//# sourceMappingURL=rxnav-client.js.map