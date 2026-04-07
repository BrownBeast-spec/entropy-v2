/**
 * PatentsView API Client
 * Base URL: https://search.patentsview.org/api/v1
 */

export const PATENTSVIEW_BASE_URL = "https://search.patentsview.org/api/v1";

export interface PatentsViewQuery {
  q?: {
    _gte?: { patent_date?: string };
    _lte?: { patent_date?: string };
    _text_any?: { patent_abstract?: string };
    _text_phrase?: { patent_abstract?: string };
    _and?: unknown[];
    _or?: unknown[];
    assignee_organization?: string;
    patent_number?: string;
  };
  f?: string[];
  o?: { per_page?: number; page?: number };
  s?: Array<{ patent_date?: string }>;
}

/**
 * Fetch data from PatentsView API
 */
export async function patentsViewFetch(
  endpoint: string,
  query: PatentsViewQuery,
): Promise<Response> {
  const url = `${PATENTSVIEW_BASE_URL}/${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Entropy-v2/1.0 (Research Tool)",
    },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new Error(
      `PatentsView API error: ${response.status} ${response.statusText}`,
    );
  }

  return response;
}

/**
 * FDA Orange Book data source
 * Download URL: https://www.fda.gov/media/76860/download
 */
export const FDA_ORANGE_BOOK_URL = "https://www.fda.gov/media/76860/download";
