import { WorkspaceMode } from "@/types/workspace";

export const getSuggestedQueries = (mode: WorkspaceMode, indiaLens: boolean): string[] => {
  if (mode === "Researcher") {
    const baseQueries = [
      "What are the safety signals for long-term metformin use in hepatic impairment?",
      "Which proteins interact with AMPK in the insulin signaling pathway?",
      "What Phase 2/3 trials are active in NASH with AMPK-targeting compounds?",
    ];
    
    if (indiaLens) {
      return [
        "Which Indian companies have filed formulation patents for metformin extended-release?",
        "What CDSCO-approved trials are investigating NASH therapeutics in Indian populations?",
        ...baseQueries.slice(1),
      ];
    }
    
    return baseQueries;
  } else {
    // Strategist mode
    const baseQueries = [
      "Which companies hold active patents in the PPAR-gamma agonist space?",
      "What is the patent expiry timeline for SGLT2 inhibitors?",
      "Which NASH therapeutics are in Phase 3 trials with Indian sponsors?",
    ];
    
    if (indiaLens) {
      return [
        "Which Indian companies hold active patents in the NASH therapeutic space?",
        "What CDSCO regulatory requirements exist for NASH indication expansion?",
        "Which Indian generics manufacturers have filed ANDA applications for metabolic drugs?",
      ];
    }
    
    return baseQueries;
  }
};

export const getQueryPlaceholder = (mode: WorkspaceMode, indiaLens: boolean): string => {
  if (mode === "Researcher") {
    if (indiaLens) {
      return "Enter your research question — e.g. 'What are the CDSCO-relevant safety signals for metformin in Indian NASH trials?'";
    }
    return "Enter your main research question — e.g. 'What are the mechanistic targets for metformin in non-alcoholic fatty liver disease?'";
  } else {
    if (indiaLens) {
      return "Enter your competitive intelligence question — e.g. 'Which Indian companies hold active patents in the SGLT2 inhibitor space?'";
    }
    return "Enter your competitive intelligence question — e.g. 'What is the patent landscape for NASH therapeutics entering generic markets?'";
  }
};
