# Entropy v3: Provenance-First Database Architecture

To build a zero-hallucination, strictly compliant pharma research tool, we must transition from ephemeral search results to a **Provenance-First Knowledge Graph**. Every biological fact must be mathematically tethered to the physical location of the document it came from.

This document outlines the **minimal but production-ready** stack to achieve this within Entropy.

---

## 1. The Stack
We ditch arbitrary vector-chunkers and naive SQL for a stack purpose-built for enterprise documents and complex semantic mapping.

1. **Graph Database:** **Neo4j** (AuraDB for managed cloud, or Docker for local/on-prem).
2. **Layout-Aware Ingestion:** **LlamaParse** (by LlamaIndex). Standard PDF parsers destroy tables and lose page numbers. LlamaParse uses vision models to perfectly extract tables, headers, and bounding boxes.
3. **Orchestration / RAG:** **LlamaIndex** with `Neo4jPropertyGraphStore`. It natively converts LlamaParse's rich page-level nodes into Graph Entities.
4. **Agent Framework:** Your existing **Mastra** agents will be provided custom MCP tools that run predefined Cypher queries against the Neo4j graph.

---

## 2. The Core Ontology (Graph Schema)

In Neo4j, our data model is explicitly designed to segregate *Biological Facts* from *Provenance Data*, linked by a *Confidence Edge*.

### Provenance Nodes
*   **(Document)**: `{ id: "clinical_trial_V2.pdf", upload_date: "2026-03-23", clearance_level: "Tier_1" }`
*   **(Page)**: `{ page_number: 42 }`
*   **(Chunk)**: `{ chunk_id: "c-104", text: "Metformin exhibits dose-dependent inhibition of Complex I..." }`

### Biology Nodes
*   **(Molecule)**: `{ name: "Metformin", chembl_id: "CHEMBL1431" }`
*   **(Target)**: `{ name: "Complex I", uniprot_id: "P03923" }`
*   **(Disease)**: `{ name: "Alzheimer's", doid: "DOID:10652" }`

### The Relationships (Edges)
1. **Structural Edges:** 
   `(Document) -[:HAS_PAGE]-> (Page) -[:CONTAINS_CHUNK]-> (Chunk)`
2. **Biological Edges:** 
   `(Molecule) -[:INHIBITS]-> (Target)`
3. **The Provenance Bridge (The Magic):**
   Instead of just asserting a biological fact, we link the fact specifically to the chunk where the LLM found it:
   `(:Molecule {name: "Metformin"}) -[:MENTIONED_IN {role: "Subject", confidence: 0.98}]-> (:Chunk {chunk_id: "c-104"})`
   `(:Target {name: "Complex I"}) -[:MENTIONED_IN {role: "Object"}]-> (:Chunk {chunk_id: "c-104"})`

---

## 3. The Implementation Pipeline

Here is the exact code architecture for how ingestion works smoothly.

### Step 1: Layout-Aware Parsing (LlamaParse)
When a researcher drops a 200-page internal trial PDF into Entropy, we parse it using LlamaIndex and LlamaParse.

```python
from llama_parse import LlamaParse
from llama_index.core import SimpleDirectoryReader

# Use vision parsing to keep tables and page coordinates intact
parser = LlamaParse(
    result_type="markdown",
    verbose=True,
    language="en",
    num_workers=4
)

file_extractor = {".pdf": parser}
documents = SimpleDirectoryReader("./uploads", file_extractor=file_extractor).load_data()

# LlamaParse automatically attaches `metadata={"page_label": "42"}` to each chunk!
```

### Step 2: Populating the Neo4j Graph
We use the LlamaIndex `PropertyGraphIndex`, which natively spins up an LLM (like GPT-4o-mini) to read the chunks, extract the Molecules/Targets, and automatically build the graph in Neo4j.

```python
from llama_index.graph_stores.neo4j import Neo4jPropertyGraphStore
from llama_index.core import PropertyGraphIndex

# 1. Connect to Neo4j
graph_store = Neo4jPropertyGraphStore(
    username="neo4j",
    password="<password>",
    url="bolt://localhost:7687",
)

# 2. Extract Entities and Build the Graph
# This automatically creates the "Chunk" nodes and links them to the extracted "Entities"
index = PropertyGraphIndex.from_documents(
    documents,
    property_graph_store=graph_store,
    show_progress=True,
    # You can provide a custom extraction prompt to force it to only look for Pharma terminology
)
```

### Step 3: Agentic Retrieval (Cypher Tool for Mastra)
When the Mastra **Planner Agent** decides it needs to answer a safety question, it calls a tool that runs a Cypher query against Neo4j.

**The Golden Cypher Query:**
This query asks: *"Find me any connection between Metformin and Complex I, but YOU MUST return the exact paragraph text and the page number of the original PDF."*

```cypher
MATCH (m:Entity {name: 'Metformin'})-[:RELATION]->(t:Entity {name: 'Complex I'})
MATCH (m)-[:MENTIONED_IN]->(c:Chunk)<-[:MENTIONED_IN]-(t)
MATCH (p:Page)-[:CONTAINS_CHUNK]->(c)
MATCH (d:Document)-[:HAS_PAGE]->(p)

// Apply Access Control here natively:
WHERE d.clearance_level IN $user_clearance_levels

RETURN 
    m.name AS subject, 
    t.name AS object, 
    c.text AS exact_quote, 
    p.page_number AS page, 
    d.id AS document_name
```

