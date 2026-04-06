import { describe, it, expect } from "vitest";
import { config } from "dotenv";
import { nvidiaNimModel } from "../lib/nvidia-nim-provider";
import { generateText } from "ai";

// Load .env file
config({ path: "../../.env" });

describe("NVIDIA NIM API Integration", () => {
  it("should successfully call NVIDIA NIM API and get a response", async () => {
    const model = nvidiaNimModel();

    const result = await generateText({
      model,
      prompt: 'Respond with exactly: "NVIDIA NIM is working!"',
    });

    expect(result.text).toBeDefined();
    expect(result.text.length).toBeGreaterThan(0);

    console.log("\n✅ NVIDIA NIM API is working!");
    console.log("✅ Response:", result.text);

    if (result.usage) {
      console.log("✅ Usage:", result.usage);
    }
  }, 30000); // 30 second timeout
});
