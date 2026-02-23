import { describe, it, expect } from "vitest";
import { name } from "../index.js";

describe("mastra-app", () => {
  it("should export the package name", () => {
    expect(name).toBe("mastra-app");
  });
});
