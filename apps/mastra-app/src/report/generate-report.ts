import {
  titlePageSection,
  executiveSummarySection,
  ppicoSection,
  biologicalRationaleSection,
  clinicalLandscapeSection,
  safetyProfileSection,
  literatureReviewSection,
  gapAnalysisSection,
  verificationReportSection,
  reviewerDecisionSection,
  appendicesSection,
  bibliographySection,
  collectAllCitations,
} from "./sections.js";
export { ReportInputSchema, type ReportInput } from "./types.js";
import type { ReportInput } from "./types.js";

/**
 * Generates a complete LaTeX document string from the report input.
 */
export function generateReport(input: ReportInput): string {
  const citations = collectAllCitations(input);

  const sections = [
    titlePageSection(input),
    executiveSummarySection(input),
    ppicoSection(input),
    biologicalRationaleSection(input, citations),
    clinicalLandscapeSection(input, citations),
    safetyProfileSection(input, citations),
    literatureReviewSection(input, citations),
    gapAnalysisSection(input),
    verificationReportSection(input),
    reviewerDecisionSection(input),
    appendicesSection(input),
    bibliographySection(citations),
  ].join("\n\n");

  return `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{hyperref}
\\usepackage{url}
\\usepackage{booktabs}
\\usepackage{longtable}
\\usepackage{xcolor}
\\usepackage{parskip}
\\geometry{margin=2.5cm}

\\title{Drug Repurposing Dossier}
\\date{${input.metadata.timestamp}}

\\begin{document}

${sections}

\\end{document}
`;
}
