import { searchLiterature } from "./src/tools/pubmed.js";

async function run() {
    try {
        console.log("Running searchLiterature...");
        const res = await searchLiterature.execute({ disease: "Keytruda lung cancer", limit: 5, year: 2024 } as any, {});
        console.log("Success:", JSON.stringify(res, null, 2));
    } catch (e: any) {
        console.error("Error message:", e.message);
        console.error("Error stack:", e.stack);
    }
}

run();
