/**
 * USPTO PatentsView API Client
 *
 * Provides access to USPTO PatentsView API for patent search and analysis.
 * Base URL: https://search.patentsview.org/api/v1
 *
 * API Documentation: https://patentsview.org/apis/api-endpoints
 */

export const PATENTSVIEW_BASE_URL = "https://search.patentsview.org/api/v1";

export interface PatentsViewQuery {
  q?: {
    _gte?: { patent_date?: string };
    _lte?: { patent_date?: string };
    _text_any?: { patent_abstract?: string; patent_title?: string };
    _text_phrase?: { patent_abstract?: string; patent_title?: string };
    _and?: unknown[];
    _or?: unknown[];
    assignee_organization?: string;
    patent_number?: string;
  };
  f?: string[];
  o?: { per_page?: number; page?: number };
  s?: Array<{ patent_date?: string; [key: string]: string | undefined }>;
}

export interface PatentsViewResponse<T = unknown> {
  patents?: T[];
  count?: number;
  total_patent_count?: number;
}

export interface PatentBasic {
  patent_number: string;
  patent_title: string;
  patent_abstract: string;
  patent_date: string;
  assignees?: Array<{ assignee_organization?: string }>;
  inventors?: Array<{
    inventor_first_name?: string;
    inventor_last_name?: string;
  }>;
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
      "User-Agent": "Entropy-v2/1.0 (Pharmaceutical Research Tool)",
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
 * Search patents by keyword in abstract or title
 */
export async function searchPatentsByKeyword(
  keyword: string,
  options: {
    yearFrom?: number;
    yearTo?: number;
    limit?: number;
  } = {},
): Promise<PatentsViewResponse<PatentBasic>> {
  const { yearFrom, yearTo, limit = 20 } = options;

  const query: PatentsViewQuery = {
    q: {
      _text_any: {
        patent_abstract: keyword,
        patent_title: keyword,
      },
    },
    f: [
      "patent_number",
      "patent_title",
      "patent_abstract",
      "patent_date",
      "assignee_organization",
      "inventor_first_name",
      "inventor_last_name",
    ],
    o: {
      per_page: Math.min(limit, 100),
      page: 1,
    },
    s: [{ patent_date: "desc" }],
  };

  if (yearFrom) {
    query.q!._gte = { patent_date: `${yearFrom}-01-01` };
  }
  if (yearTo) {
    query.q!._lte = { patent_date: `${yearTo}-12-31` };
  }

  const response = await patentsViewFetch("patent", query);
  return response.json() as Promise<PatentsViewResponse<PatentBasic>>;
}

/**
 * Get patent details by patent number
 */
export async function getPatentDetails(
  patentNumber: string,
): Promise<PatentBasic | null> {
  const query: PatentsViewQuery = {
    q: {
      patent_number: patentNumber,
    },
    f: [
      "patent_number",
      "patent_title",
      "patent_abstract",
      "patent_date",
      "assignee_organization",
      "inventor_first_name",
      "inventor_last_name",
    ],
  };

  const response = await patentsViewFetch("patent", query);
  const data = (await response.json()) as PatentsViewResponse<PatentBasic>;

  const patent = data.patents?.[0];
  if (!patent) return null;

  // Normalize undefined arrays to empty arrays for consistent API
  return {
    ...patent,
    assignees: patent.assignees ?? [],
    inventors: patent.inventors ?? [],
  };
}

/**
 * Get patents by assignee (company/organization)
 */
export async function getPatentsByAssignee(
  assignee: string,
  options: {
    yearFrom?: number;
    yearTo?: number;
    drugKeyword?: string;
    limit?: number;
  } = {},
): Promise<PatentsViewResponse<PatentBasic>> {
  const { yearFrom, yearTo, drugKeyword, limit = 100 } = options;

  const andConditions: unknown[] = [{ assignee_organization: assignee }];

  if (yearFrom) {
    andConditions.push({ _gte: { patent_date: `${yearFrom}-01-01` } });
  }
  if (yearTo) {
    andConditions.push({ _lte: { patent_date: `${yearTo}-12-31` } });
  }
  if (drugKeyword) {
    andConditions.push({
      _text_any: { patent_abstract: drugKeyword },
    });
  }

  const query: PatentsViewQuery = {
    q: {
      _and: andConditions,
    },
    f: [
      "patent_number",
      "patent_title",
      "patent_date",
      "assignee_organization",
    ],
    o: {
      per_page: Math.min(limit, 100),
      page: 1,
    },
    s: [{ patent_date: "desc" }],
  };

  const response = await patentsViewFetch("patent", query);
  return response.json() as Promise<PatentsViewResponse<PatentBasic>>;
}
