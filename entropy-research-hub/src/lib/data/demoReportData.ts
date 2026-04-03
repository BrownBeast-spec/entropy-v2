import { Report, ReportSection } from "@/types/workspace";

export const demoReport: Report = {
  workspaceId: "demo",
  generatedAt: new Date(),
  wordCount: 347,
  sections: [
    {
      title: "Overview",
      content: `This research workspace explores the therapeutic potential of **metformin** in non-alcoholic steatohepatitis (NASH). The knowledge graph contains 16 entities spanning disease mechanisms, drug targets, clinical evidence, and Indian market intelligence.

The primary mechanistic pathway identified is **AMPK activation** leading to improved hepatic metabolic function. Secondary targets include PPAR-gamma modulation and inflammatory cytokine reduction.`,
      citations: [
        {
          id: "cit_1",
          nodeId: "drug_metformin",
          source: "PubMed",
          label: "Metformin",
        },
        {
          id: "cit_2",
          nodeId: "gene_ampk",
          source: "Open Targets",
          label: "PRKAA1",
        },
      ],
    },
    {
      title: "Key Targets and Evidence",
      content: `**PRKAA1 (AMPK alpha-1)** shows the highest association score (0.92) with NASH. Metformin directly activates this pathway, as demonstrated in recent literature.

**PPARG (PPAR-gamma)** represents a parallel therapeutic axis (association score: 0.85). Pioglitazone, an existing PPAR-gamma agonist, is currently in Phase 3 trials for NASH.

Inflammatory mediators **TNF** and **IL6** are elevated in NASH (association scores: 0.78 and 0.75 respectively) and show co-expression patterns in the protein interaction network.`,
      citations: [
        {
          id: "cit_3",
          nodeId: "gene_ampk",
          source: "Open Targets",
          label: "Open Targets",
        },
        {
          id: "cit_4",
          nodeId: "paper_pmid38291045",
          source: "PubMed",
          label: "PMID 38291045",
        },
        {
          id: "cit_5",
          nodeId: "gene_pparg",
          source: "Open Targets",
          label: "PPARG",
        },
        {
          id: "cit_6",
          nodeId: "trial_nct03456789",
          source: "ClinicalTrials.gov",
          label: "NCT03456789",
        },
      ],
    },
    {
      title: "Clinical Trial Activity",
      content: `Two relevant trials are identified in the graph:

- **NCT02345678**: Completed Phase 2 study of metformin in NASH, sponsored by Generic Pharma Research
- **NCT03456789**: Active Phase 3 trial of pioglitazone for NASH, with Indian sponsor involvement

Both trials demonstrate active investigation of metabolic pathway modulation as a NASH treatment strategy.`,
      citations: [
        {
          id: "cit_7",
          nodeId: "trial_nct02345678",
          source: "ClinicalTrials.gov",
          label: "NCT02345678",
        },
        {
          id: "cit_8",
          nodeId: "trial_nct03456789",
          source: "ClinicalTrials.gov",
          label: "NCT03456789",
        },
      ],
    },
    {
      title: "Indian Market Intelligence",
      content: `**India Lens active** — highlighting 5 India-relevant nodes:

**Cipla Ltd** holds patent US10234567B2 for extended-release metformin formulation (filing: 2018, expiry: 2038). This represents a defensible formulation patent in the generic metformin space.

**Dr. Reddy's Laboratories** filed patent US10345678B2 covering PPAR-gamma agonist compositions (filing: 2019, expiry: 2039).

A 2023 publication (PMID 38291045) by Sharma et al. demonstrates Indian research activity in metformin's AMPK activation mechanism.

The active Phase 3 trial (NCT03456789) lists Indian Clinical Trials as a sponsor, indicating local capability for NASH therapeutic development.`,
      citations: [
        {
          id: "cit_9",
          nodeId: "company_cipla",
          source: "PatentsView",
          label: "Cipla Ltd",
        },
        {
          id: "cit_10",
          nodeId: "patent_us10234567",
          source: "PatentsView",
          label: "US10234567B2",
        },
        {
          id: "cit_11",
          nodeId: "company_dreddys",
          source: "PatentsView",
          label: "Dr. Reddy's",
        },
        {
          id: "cit_12",
          nodeId: "paper_pmid38291045",
          source: "PubMed",
          label: "PMID 38291045",
        },
      ],
    },
    {
      title: "Open Questions",
      content: `**Coverage gaps identified:**

1. **Safety profile**: No adverse event data from OpenFDA currently in the graph. Long-term hepatic safety signals for metformin in NASH populations should be investigated.

2. **Dosing studies**: Clinical trial protocols are not detailed in the current graph. Optimal metformin dosing for NASH (vs. diabetes) remains an open question.

3. **Biomarker stratification**: No genomic or metabolic biomarkers are present. Patient selection criteria for AMPK-targeted therapy need exploration.

4. **CDSCO regulatory pathway**: Indian regulatory requirements for NASH indication expansion are not captured. This should be added for market entry planning.`,
      citations: [],
    },
  ],
};

