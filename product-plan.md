# Entropy v3: The "NotebookLM + Supermemory" Pivot
**Product Plan: Transitioning from a one-shot query engine to a persistent, core research workspace for Pharma**

---

## 1. The Core Vision
The current iteration of Entropy (v2) is fundamentally a **search-and-synthesize pipeline**: a user asks a query, the Mastra agents spin up, hit public APIs (OpenTargets, PubMed, ClinicalTrials), and spit out a static dossier. 

**The Pivot**: Instead of a transactional search engine, Entropy becomes a **Persistent Research Workspace (a "Second Brain" for Pharma)**. It marries the source-grounded workspace paradigm of **NotebookLM** with the persistent, cross-session memory architecture of **Supermemory**.

A translational researcher can create a "Notebook" for a specific target (e.g., *GLP-1 in Alzheimer's*), upload their proprietary internal biology decks, lab assays, and IP documents, and let Entropy automatically fuse that private data with its existing public MCP tools. They then iteratively chat with these sources, generating verifiable insights with exact citations over a period of months.

---

## 2. Unpacking the Paradigms

### The "NotebookLM" Approach (The Workspace)
- **Source-Restricted Grounding**: The AI answers queries based *strictly* on the sources (documents and tool outputs) present in the specific notebook, drastically reducing hallucinations.
- **Auto-Artifact Generation**: Beyond chat, the system auto-generates specific scientific artifacts (e.g., a formal Target Product Profile checklist, mechanism-of-action summaries, and audio podcast-style overviews of a drug's viability).
- **Interactive Citations**: Every claim in the chat directly links to a highlighted paragraph in an uploaded PDF or a specific JSON node from an OpenTargets API call.

### The "Supermemory" Layer (The Second Brain)
- **Persistent Knowledge Graph**: Supermemory provides a universal memory API that doesn't forget. If a researcher worked on modifying a molecule in January, the AI remembers contextual insights from that session when the researcher starts a new trial design notebook in June.
- **Cross-Notebook Pollination**: Utilizing a vector database or graph structure (like Neo4j), Entropy can say: *"You're investigating cardiovascular risks for Drug X. Your colleague uploaded an internal toxicity report on a similar compound 6 months ago in a different workspace. Would you like me to fetch it?"*

---

## 3. Product Architecture & User Journey

### The User Journey
1. **Workspace Creation**: Dr. Smith creates a new notebook: *"Repurposing Metformin for Cognitive Decline"*.
2. **Data Ingestion (Internal)**: Dr. Smith drags-and-drops 5 recent proprietary mass-spec reports, 10 PDFs of literature, and an internal strategic Word document.
3. **Data Ingestion (Agentic/Public)**: Entropy's **Planner Agent** sees the notebook topic and proactively dispatches the Biologist and Clinical Scout agents to fetch structured background data from OpenTargets and ClinicalTrials.gov, dropping those JSON payloads into the Notebook as "Sources".
4. **Interactive Synthesis**: Dr. Smith uses the Chat UI. *"Based on our internal mass-spec results and the external trial data, what are the primary safety hurdles?"* The AI synthesizes across both domains.
5. **Artifact Generation**: Dr. Smith clicks **"Generate TPP Audio Overview"**. Two AI voices discuss the viability of the drug like a podcast, easily shared with the portfolio committee.

### Architectural Shifts Required
To achieve this, the underlying Mastra system must evolve:

| Component | Current (v2) | Target (v3) |
| :--- | :--- | :--- |
| **Data Scope** | Public APIs (MCPs) | Hybrid: Private Uploads + Public APIs |
| **State** | Session-bound (Transient) | Persistent Workspaces (Notebooks) |
| **Memory** | None | Global Vector/Graph Store (Supermemory layer) |
| **UI Paradigm** | Linear Chat -> Report | Multi-panel (Sources left, Chat center, Artifacts right) |

---

## 4. Phased Execution Roadmap

### Phase 1: The "Notebook" Foundation (Weeks 1-3)
*Build the workspace and source-grounding mechanics.*
- **Action**: Implement Notebook/Project entities in the database.
- **Action**: Build a document ingestion pipeline (PDF, DOCX) connected to a Vector Database (e.g., Qdrant, Pinecone).
- **Action**: Modify the UI to allow uploading "Sources".
- **Action**: Update the core chat to strictly use Retrieval-Augmented Generation (RAG) over the selected sources.

### Phase 2: Agent Orchestration Inside Notebooks (Weeks 4-6)
*Make the Mastra agents aware of the Notebook boundaries.*
- **Action**: Instead of agents running once and dying, they act as "Workers" in the notebook.
- **Action**: When a user uploads a document, the **Gap Analyst Agent** automatically reads it in the background and tags missing TPP elements.
- **Action**: The user can specifically @ mention the **Librarian Agent** in the chat to fetch external context into the notebook.

### Phase 3: The Supermemory Integration (Weeks 7-9)
*Implement the long-term, cross-session organizational memory.*
- **Action**: Incorporate the Supermemory concepts (or the actual open-source Supermemory core/API) to build a global knowledge graph.
- **Action**: Track entities (Drugs, Targets, Genes, Diseases) globally across all workspaces.
- **Action**: Surface contextual UI hints: *"3 related internal documents exist outside this notebook. Add them?"*

### Phase 4: Artifact Generation & Audio Overviews (Weeks 10-12)
*Deliver the NotebookLM "Wow" factor.*
- **Action**: Hook up OpenAI TTS or ElevenLabs APIs.
- **Action**: Create deterministic prompts to generate two-speaker "Deep Dive" biomedical podcasts based on notebook sources.
- **Action**: Build a robust citation viewer in the frontend (clicking a footnote opens the PDF to the exact page and highlight).

---

## 5. Why this wins in Pharma
Pharma researchers suffer from scattered context. They use generic ChatGPT wrappers that hallucinate, or bespoke databases that don't talk to each other. By fusing **Mastra's autonomous data-fetching agents**, **NotebookLM's trustworthy source-grounding**, and **Supermemory's long-term enterprise recall**, you create an indispensable daily driver for scientific discovery.
