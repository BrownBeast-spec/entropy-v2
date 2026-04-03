import { GraphNode, GraphEdge } from "@/types/workspace";

// Demo data for Metformin + NASH research workspace
export const demoNodes: GraphNode[] = [
  // Disease nodes
  {
    id: "disease_nash",
    label: "Non-alcoholic steatohepatitis",
    type: "disease",
    source: "Open Targets",
    metadata: { efoId: "EFO_0004232" },
    evidenceScore: 95,
    addedByQuery: "demo_query_1",
    indiaRelevant: false,
  },
  {
    id: "disease_nafld",
    label: "Non-alcoholic fatty liver disease",
    type: "disease",
    source: "Open Targets",
    metadata: { efoId: "EFO_0004234" },
    evidenceScore: 90,
    addedByQuery: "demo_query_1",
    indiaRelevant: false,
  },
  
  // Gene/protein nodes
  {
    id: "gene_pparg",
    label: "PPARG",
    type: "protein",
    source: "Open Targets",
    metadata: { uniprotId: "P37231", fullName: "Peroxisome proliferator-activated receptor gamma" },
    evidenceScore: 85,
    addedByQuery: "demo_query_1",
    indiaRelevant: false,
  },
  {
    id: "gene_ampk",
    label: "PRKAA1",
    type: "protein",
    source: "Open Targets",
    metadata: { uniprotId: "Q13131", fullName: "AMP-activated protein kinase catalytic subunit alpha-1" },
    evidenceScore: 92,
    addedByQuery: "demo_query_1",
    indiaRelevant: false,
  },
  {
    id: "gene_tnf",
    label: "TNF",
    type: "protein",
    source: "Open Targets",
    metadata: { uniprotId: "P01375", fullName: "Tumor necrosis factor" },
    evidenceScore: 78,
    addedByQuery: "demo_query_1",
    indiaRelevant: false,
  },
  {
    id: "gene_il6",
    label: "IL6",
    type: "protein",
    source: "Open Targets",
    metadata: { uniprotId: "P05231", fullName: "Interleukin-6" },
    evidenceScore: 75,
    addedByQuery: "demo_query_1",
    indiaRelevant: false,
  },
  
  // Drug/compound nodes
  {
    id: "drug_metformin",
    label: "Metformin",
    type: "drug",
    source: "PubMed",
    metadata: { pubchemId: "4091", chemblId: "CHEMBL1431" },
    evidenceScore: 88,
    addedByQuery: "demo_query_1",
    indiaRelevant: true,
  },
  {
    id: "drug_pioglitazone",
    label: "Pioglitazone",
    type: "drug",
    source: "PubMed",
    metadata: { pubchemId: "4829", chemblId: "CHEMBL595" },
    evidenceScore: 82,
    addedByQuery: "demo_query_1",
    indiaRelevant: false,
  },
  
  // Clinical trial nodes
  {
    id: "trial_nct02345678",
    label: "NCT02345678",
    type: "trial",
    source: "ClinicalTrials.gov",
    metadata: { 
      title: "Metformin in NASH - Phase 2",
      phase: "Phase 2",
      status: "Completed",
      sponsor: "Generic Pharma Research"
    },
    evidenceScore: 70,
    addedByQuery: "demo_query_2",
    indiaRelevant: false,
  },
  {
    id: "trial_nct03456789",
    label: "NCT03456789",
    type: "trial",
    source: "ClinicalTrials.gov",
    metadata: { 
      title: "Pioglitazone for NASH - Phase 3",
      phase: "Phase 3",
      status: "Active",
      sponsor: "Indian Clinical Trials"
    },
    evidenceScore: 85,
    addedByQuery: "demo_query_2",
    indiaRelevant: true,
  },
  
  // Patent nodes
  {
    id: "patent_us10234567",
    label: "US10234567B2",
    type: "patent",
    source: "PatentsView",
    metadata: { 
      title: "Extended-release metformin formulation",
      assignee: "Cipla Ltd",
      filingDate: "2018-03-15",
      expiryDate: "2038-03-15"
    },
    evidenceScore: 65,
    addedByQuery: "demo_query_2",
    indiaRelevant: true,
  },
  {
    id: "patent_us10345678",
    label: "US10345678B2",
    type: "patent",
    source: "PatentsView",
    metadata: { 
      title: "PPAR-gamma agonist composition",
      assignee: "Dr. Reddy's Laboratories",
      filingDate: "2019-07-22",
      expiryDate: "2039-07-22"
    },
    evidenceScore: 72,
    addedByQuery: "demo_query_2",
    indiaRelevant: true,
  },
  
  // Paper nodes
  {
    id: "paper_pmid38291045",
    label: "PMID 38291045",
    type: "paper",
    source: "PubMed",
    metadata: { 
      title: "Metformin activates AMPK pathway in hepatic steatosis",
      journal: "Hepatology",
      year: 2023,
      authors: "Sharma R, Kumar P, et al."
    },
    evidenceScore: 88,
    addedByQuery: "demo_query_1",
    indiaRelevant: true,
  },
  {
    id: "paper_pmid38123456",
    label: "PMID 38123456",
    type: "paper",
    source: "Europe PMC",
    metadata: { 
      title: "PPAR-gamma activation reduces hepatic inflammation",
      journal: "J Hepatol",
      year: 2024,
      authors: "Chen W, Patel S, et al."
    },
    evidenceScore: 82,
    addedByQuery: "demo_query_1",
    indiaRelevant: false,
  },
  
  // Company nodes
  {
    id: "company_cipla",
    label: "Cipla Ltd",
    type: "company",
    source: "PatentsView",
    metadata: { country: "India", sector: "Generic Pharmaceuticals" },
    evidenceScore: 75,
    addedByQuery: "demo_query_2",
    indiaRelevant: true,
  },
  {
    id: "company_dreddys",
    label: "Dr. Reddy's Laboratories",
    type: "company",
    source: "PatentsView",
    metadata: { country: "India", sector: "Generic Pharmaceuticals" },
    evidenceScore: 78,
    addedByQuery: "demo_query_2",
    indiaRelevant: true,
  },
];

