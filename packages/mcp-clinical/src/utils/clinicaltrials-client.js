const CT_BASE = "https://clinicaltrials.gov/api/v2";
export async function ctFetch(endpoint, params) {
    const url = new URL(`${CT_BASE}${endpoint}`);
    if (params) {
        for (const [k, v] of Object.entries(params)) {
            url.searchParams.set(k, v);
        }
    }
    let res;
    try {
        res = await fetch(url.toString());
    }
    catch (err) {
        throw new Error(`ClinicalTrials network error: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (!res.ok) {
        if (res.status === 404)
            return null;
        throw new Error(`ClinicalTrials API error: ${res.status} ${res.statusText}`);
    }
    return res.json();
}
//# sourceMappingURL=clinicaltrials-client.js.map