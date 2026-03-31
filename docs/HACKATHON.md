# Entropy

### AI-Powered Drug Repurposing Research in Minutes, Not Months

**Team Jigyasa** | AMD Slingshot 2026 | Theme: Open Innovation

---

## Table of Contents

1. [The Problem -- In Plain English](#the-problem----in-plain-english)
2. [The Problem -- The Technical Reality](#the-problem----the-technical-reality)
3. [Our Solution -- Entropy](#our-solution----entropy)
4. [How It Works](#how-it-works)
5. [Key Features](#key-features)
6. [Real-World Impact](#real-world-impact)
7. [Why Open Innovation?](#why-open-innovation)
8. [Tech Stack](#tech-stack)

---

## The Problem -- In Plain English

Imagine you are a doctor. You know that a cheap, widely available diabetes pill called **Metformin** might also help people with Alzheimer's disease. But before you can test that idea, you need answers to dozens of questions:

- Has anyone else tried this before?
- Are there clinical trials already running?
- What side effects could occur?
- Does the drug even interact with the right proteins in the brain?
- What does the published research say?

Here's the catch: **the answers to these questions are scattered across dozens of different databases around the world.** Clinical trial data sits on one website. Safety reports sit on another. Protein interaction data is on yet another. Published papers are somewhere else entirely. Each database has its own search interface, its own format, its own language.

Today, a researcher has to **manually visit each of these databases one by one**, run separate searches, copy results into spreadsheets, cross-reference findings by hand, and then spend weeks writing up a report summarizing what they found. It is slow, exhausting, and error-prone.

This is a real bottleneck in healthcare. **Over 90% of drugs fail in clinical trials**, often because the early-stage evidence gathering was incomplete -- a researcher missed a critical safety signal buried in one database, or overlooked a contradictory study in another. Each failed trial wastes an average of **$800 million to $1.4 billion** and years of time.

Meanwhile, there are **thousands of existing, approved drugs** that might work for diseases they were never originally designed for. COVID-19 showed us this -- Remdesivir was originally developed for Ebola. Dexamethasone, a decades-old steroid, turned out to be one of the most effective COVID treatments. These discoveries happened partly by luck and partly by heroic manual effort.

**What if we could make this process fast, thorough, and accessible to any researcher on the planet?**

That's what Entropy does.

---

## The Problem -- The Technical Reality

Drug repurposing -- identifying new therapeutic indications for existing approved compounds -- is one of the most cost-effective strategies in pharmaceutical R&D. It bypasses years of de novo drug design because the candidate compound already has established safety, pharmacokinetic, and manufacturing profiles.

However, the **evidence synthesis bottleneck** remains the critical barrier:

### Fragmented Data Landscape

A single repurposing hypothesis requires querying across fundamentally different data domains:

| Domain                         | Sources                              | Data Type                                                                       |
| ------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------- |
| **Target Biology**             | Open Targets, UniProt, Ensembl, NCBI | Gene-disease associations, protein structures, molecular pathways, variant data |
| **Clinical Evidence**          | ClinicalTrials.gov                   | Trial designs, endpoints, patient populations, recruitment status               |
| **Safety & Pharmacovigilance** | OpenFDA FAERS, RxNav                 | Adverse event reports, drug labels, recalls, drug-drug interactions             |
| **Literature**                 | PubMed, NCBI                         | Published studies, preprints, systematic reviews, meta-analyses                 |
| **Commercial**                 | IQVIA, market databases              | Patent landscapes, competitive positioning, market feasibility                  |

Each source has **different APIs, query languages, data schemas, and rate limits**. There is no unified interface. A researcher must context-switch between GraphQL (Open Targets), REST APIs (ClinicalTrials.gov, OpenFDA), and E-utilities (PubMed/NCBI) -- often with no programming background.

### No Structured Analytical Framework

Even after gathering data, researchers lack a systematic method to:

- Decompose a hypothesis into the **PPICO framework** (Population, Prognostic factors, Intervention, Comparison, Outcome) -- the gold standard in evidence-based medicine
- Evaluate evidence completeness against a **Target Product Profile (TPP)** -- the 12-criterion pharmaceutical checklist covering mechanism of action, target validation, preclinical efficacy, clinical efficacy, safety/tolerability, PK/dosing, regulatory pathway, IP landscape, manufacturing feasibility, commercial viability, patient access, and competitive differentiation
- Identify **critical gaps** where evidence is missing or contradictory

### Hallucination Risk in AI-Assisted Research

General-purpose LLMs (ChatGPT, Gemini, etc.) can summarize biomedical text, but they **hallucinate citations, fabricate study results, and cannot query live databases**. In pharmaceutical research, a single hallucinated safety claim can have life-or-death consequences. There is no verification layer, no provenance trail, and no audit compliance.

### The Result

What should take hours takes **weeks to months**. What should be systematic is **ad-hoc and incomplete**. What should be accessible to any researcher worldwide is **gated behind institutional access and domain expertise**.

---

## Our Solution -- Entropy

### For the Non-Technical Reader

Entropy is like hiring a team of **seven specialist research assistants** who work simultaneously, each an expert in their own domain:

1. **The Planner** reads your research question and breaks it down into specific sub-questions for each specialist
2. **The Biologist** searches protein and gene databases to understand the biological mechanism
3. **The Clinical Scout** searches clinical trial registries to find what trials have been run or are running
4. **The Safety Hawk** searches drug safety databases for adverse events, interactions, and recalls
5. **The Librarian** searches published medical literature for relevant studies and papers
6. **The Gap Analyst** reviews all the collected evidence and identifies what's missing or contradictory
7. **The Verifier** independently double-checks every major claim by going back to the raw data

After all seven have done their work, the system **pauses and asks a human reviewer** to approve or reject the findings. Only after human approval does it compile everything into a professional, fully-cited research report (PDF).

You type a question like _"Can Metformin be repurposed for Alzheimer's disease?"_ and within minutes, you get a comprehensive research dossier that would have taken a team of researchers weeks to produce manually.

### For the Technical Reader

Entropy is an **autonomous multi-agent orchestration platform** built on the Mastra AI framework. It implements a structured research pipeline where specialized LLM agents -- each with domain-constrained tool access via the Model Context Protocol (MCP) -- query real biomedical databases in parallel, synthesize evidence into a PPICO-structured analysis, perform TPP-based gap evaluation, independently verify claims through re-querying raw data sources, and produce an auditable LaTeX/PDF research dossier with full provenance.

The system enforces **human-in-the-loop governance** through a suspend/resume mechanism, ensuring no final output is generated without explicit reviewer approval. Every agent execution, tool call, and human decision is logged to a PostgreSQL-backed audit store for pharmaceutical GxP compliance traceability.

---

## How It Works

### The Pipeline at a Glance

```
                                    ENTROPY RESEARCH PIPELINE
                                    =========================

 USER QUERY                                                              FINAL OUTPUT
 "Can Metformin        +-----------+                                    +-------------+
  be repurposed  ----->|  PLANNER  |                                    |   Research   |
  for Alzheimer's?"    |  Agent    |                                    |   Dossier    |
                       +-----+-----+                                    |   (PDF)      |
                             |                                          +------^-------+
                             | Decomposes query into PPICO framework           |
                             | Assigns sub-tasks to specialist agents          |
                             v                                                 |
              +--------------------------------------------+                   |
              |         PARALLEL EVIDENCE GATHERING        |                   |
              |                                            |                   |
              |  +-----------+  +-----------+              |            +------+-------+
              |  | BIOLOGIST |  | CLINICAL  |              |            |   REPORT     |
              |  |   Agent   |  |  SCOUT    |              |            |  GENERATOR   |
              |  |           |  |   Agent   |              |            |  (Pandoc +   |
              |  | Queries:  |  |           |              |            |   LaTeX)     |
              |  | -Open     |  | Queries:  |              |            +------^-------+
              |  |  Targets  |  | -Clinical |              |                   |
              |  | -UniProt  |  |  Trials   |              |                   | Human approves
              |  | -Ensembl  |  |  .gov     |              |                   |
              |  | -NCBI     |  | -PubMed   |              |            +------+-------+
              |  +-----------+  +-----------+              |            |    HUMAN     |
              |                                            |            |   REVIEW     |
              |  +-----------+  +-----------+              |            |   (HITL)     |
              |  |   HAWK    |  | LIBRARIAN |              |            | Pipeline     |
              |  |  (Safety) |  |   Agent   |              |            | suspends &   |
              |  |   Agent   |  |           |              |            | waits for    |
              |  |           |  | Queries:  |              |            | approval     |
              |  | Queries:  |  | -PubMed   |              |            +------^-------+
              |  | -OpenFDA  |  | -NCBI     |              |                   |
              |  |  FAERS    |  | -Preprint |              |                   |
              |  | -RxNav    |  |  servers  |              |            +------+-------+
              |  | -Drug     |  +-----------+              |            |   VERIFIER   |
              |  |  Labels   |                             |            |    Agent     |
              |  +-----------+                             |            |              |
              |                                            |            | Re-queries   |
              +---------------------+----------------------+            | ALL raw data |
                                    |                                   | sources to   |
                                    | All 4 agents return findings      | fact-check   |
                                    v                                   | claims       |
                            +-------+--------+                          +------^-------+
                            | MERGE EVIDENCE  |                                |
                            | Combines all    |                                |
                            | agent outputs   |                         +------+-------+
                            | into unified    |                         |  GAP ANALYST |
                            | evidence schema |                         |    Agent     |
                            +-------+---------+                         |              |
                                    |                                   | Evaluates    |
                                    +---------------------------------->| against 12   |
                                                                        | item TPP     |
                                                                        | checklist    |
                                                                        +--------------+
```

### Step-by-Step Walkthrough

#### Step 1: You Ask a Question

You submit a natural-language research question through the API or the chat interface. No special syntax, no database knowledge required.

> _Example: "Can Metformin be repurposed for Alzheimer's disease?"_

#### Step 2: The Planner Breaks It Down

The **Planner Agent** receives your question and decomposes it using the **PPICO framework** -- the standard method used in evidence-based medicine for structuring clinical questions:

| PPICO Element          | Example                                                   |
| ---------------------- | --------------------------------------------------------- |
| **Population**         | Elderly patients (65+) with mild-to-moderate Alzheimer's  |
| **Prognostic Factors** | Type 2 diabetes comorbidity, ApoE4 carrier status         |
| **Intervention**       | Metformin (500-2000mg daily, oral)                        |
| **Comparison**         | Standard Alzheimer's treatments (donepezil, memantine)    |
| **Outcome**            | Cognitive decline rate, biomarker changes, safety profile |

The Planner then creates a prioritized task list and distributes specific sub-questions to each specialist agent.

#### Step 3: Four Specialists Search in Parallel

This is where Entropy's power comes from. Four agents work **simultaneously**, each querying real-world biomedical databases through dedicated MCP (Model Context Protocol) tool servers:

**The Biologist** investigates the molecular mechanism:

- Queries **Open Targets** (GraphQL API) for known gene-disease associations between Metformin targets and Alzheimer's pathways
- Queries **UniProt** for protein structure and function data on key targets (e.g., AMPK, mTOR)
- Queries **Ensembl** for genetic variant data and cross-species conservation
- Queries **NCBI** for gene-level literature and pathway annotations

**The Clinical Scout** maps the clinical landscape:

- Queries **ClinicalTrials.gov** for all trials involving Metformin in neurodegeneration, cognitive decline, or Alzheimer's
- Extracts study designs, primary/secondary endpoints, patient populations, and results
- Queries **PubMed** for published trial outcomes and systematic reviews

**The Safety Hawk** assesses risk:

- Queries **OpenFDA FAERS** (FDA Adverse Event Reporting System) for adverse event reports associated with Metformin
- Checks **drug labels** for contraindications relevant to elderly/neurological populations
- Queries **RxNav** for drug-drug interactions with common Alzheimer's medications
- Checks for **recalls and safety alerts**

**The Librarian** surveys the literature:

- Queries **PubMed** for relevant published studies, reviews, and meta-analyses
- Searches **preprint servers** for the latest unpublished research
- Retrieves **abstracts and paper metadata** for citation-ready references

#### Step 4: Evidence Is Merged

All four agents return their findings in structured Zod-validated schemas. The pipeline **merges these into a unified evidence object** -- a single, structured representation of everything discovered across all domains.

#### Step 5: Gap Analysis Against the TPP Checklist

The **Gap Analyst Agent** takes the merged evidence and evaluates it against a **12-item Target Product Profile (TPP) checklist** -- the pharmaceutical industry standard for assessing drug development readiness:

```
TARGET PRODUCT PROFILE (TPP) CHECKLIST
=======================================

 #  | Criterion                  | Status
----|----------------------------|---------------------------
 1  | Mechanism of Action        | [Supported / Gap / Unknown]
 2  | Target Validation          | [Supported / Gap / Unknown]
 3  | Preclinical Efficacy       | [Supported / Gap / Unknown]
 4  | Clinical Efficacy          | [Supported / Gap / Unknown]
 5  | Safety & Tolerability      | [Supported / Gap / Unknown]
 6  | Pharmacokinetics & Dosing  | [Supported / Gap / Unknown]
 7  | Regulatory Pathway         | [Supported / Gap / Unknown]
 8  | IP & Patent Landscape      | [Supported / Gap / Unknown]
 9  | Manufacturing Feasibility  | [Supported / Gap / Unknown]
 10 | Commercial Viability       | [Supported / Gap / Unknown]
 11 | Patient Access & Equity    | [Supported / Gap / Unknown]
 12 | Competitive Differentiation| [Supported / Gap / Unknown]

 Overall Readiness: [READY / CONDITIONAL / NOT READY]
```

The Gap Analyst classifies each gap as **critical**, **major**, or **minor**, flags contradictions between agents, identifies risk signals, and delivers an overall readiness verdict.

#### Step 6: Independent Fact-Checking

The **Verifier Agent** acts as an independent auditor. It does **not** trust the other agents' outputs at face value. Instead, it:

- Re-queries the same raw data sources (all MCP tools) to cross-check key claims
- Assigns a **confidence score (0.0 - 1.0)** to each major finding
- Flags any discrepancies between what the agents reported and what the raw data actually shows
- Catches potential LLM hallucinations before they reach the final report

This is critical -- it is the layer that prevents the #1 risk of AI in healthcare: **fabricated or distorted evidence**.

#### Step 7: Human Review (The Pipeline Pauses)

The workflow **suspends itself** and waits for a human reviewer. The reviewer sees:

- The complete evidence synthesis
- The gap analysis with severity ratings
- The verification report with confidence scores
- Any flagged contradictions or concerns

The reviewer can **approve** (pipeline continues to report generation) or **reject with feedback** (pipeline incorporates feedback). No final output is ever produced without a human decision.

#### Step 8: Research Dossier Generated

Upon approval, the **Report Generator** compiles everything into a structured Markdown document, then converts it to a professional **LaTeX/PDF dossier** using Pandoc and XeLaTeX. The final report includes:

- Executive Summary
- PPICO Decomposition
- Biological Rationale
- Clinical Landscape
- Safety Profile
- Literature Review
- Gap Analysis & TPP Assessment
- Verification Report
- Reviewer Decision & Notes
- Appendices with full citations and data provenance

```
COMPLETE DATA FLOW
==================

  +----------+     +---------+     +------------------+     +---------+
  |   User   |---->|  Hono   |---->|  Mastra Workflow  |---->| Audit   |
  |  (Query) |     |   API   |     |     Engine        |     | Store   |
  +----------+     +---------+     +--------+---------+     | (Postgres)
       ^                |                   |                +---------+
       |                |  SSE Stream       |
       |                |  (live progress)  |
       |                v                   v
  +----------+     +---------+     +------------------+
  |  PDF     |     | Browser |     |   MCP Servers    |
  | Dossier  |     |  Client |     |  (stdio transport)|
  +----------+     +---------+     +---+----+----+---+
                                       |    |    |   |
                          +------------+    |    |   +----------+
                          |                 |    |              |
                          v                 v    v              v
                    +-----------+  +-------+  +-------+  +-----------+
                    |Open Targets|  |Clinical| |OpenFDA|  |  PubMed   |
                    |UniProt     |  |Trials  | |RxNav  |  |  NCBI     |
                    |Ensembl     |  |.gov    | |FAERS  |  |  Preprints|
                    |NCBI        |  |PubMed  | |Labels |  |           |
                    +-----------+  +-------+  +-------+  +-----------+
                     Biology        Clinical    Safety     Literature
```

---

## Key Features

### Multi-Agent Orchestration

Seven specialized AI agents, each with domain-specific prompts and constrained tool access, working in a structured pipeline. Not one general-purpose chatbot -- a coordinated team.

### Real Biomedical Data, Not Hallucinations

Every claim is backed by live queries to **Open Targets, ClinicalTrials.gov, OpenFDA, PubMed, UniProt, Ensembl, NCBI, and RxNav**. No training data cutoffs. No fabricated citations. Real data, real-time.

### PPICO-Structured Research

The evidence-based medicine gold standard for decomposing clinical questions. This isn't a chatbot summarizing the internet -- it's a systematic research methodology encoded into software.

### TPP Gap Analysis

A 12-criterion pharmaceutical checklist evaluating everything from mechanism of action to commercial viability. Researchers instantly see what evidence supports their hypothesis and where the critical gaps are.

### Independent Fact-Checking

A dedicated Verifier agent re-queries raw data sources to catch errors, contradictions, and hallucinations. Every major claim gets a confidence score.

### Human-in-the-Loop Governance

The pipeline **pauses and waits** for human approval before generating the final report. AI assists, humans decide. This is non-negotiable in healthcare.

### Full Audit Trail

Every agent execution, every tool call, every data response, and every human decision is logged to PostgreSQL. This is essential for pharmaceutical regulatory compliance (GxP) and reproducibility.

### Publication-Quality PDF Output

The final deliverable is a structured, citation-rich LaTeX/PDF dossier -- not a chat transcript. It follows pharmaceutical industry conventions and is ready for internal review or regulatory submission.

### Real-Time Streaming

Live Server-Sent Events (SSE) stream pipeline progress to the client -- which agent is running, what tools it's calling, what results are coming back. Full transparency into the AI's reasoning process.

---

## Real-World Impact

### The Numbers That Matter

| Metric                                    | Traditional Approach                                      | With Entropy                          |
| ----------------------------------------- | --------------------------------------------------------- | ------------------------------------- |
| **Time to produce a repurposing dossier** | 4-12 weeks                                                | Under 30 minutes                      |
| **Databases manually searched**           | 8-15 (one at a time)                                      | 8+ (simultaneously, automatically)    |
| **Risk of missed evidence**               | High (human fatigue, incomplete searches)                 | Low (systematic, exhaustive querying) |
| **Cost per analysis**                     | $50,000-$200,000 (researcher salaries, database licenses) | Marginal (API calls + compute)        |
| **Audit trail**                           | Manual documentation, often incomplete                    | Automatic, complete, tamper-evident   |

### Who Benefits

**Small research labs and academic institutions** that cannot afford dedicated teams of 10+ researchers for evidence synthesis. A professor with a repurposing hypothesis can now get a comprehensive evidence assessment in an afternoon instead of a semester.

**Researchers in developing nations** who have brilliant hypotheses but lack institutional access to expensive commercial databases and analysis tools. Entropy uses open, publicly accessible data sources.

**Rare disease communities** where patient populations are too small to attract pharma investment. Entropy makes it economically viable to systematically evaluate repurposing candidates for diseases that affect thousands instead of millions.

**Pharmaceutical companies** looking to de-risk early-stage portfolio decisions. A systematic, AI-verified evidence dossier reduces the chance of advancing a candidate that should have been flagged earlier -- saving hundreds of millions per avoided late-stage failure.

### The Bigger Picture

Drug repurposing is not a niche academic exercise. It is one of the most impactful strategies in global health:

- **COVID-19** demonstrated this: Dexamethasone (a $0.50/day steroid from the 1960s) reduced COVID mortality by one-third. It was a repurposing discovery.
- **Thalidomide**, once infamous for birth defects, was repurposed and is now a frontline treatment for multiple myeloma (blood cancer).
- **Sildenafil** was developed for heart conditions. Its repurposing as Viagra created a $2B market -- and it was later repurposed _again_ for pulmonary arterial hypertension (Revatio).

The world has ~**4,000 approved drugs**. The number of diseases without adequate treatment is in the **thousands**. The combinatorial space of "which existing drug might work for which unmet disease" is enormous. Manually exploring it is impossible. Systematically exploring it with AI is not just possible -- it's necessary.

---

## Why Open Innovation?

Entropy doesn't fit neatly into a single AMD Slingshot theme -- and that's the point.

It sits at the intersection of **multiple frontiers**:

- **Novel AI Agent Architecture**: Not a single chatbot, but a multi-agent system with seven specialized roles, parallel execution, structured handoffs, independent verification, and human governance. This is a fundamentally different paradigm from "ask an LLM a question."

- **Cross-Domain Data Fusion**: Biology + Clinical + Safety + Literature -- four distinct scientific domains, each with different data formats, APIs, and ontologies, unified into a single structured analysis through the Model Context Protocol.

- **AI Safety in High-Stakes Domains**: An independent fact-checking agent that doesn't trust the other agents. A human-in-the-loop that can reject the AI's work. A full audit trail. This is what responsible AI looks like when lives are at stake.

- **Human-AI Collaboration, Not Replacement**: Entropy doesn't replace researchers. It amplifies them. The AI gathers and structures evidence. The human makes the decision. The pipeline literally cannot produce a final output without human approval.

- **Measurable Real-World Outcome**: This is not a demo or a concept. It queries real databases, returns real data, and produces a real research document. The outcome is measurable: time saved, evidence coverage, gap identification accuracy.

This is open innovation because it combines AI agent orchestration, biomedical informatics, pharmaceutical methodology, and responsible AI governance into something that doesn't exist today -- and solves a problem that costs the world billions of dollars and countless lives every year.

---

## Tech Stack

| Layer             | Technology                                          | Purpose                                                |
| ----------------- | --------------------------------------------------- | ------------------------------------------------------ |
| **AI Framework**  | Mastra                                              | Agent orchestration, workflow engine, tool system      |
| **LLM Providers** | Google Gemini, OpenAI, Anthropic Claude, Perplexity | Multi-provider, per-agent configurable models          |
| **Tool Protocol** | Model Context Protocol (MCP)                        | Standardized agent-to-database communication           |
| **API Server**    | Hono                                                | Lightweight, high-performance REST API + SSE streaming |
| **Database**      | PostgreSQL                                          | Audit trail, session state, provenance logging         |
| **Report Engine** | Pandoc + XeLaTeX                                    | Markdown to publication-quality PDF conversion         |
| **Telemetry**     | OpenTelemetry                                       | Full observability across agents, tools, and workflows |
| **Language**      | TypeScript                                          | End-to-end type safety with Zod schema validation      |
| **Monorepo**      | pnpm workspaces                                     | Modular architecture across apps and packages          |

### Architecture at a Glance

```
entropy-v2/
  apps/
    mastra-app/       Core: 7 agents, workflow pipeline, report generator
    api/              Hono REST API + SSE streaming endpoint
    copilot-ui/       Next.js chat interface (CopilotKit)
  packages/
    mcp-biology/      MCP Server: Open Targets, UniProt, Ensembl, NCBI
    mcp-clinical/     MCP Server: ClinicalTrials.gov, PubMed
    mcp-safety/       MCP Server: OpenFDA FAERS, RxNav
    mcp-commercial/   MCP Server: Market data, web search
    audit/            PostgreSQL audit trail for GxP compliance
    telemetry/        OpenTelemetry instrumentation
```

---

<p align="center"><b>Team Jigyasa</b> | AMD Slingshot 2026 | Open Innovation</p>