---

## 4. UI Surfacing (Verifiable Trust)

When the Cypher query returns its JSON payload to the Entropy frontend, the Chat UI can confidently render the following perfectly audited statement:

> "According to internal studies, **Metformin** is known to inhibit **Complex I**."
> 
> 📄 **Source 1:** `Internal_Study_v2.pdf` (Page 42, Paragraph 3) 
> *[Click here to view original PDF extract]*

Because the Page and Chunk metadata was intrinsically tethered strictly in the Neo4j graph during ingestion via LlamaParse, the AI is constrained. It **cannot** invent a source, and it **cannot** quote a document the user lacks permission to view.

---

## 5. Hackathon Strategy & Optimizations

If demonstrating this architecture at a hackathon, it is a massive winner—"Provenance-First, Zero-Hallucination Knowledge Graph for $100M Pharma Decisions" is an incredibly strong narrative. However, the production stack is brittle for live, timed demos. 

Follow these rules to perfectly scope the build:

### 1. Pre-Index Your Data (Avoid LlamaParse Latency)
*   **The Problem:** Uploading a large PDF live and waiting 90+ seconds for LlamaParse's vision models to extract bounding boxes will kill the pitch momentum.
*   **The Fix:** Start the demo with the Neo4j Graph *already populated*. Show the impressive, instant retrieval UI first. If you must demonstrate ingestion, use a carefully curated 1-page "dummy" PDF specifically for that 10-second demo block.

### 2. Hardcode the "Golden Queries" (Avoid Text2Cypher Brittleness)
*   **The Problem:** Relying on an LLM to dynamically generate Cypher syntax live on stage is too risky. If the LLM hallucinates the graph traversal logic, your app crashes.
*   **The Fix:** Build 3 specific visual use cases (e.g., "Show me the safety profile of Metformin" or "Cross-reference target X"). Intercept those exact user queries and route them to pre-written, perfectly optimized Cypher templates.

### 3. Use Neo4j AuraDB Free Tier
*   **The Problem:** Spending 8 hours fixing Docker networking issues to run Neo4j locally.
*   **The Fix:** Provision an AuraDB Free instance. It gives you a connection URI in 2 minutes, removing all infrastructure blockers so the team can focus strictly on the `Agent -> Graph -> UI` code pipeline.

---

## 6. Technical Implementation Plan into Entropy Architecture

Integrating this stack requires surgically updating the existing `entropy-v2` Mastra architecture without breaking the current public API workflows. Here is the step-by-step technical plan to build this:

### Step 1: Establish the Knowledge Ingestion API (New Service)
Currently, Entropy only does *outbound* web retrieval. We must build an *inbound* ingestion route.
1. **API Update (`apps/api/src/routes`)**: Add a new `POST /workspaces/:workspaceId/documents` endpoint in the Hono API to accept drug pipeline PDFs from users.
2. **Worker Package (`packages/ingestion`)**: Create a standalone background worker that:
   - Receives the PDF from the API.
   - Triggers the python-based or TS-based `LlamaParse` integration (`parse_page_with_llm` mode).
   - Generates the nodes and relationships.
   - Pushes the Graph structure directly into the Neo4j AuraDB instance.

### Step 2: Create the `InternalMemory` Agent in Mastra
Currently, the pipeline relies on the Biologist, Scout, Hawk, and Librarian to fetch public data.
1. **Agent Modification (`apps/mastra-app/src/agents/internal-memory.ts`)**: Create a new agent (or update the Librarian) whose explicit system prompt is to act as the "Internal Corporate Intelligence" persona.
2. **Custom MCP / Tool Creation (`packages/mcp-internal-graph`)**: Write a new tool `query_provenance_graph(targetEntity, sourceEntity)` that executes the pre-defined Neo4j Cypher templates.
3. **Workflow Wiring (`research-pipeline.ts`)**: Add `internalMemoryStep` to the `.parallel()` execution block alongside the existing public agents.

### Step 3: Upgrading the Planner and Verifier Agents
The orchestrators need to understand the new rules of provenance.
1. **The Planner** (`planner.ts`): Update the prompt instructions. When parsing the user's PICO decomposition, the Planner must uniquely assign tasks to the new `InternalMemory` agent to *"Check our internal knowledge graph for exact page-referenced literature on this target."*
2. **The Verifier** (`verifier.ts`): Upgrade the Verifier instructions to strictly enforce provenance formatting. If the `InternalMemory` agent asserts a fact but drops the `{page_number, document}` metadata, the Verifier must reject the claim or ask for regeneration.

### Step 4: Frontend UI/UX Citations
The Hono API will now return a richer `Evidence` payload from the Mastra session. 
1. **UI Component Update (`apps/client/src/components`)**: Modify the final dossier renderer. 
2. **Provenance Badges**: Whenever a Neo4j-sourced fact is rendered, attach a clickable "Provenance Badge" (e.g., 📄 `Study_V2.pdf - pg.42`). Clicking the badge opens a modal showing the exact bounding-box layout or raw parsed text of that specific chunk for instant human verification.
