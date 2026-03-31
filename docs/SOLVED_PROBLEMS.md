# Solved Implementation Problems

This document tracks technical issues encountered during the development of Entropy V2 and how they were resolved. This ensures tribal knowledge is preserved and similar issues can be quickly addressed in the future.

## 1. Mastra TS SDK Integration (`new Agent()` Configuration)

**Problem:**
During the setup of the Mastra TypeScript layers (e.g., in `src/agents/co-pharma.ts`), TypeScript compilation errors occurred indicating missing tool namespacing or incorrect usage compared to the version `1.3.2` schema. Originally, tools were being referenced directly on the engine or not correctly wrapped.

**Solution:**
We updated the architecture to define tools according to Mastra 1.3.2. All natively rewritten tools were correctly structured using `createTool({ id, description, inputSchema, outputSchema, execute })` and cleanly injected into the orchestrator `Agent` instance under the `tools` dictionary (e.g. `validate_target: validateTarget`).

## 2. Rollup Bundler "Missing Export" Error (pubmed.js)

**Problem:**
When running `npx mastra dev`, the CLI's internal Rollup bundler failed with a `MISSING_EXPORT` error:
`"searchLiterature" is not exported by "src/tools/pubmed.js", imported by "src/agents/co-pharma.ts".`

**Root Cause:**
A stray, pre-compiled CommonJS `.js` build file (`src/tools/pubmed.js`) was present alongside the primary TypeScript source file (`src/tools/pubmed.ts`). Rollup's module resolution prioritized `.js` files or tripped over the shadowing, and since the old CommonJS file lacked an ES module export for `searchLiterature`, the bundler crashed.

**Solution:**
Identified the stray `pubmed.js` file and deleted it from the directory. Subsequent runs of `npx mastra build` succeeded without throwing the bundle error. To prevent this, standard project `tsconfig.json` configurations are used to output builds into `dist/` or equivalent folders rather than inline in `$src`, and `.gitignore` prevents trailing JS files from being committed.