export const demoEdges: GraphEdge[] = [
  // Disease-target associations
  {
    id: "edge_nash_pparg",
    source: "disease_nash",
    target: "gene_pparg",
    type: "association",
    confidence: 0.85,
    metadata: { associationScore: 0.85, source: "Open Targets" },
  },
  {
    id: "edge_nash_ampk",
    source: "disease_nash",
    target: "gene_ampk",
    type: "association",
    confidence: 0.92,
    metadata: { associationScore: 0.92, source: "Open Targets" },
  },
  {
    id: "edge_nash_tnf",
    source: "disease_nash",
    target: "gene_tnf",
    type: "association",
    confidence: 0.78,
    metadata: { associationScore: 0.78, source: "Open Targets" },
  },
  {
    id: "edge_nash_il6",
    source: "disease_nash",
    target: "gene_il6",
    type: "association",
    confidence: 0.75,
    metadata: { associationScore: 0.75, source: "Open Targets" },
  },
  {
    id: "edge_nafld_pparg",
    source: "disease_nafld",
    target: "gene_pparg",
    type: "association",
    confidence: 0.80,
    metadata: { associationScore: 0.80, source: "Open Targets" },
  },
  
  // Drug-target interactions
  {
    id: "edge_metformin_ampk",
    source: "drug_metformin",
    target: "gene_ampk",
    type: "binding",
    confidence: 0.95,
    metadata: { interactionType: "activator", source: "ChEMBL" },
  },
  {
    id: "edge_pioglitazone_pparg",
    source: "drug_pioglitazone",
    target: "gene_pparg",
    type: "binding",
    confidence: 0.98,
    metadata: { interactionType: "agonist", source: "ChEMBL" },
  },
  
  // Protein-protein interactions
  {
    id: "edge_tnf_il6",
    source: "gene_tnf",
    target: "gene_il6",
    type: "interaction",
    confidence: 0.82,
    metadata: { interactionType: "co-expression", source: "STRING" },
  },
  
  // Trial-drug relationships
  {
    id: "edge_trial1_metformin",
    source: "trial_nct02345678",
    target: "drug_metformin",
    type: "sponsorship",
    confidence: 1.0,
    metadata: { relationship: "intervention" },
  },
  {
    id: "edge_trial2_pioglitazone",
    source: "trial_nct03456789",
    target: "drug_pioglitazone",
    type: "sponsorship",
    confidence: 1.0,
    metadata: { relationship: "intervention" },
  },
  
  // Patent-company ownership
  {
    id: "edge_patent1_cipla",
    source: "patent_us10234567",
    target: "company_cipla",
    type: "ownership",
    confidence: 1.0,
    metadata: { relationship: "assignee" },
  },
  {
    id: "edge_patent2_dreddys",
    source: "patent_us10345678",
    target: "company_dreddys",
    type: "ownership",
    confidence: 1.0,
    metadata: { relationship: "assignee" },
  },
  
  // Patent-drug relationships
  {
    id: "edge_patent1_metformin",
    source: "patent_us10234567",
    target: "drug_metformin",
    type: "association",
    confidence: 0.9,
    metadata: { relationship: "formulation" },
  },
  {
    id: "edge_patent2_pparg",
    source: "patent_us10345678",
    target: "gene_pparg",
    type: "association",
    confidence: 0.85,
    metadata: { relationship: "target" },
  },
  
  // Paper citations
  {
    id: "edge_paper1_metformin",
    source: "paper_pmid38291045",
    target: "drug_metformin",
    type: "association",
    confidence: 0.9,
    metadata: { relationship: "mentions" },
  },
  {
    id: "edge_paper1_ampk",
    source: "paper_pmid38291045",
    target: "gene_ampk",
    type: "association",
    confidence: 0.88,
    metadata: { relationship: "studies" },
  },
  {
    id: "edge_paper2_pparg",
    source: "paper_pmid38123456",
    target: "gene_pparg",
    type: "association",
    confidence: 0.85,
    metadata: { relationship: "studies" },
  },
];
