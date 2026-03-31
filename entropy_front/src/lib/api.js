const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function asString(value) {
  return typeof value === "string" ? value : "";
}

function normalizeCitation(citation) {
  if (!citation || typeof citation !== "object") {
    return null;
  }

  return {
    source: asString(citation.source),
    label: asString(citation.label),
    url: asString(citation.url),
    identifier: asString(citation.identifier),
  };
}

function normalizeResult(result, idx) {
  const metadata =
    result?.metadata && typeof result.metadata === "object"
      ? result.metadata
      : {};
  const citations = toArray(result?.citations)
    .map(normalizeCitation)
    .filter(Boolean);

  return {
    type: asString(result?.type),
    id: asString(result?.id) || `result-${idx}`,
    title: asString(result?.title) || "Untitled result",
    description: asString(result?.description) || "No summary available",
    source: asString(result?.source) || "Unknown source",
    url: asString(result?.url),
    citations,
    metadata,
  };
}

function normalizeSummary(summary, results) {
  if (!summary || typeof summary !== "object") {
    return {
      overview: `Retrieved ${results.length} result${results.length === 1 ? "" : "s"}.`,
      findings: [],
      limitations: "",
      generatedBy: "fallback",
    };
  }

  const findings = toArray(summary.findings).map((finding, idx) => {
    const citations = toArray(finding?.citations)
      .map(normalizeCitation)
      .filter(Boolean);
    return {
      id: `finding-${idx + 1}`,
      claim: asString(finding?.claim),
      citations,
      evidence: toArray(finding?.evidence),
    };
  });

  return {
    overview: asString(summary.overview),
    findings,
    limitations: asString(summary.limitations),
    generatedBy: asString(summary.generated_by) || "fallback",
  };
}

export async function searchEntropy({ q, types, limit = 10 }) {
  const params = new URLSearchParams();
  params.set("q", q);
  params.set("limit", String(limit));
  if (types && types.length > 0) {
    params.set("types", types.join(","));
  }

  const res = await fetch(
    `${API_BASE}/api/entropy/search?${params.toString()}`,
  );
  
  let body;
  const rawText = await res.text();
  try {
    body = JSON.parse(rawText);
  } catch (err) {
    throw new Error(`Invalid response from server (Status: ${res.status}): ${rawText.slice(0, 100)}`);
  }

  if (!res.ok) {
    const message = body?.error?.message || `Search failed: ${res.status}`;
    throw new Error(message);
  }

  const results = toArray(body.results).map(normalizeResult);
  const summary = normalizeSummary(body.summary, results);

  return {
    query: asString(body.query),
    queryPlan:
      body.query_plan && typeof body.query_plan === "object"
        ? body.query_plan
        : {},
    totalResults:
      typeof body.total_results === "number"
        ? body.total_results
        : results.length,
    typesRequested: toArray(body.types_requested),
    errors: body.errors && typeof body.errors === "object" ? body.errors : {},
    summary,
    results,
  };
}
