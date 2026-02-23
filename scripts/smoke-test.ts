/**
 * Smoke-test script: calls every MCP tool against REAL APIs.
 *
 * Usage:  npx tsx scripts/smoke-test.ts
 *
 * No API keys required — all endpoints are free/open.
 * Each test prints PASS/FAIL with a data sample.
 */

// ── helpers ────────────────────────────────────────────────────────────────

// We dynamically import McpServer from the biology package's node_modules
// since scripts/ is not a workspace package.
let McpServerClass: any;

async function getMcpServer() {
  if (!McpServerClass) {
    const mod = await import("../packages/mcp-biology/node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js");
    McpServerClass = mod.McpServer;
  }
  return new McpServerClass({ name: "smoke-test", version: "0.0.1" });
}

interface ToolEntry {
  handler: (params: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[] }>;
}

function captureTools(server: any): Map<string, ToolEntry> {
  const tools = new Map<string, ToolEntry>();
  const original = server.tool.bind(server);
  server.tool = ((...args: unknown[]) => {
    const name = args[0] as string;
    const cb = args[args.length - 1] as ToolEntry["handler"];
    tools.set(name, { handler: cb });
    return original(...(args as Parameters<typeof original>));
  }) as typeof server.tool;
  return tools;
}

interface TestCase {
  tool: string;
  params: Record<string, unknown>;
  validate: (parsed: Record<string, unknown>) => string | null; // null = pass, string = fail reason
}

let passed = 0;
let failed = 0;
const failures: { tool: string; reason: string }[] = [];

