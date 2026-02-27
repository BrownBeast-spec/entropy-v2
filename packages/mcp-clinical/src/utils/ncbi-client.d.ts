export declare const SEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
export declare const FETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";
export declare function ncbiFetch(url: string, params: Record<string, string | number>): Promise<Response>;
//# sourceMappingURL=ncbi-client.d.ts.map