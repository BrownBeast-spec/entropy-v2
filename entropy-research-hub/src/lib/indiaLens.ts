import { GraphNode } from "@/types/workspace";

type IndiaContext = {
  isIndianPatent?: boolean;
  isCDSCO?: boolean;
  isNPPA?: boolean;
  nppaPriceCapInr?: number;
  matchedCompany?: string;
};

const CDSCO_APPROVED_DRUGS = new Set(["metformin", "pioglitazone", "liraglutide"]);

const NPPA_PRICE_CAPS_INR = new Map<string, number>([
  ["metformin", 16.2],
  ["pioglitazone", 22.5],
]);

const INDIAN_COMPANY_SUFFIXES = ["pvt ltd", "private limited", "limited", "ltd"];
const INDIAN_COMPANY_KEYWORDS = [
  "sun pharma",
  "lupin",
  "dr reddy",
  "cipla",
  "torrent",
  "zydus",
  "glenmark",
];

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getAssignee(node: GraphNode): string {
  const metadata = node.metadata;
  if (!metadata || typeof metadata !== "object") return "";
  return normalize((metadata as Record<string, unknown>).assignee);
}

function isIndianAssignee(assignee: string): boolean {
  if (!assignee) return false;
  const hasKeyword = INDIAN_COMPANY_KEYWORDS.some((k) => assignee.includes(k));
  const hasSuffix = INDIAN_COMPANY_SUFFIXES.some((s) => assignee.endsWith(s));
  return hasKeyword && hasSuffix;
}

export function processIndiaLens(nodes: GraphNode[]): GraphNode[] {
  return nodes.map((node) => {
    const label = normalize(node.label);
    const assignee = getAssignee(node);
    const indiaContext: IndiaContext = {
      ...(node.metadata?.indiaContext as IndiaContext | undefined),
    };

    if (node.type === "patent" && isIndianAssignee(assignee)) {
      indiaContext.isIndianPatent = true;
      indiaContext.matchedCompany = assignee;
    }

    if (node.type === "drug" || node.type === "compound") {
      if (CDSCO_APPROVED_DRUGS.has(label)) {
        indiaContext.isCDSCO = true;
      }

      const priceCap = NPPA_PRICE_CAPS_INR.get(label);
      if (typeof priceCap === "number") {
        indiaContext.isNPPA = true;
        indiaContext.nppaPriceCapInr = priceCap;
      }
    }

    const indiaRelevant =
      indiaContext.isIndianPatent === true ||
      indiaContext.isCDSCO === true ||
      indiaContext.isNPPA === true;

    return {
      ...node,
      metadata: {
        ...node.metadata,
        indiaContext,
      },
      indiaRelevant,
    };
  });
}
