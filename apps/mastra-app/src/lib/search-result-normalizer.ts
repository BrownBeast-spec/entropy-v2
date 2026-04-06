import {
  DataSourceSchema,
  NodeTypeSchema,
  type DataSource,
  type NodeType,
} from "@entropy/api/src/schemas/graph-schema.js";

type RecordLike = Record<string, unknown>;

function asRecord(value: unknown): RecordLike | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as RecordLike;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

export function getNormalizedResultId(result: RecordLike): string {
  return (
    asString(result.entityId) ||
    asString(result.id) ||
    asString(result.target_id) ||
    "unknown"
  );
}

export function getNormalizedResultType(result: RecordLike): NodeType {
  const rawType = asString(result.type) || asString(result.entityType) || "paper";
  const normalizedType = rawType.trim().toLowerCase();

  const aliasMap: Record<string, NodeType> = {
    clinical_trial: "trial",
    clinicaltrial: "trial",
    clinicaltrials: "trial",
    trials: "trial",
    publications: "paper",
    publication: "paper",
    article: "paper",
  };

  const candidate = aliasMap[normalizedType] || normalizedType;
  const parsed = NodeTypeSchema.safeParse(candidate);
  return parsed.success ? parsed.data : "paper";
}

export function getNormalizedResultLabel(result: RecordLike): string {
  const metadata = asRecord(result.metadata);

  return (
    asString(result.label) ||
    asString(result.title) ||
    asString(result.name) ||
    (metadata ? asString(metadata.label) : undefined) ||
    (metadata ? asString(metadata.title) : undefined) ||
    (metadata ? asString(metadata.name) : undefined) ||
    asString(result.entityId) ||
    asString(result.id) ||
    "Unnamed"
  );
}

export function getNormalizedResultSource(result: RecordLike): DataSource {
  const metadata = asRecord(result.metadata);
  const rawSource =
    asString(result.source) || (metadata ? asString(metadata.source) : undefined);

  if (!rawSource) {
    return "PubMed";
  }

  const normalizedSource = rawSource.trim().toLowerCase();
  const aliasMap: Record<string, DataSource> = {
    "open targets": "Open Targets",
    opentargets: "Open Targets",
    string: "STRING",
    pubmed: "PubMed",
    patentsview: "PatentsView",
    openfda: "OpenFDA",
    "clinicaltrials.gov": "ClinicalTrials.gov",
    clinicaltrialsgov: "ClinicalTrials.gov",
    "clinical trials": "ClinicalTrials.gov",
    "europe pmc": "Europe PMC",
    europepmc: "Europe PMC",
    uniprot: "UniProt",
    pubchem: "PubChem",
  };

  const candidate = aliasMap[normalizedSource] || rawSource;
  const parsed = DataSourceSchema.safeParse(candidate);
  return parsed.success ? parsed.data : "PubMed";
}