async function runTest(
  tools: Map<string, ToolEntry>,
  tc: TestCase,
): Promise<void> {
  const label = `${tc.tool}(${JSON.stringify(tc.params)})`;
  try {
    const entry = tools.get(tc.tool);
    if (!entry) {
      console.log(`  FAIL  ${label}\n        Tool not registered`);
      failed++;
      failures.push({ tool: tc.tool, reason: "Tool not registered" });
      return;
    }

    const result = await entry.handler(tc.params);
    const text = result.content[0]?.text;
    if (!text) {
      console.log(`  FAIL  ${label}\n        Empty response`);
      failed++;
      failures.push({ tool: tc.tool, reason: "Empty response" });
      return;
    }

    const parsed = JSON.parse(text) as Record<string, unknown>;

    // Check if it's an error response
    if (parsed.error) {
      console.log(`  FAIL  ${label}\n        API returned error: ${parsed.error}`);
      failed++;
      failures.push({ tool: tc.tool, reason: `API error: ${String(parsed.error)}` });
      return;
    }

    const failReason = tc.validate(parsed);
    if (failReason) {
      console.log(`  FAIL  ${label}\n        ${failReason}`);
      console.log(`        Response: ${text.slice(0, 300)}`);
      failed++;
      failures.push({ tool: tc.tool, reason: failReason });
      return;
    }

    // Truncate output for readability
    const preview = text.length > 200 ? text.slice(0, 200) + "…" : text;
    console.log(`  PASS  ${label}\n        ${preview}\n`);
    passed++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  FAIL  ${label}\n        Exception: ${msg}`);
    failed++;
    failures.push({ tool: tc.tool, reason: `Exception: ${msg}` });
  }
}

// ── mcp-biology ────────────────────────────────────────────────────────────

async function testBiology(): Promise<void> {
  console.log("\n═══ mcp-biology ═══════════════════════════════════════════\n");

  const { registerOpenTargetsTools } = await import("../packages/mcp-biology/src/tools/opentargets.js");
  const { registerNcbiTools } = await import("../packages/mcp-biology/src/tools/ncbi.js");
  const { registerEnsemblTools } = await import("../packages/mcp-biology/src/tools/ensembl.js");
  const { registerUniprotTools } = await import("../packages/mcp-biology/src/tools/uniprot.js");

  const server = await getMcpServer();
  const tools = captureTools(server);
  registerOpenTargetsTools(server);
  registerNcbiTools(server);
  registerEnsemblTools(server);
  registerUniprotTools(server);

  const tests: TestCase[] = [
    {
      tool: "validate_target",
      params: { geneSymbol: "EGFR" },
      validate: (p) => {
        if (!p.target_id && !p.ensembl_id && !p.target) return "Missing target_id/ensembl_id";
        return null;
      },
    },
    {
      tool: "get_drug_info",
      params: { drugId: "CHEMBL941" }, // Imatinib
      validate: (p) => {
        if (!p.name && !p.drug_name) return "Missing drug name";
        return null;
      },
    },
    {
      tool: "get_ncbi_gene_info",
      params: { geneSymbol: "TP53" },
      validate: (p) => {
        if (!p.gene_id) return "Missing gene_id";
        return null;
      },
    },
    {
      tool: "get_gene_info",
      params: { symbol: "BRCA1", species: "homo_sapiens" },
      validate: (p) => {
        if (!p.id && !p.ensembl_id) return "Missing gene ID";
        return null;
      },
    },
    {
      tool: "get_protein_data",
      params: { accession: "P00533" }, // EGFR
      validate: (p) => {
        if (!p.accession) return "Missing accession";
        return null;
      },
    },
    {
      tool: "search_uniprot",
      params: { query: "insulin human" },
      validate: (p) => {
        const results = p.results as unknown[];
        if (!results || results.length === 0) return "No search results";
        return null;
      },
    },
  ];

  for (const tc of tests) {
    await runTest(tools, tc);
  }
}

// ── mcp-clinical ───────────────────────────────────────────────────────────

async function testClinical(): Promise<void> {
  console.log("\n═══ mcp-clinical ══════════════════════════════════════════\n");

  const { registerClinicalTrialsTools } = await import("../packages/mcp-clinical/src/tools/clinicaltrials.js");
  const { registerPubMedTools } = await import("../packages/mcp-clinical/src/tools/pubmed.js");

  const server = await getMcpServer();
  const tools = captureTools(server);
  registerClinicalTrialsTools(server);
  registerPubMedTools(server);

  const tests: TestCase[] = [
    {
      tool: "search_studies",
      params: { term: "NSCLC pembrolizumab", limit: 3 },
      validate: (p) => {
        if (p.total_found === undefined) return "Missing total_found";
        const studies = p.studies as unknown[];
        if (!studies || studies.length === 0) return "No studies returned";
        return null;
      },
    },
    {
      tool: "get_study_details",
      params: { nctId: "NCT02578680" }, // KEYNOTE-024
      validate: (p) => {
        if (!p.nct_id) return "Missing nct_id";
        if (!p.title) return "Missing title";
        return null;
      },
    },
    {
      tool: "search_literature",
      params: { disease: "glioblastoma", year: 2024, limit: 3 },
      validate: (p) => {
        if (!p.total_found) return "Missing total_found";
        const papers = p.top_papers as unknown[];
        if (!papers || papers.length === 0) return "No papers returned";
        return null;
      },
    },
    {
      tool: "get_abstract",
      params: { pmid: "33087781" }, // A known PMID
      validate: (p) => {
        if (!p.title) return "Missing title";
        if (!p.abstract) return "Missing abstract";
        return null;
      },
    },
  ];

  for (const tc of tests) {
    await runTest(tools, tc);
  }
}

// ── mcp-safety ─────────────────────────────────────────────────────────────

async function testSafety(): Promise<void> {
  console.log("\n═══ mcp-safety ════════════════════════════════════════════\n");

  const { registerOpenFdaTools } = await import("../packages/mcp-safety/src/tools/openfda.js");
  const { registerInteractionTools } = await import("../packages/mcp-safety/src/tools/interactions.js");

  const server = await getMcpServer();
  const tools = captureTools(server);
  registerOpenFdaTools(server);
  registerInteractionTools(server);

  const tests: TestCase[] = [
    {
      tool: "check_drug_safety",
      params: { drug: "Humira" },
      validate: (p) => {
        if (!p.drug) return "Missing drug field";
        if (!p.risk_level) return "Missing risk_level";
        return null;
      },
    },
    {
      tool: "check_adverse_events",
      params: { drug: "metformin", limit: 5 },
      validate: (p) => {
        const reactions = p.top_reactions as unknown[];
        if (!reactions) return "Missing top_reactions";
        if (reactions.length === 0) return "No adverse events returned";
        return null;
      },
    },
    {
      tool: "check_recalls",
      params: { drug: "metformin" },
      validate: (p) => {
        if (p.found === undefined) return "Missing found field";
        return null;
      },
    },
    {
      tool: "search_drugs_fda",
      params: { query: "Keytruda", limit: 3 },
      validate: (p) => {
        if (p.total_found === undefined) return "Missing total_found";
        return null;
      },
    },
    {
      tool: "get_drug_interactions",
      params: { drug: "aspirin" },
      validate: (p) => {
        if (p.interaction_count === undefined) return "Missing interaction_count";
        return null;
      },
    },
  ];

  for (const tc of tests) {
    await runTest(tools, tc);
  }
}

// ── mcp-commercial (stubs) ─────────────────────────────────────────────────

async function testCommercial(): Promise<void> {
  console.log("\n═══ mcp-commercial (stubs) ═════════════════════════════════\n");

  const { registerMarketTools } = await import("../packages/mcp-commercial/src/tools/market.js");
  const { registerWebSearchTools } = await import("../packages/mcp-commercial/src/tools/websearch.js");

  const server = await getMcpServer();
  const tools = captureTools(server);
  registerMarketTools(server);
  registerWebSearchTools(server);

  const tests: TestCase[] = [
    {
      tool: "search_market_data",
      params: { query: "Oncology", region: "US" },
      validate: (p) => {
        if (p._stub !== true) return "Missing _stub: true flag";
        return null;
      },
    },
    {
      tool: "web_search_sonar",
      params: { query: "CAR-T therapy market", focus: "web" },
      validate: (p) => {
        if (p._stub !== true) return "Missing _stub: true flag";
        return null;
      },
    },
  ];

  for (const tc of tests) {
    await runTest(tools, tc);
  }
}

// ── main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  MCP Smoke Test — Live API Calls (no API keys needed)  ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  await testBiology();
  await testClinical();
  await testSafety();
  await testCommercial();

  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failures.length > 0) {
    console.log("\n  Failures:");
    for (const f of failures) {
      console.log(`    - ${f.tool}: ${f.reason}`);
    }
  }
  console.log("══════════════════════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

main();