export const strategistModeReport: Report = {
  workspaceId: "demo",
  generatedAt: new Date(),
  wordCount: 289,
  sections: [
    {
      title: "Competitive Landscape Overview",
      content: `The NASH therapeutic space shows active patent activity from Indian generic manufacturers, with 2 relevant patents identified in the knowledge graph. Both Cipla and Dr. Reddy's have filed formulation and composition patents in the 2018-2019 timeframe, indicating strategic positioning ahead of anticipated NASH market growth.`,
      citations: [
        {
          id: "cit_s1",
          nodeId: "patent_us10234567",
          source: "PatentsView",
          label: "US10234567B2",
        },
        {
          id: "cit_s2",
          nodeId: "patent_us10345678",
          source: "PatentsView",
          label: "US10345678B2",
        },
      ],
    },
    {
      title: "Dominant Players and Patent Position",
      content: `**Cipla Ltd**: Extended-release metformin formulation patent (expires 2038) provides 14 years of remaining protection. This is a lifecycle management play on an off-patent API.

**Dr. Reddy's Laboratories**: PPAR-gamma agonist composition patent (expires 2039) covers a broader therapeutic mechanism with higher novelty potential than formulation patents.`,
      citations: [
        {
          id: "cit_s3",
          nodeId: "company_cipla",
          source: "PatentsView",
          label: "Cipla",
        },
        {
          id: "cit_s4",
          nodeId: "company_dreddys",
          source: "PatentsView",
          label: "Dr. Reddy's",
        },
      ],
    },
    {
      title: "Patent Expiry Timeline and Market Entry Windows",
      content: `No near-term patent cliffs identified in the current graph. Both active patents have 14-15 year remaining terms, indicating a protected development runway for current holders.

**White space opportunity**: Generic NASH therapies are still in early clinical stages. First-mover advantage exists for companies completing Phase 3 trials before 2030.`,
      citations: [],
    },
    {
      title: "Trial Activity Summary",
      content: `2 trials identified:
- 1 completed Phase 2 (metformin)
- 1 active Phase 3 (pioglitazone)

Indian sponsor involvement in NCT03456789 demonstrates local R&D capability. This trial completion would provide CDSCO-relevant clinical data for Indian market entry.`,
      citations: [
        {
          id: "cit_s5",
          nodeId: "trial_nct03456789",
          source: "ClinicalTrials.gov",
          label: "NCT03456789",
        },
      ],
    },
    {
      title: "White Space Opportunities",
      content: `**Unmet needs:**
1. Novel AMPK activators beyond metformin (no new chemical entities in graph)
2. Combination therapy patents (single-agent focus observed)
3. Pediatric NASH formulations (not covered in existing patents)

**Strategic recommendations:**
- Monitor pioglitazone Phase 3 completion for partnership opportunities
- File combination patents pairing metformin + PPAR-gamma agonists
- Explore CDSCO orphan drug pathways for pediatric NASH`,
      citations: [],
    },
  ],
};
