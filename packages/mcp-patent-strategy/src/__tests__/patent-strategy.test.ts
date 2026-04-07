import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  searchPatentsByKeyword,
  getPatentDetails,
  getPatentsByAssignee,
  type PatentBasic,
} from "../utils/patents-client.js";

// Mock data fixtures
const mockPatentBasic: PatentBasic = {
  patent_number: "10123456",
  patent_title: "Method of treating diabetes with metformin",
  patent_abstract:
    "A method for treating type 2 diabetes by administering metformin...",
  patent_date: "2015-03-15",
  assignees: [{ assignee_organization: "Merck" }],
  inventors: [
    { inventor_first_name: "John", inventor_last_name: "Smith" },
    { inventor_first_name: "Jane", inventor_last_name: "Doe" },
  ],
};

describe("Patent Strategy - USPTO API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("searchPatentsByKeyword", () => {
    it("should return patents matching keyword (happy path)", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patents: [mockPatentBasic],
          total_patent_count: 1,
        }),
      } as Response);

      const result = await searchPatentsByKeyword("metformin diabetes");
      expect(result.patents).toBeDefined();
      expect(result.patents?.[0]?.patent_title).toContain("metformin");
    });

    it("should support year filtering (boundary case)", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patents: [mockPatentBasic],
          total_patent_count: 1,
        }),
      } as Response);

      const result = await searchPatentsByKeyword("metformin", {
        yearFrom: 2010,
        yearTo: 2020,
        limit: 50,
      });

      expect(result.patents).toBeDefined();
      // Verify the call included year constraints
      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.q._gte).toBeDefined();
      expect(body.q._gte.patent_date).toBe("2010-01-01");
      expect(body.q._lte).toBeDefined();
      expect(body.q._lte.patent_date).toBe("2020-12-31");
    });

    it("should handle API errors gracefully (error case)", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      await expect(searchPatentsByKeyword("metformin")).rejects.toThrow(
        "PatentsView API error",
      );
    });

    it("should respect limit parameter (boundary case)", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patents: [mockPatentBasic],
          total_patent_count: 100,
        }),
      } as Response);

      const result = await searchPatentsByKeyword("metformin", { limit: 10 });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.o.per_page).toBeLessThanOrEqual(10);
      expect(body.o.per_page).toBe(10);
    });

    it("should cap limit at 100 (boundary case)", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patents: [mockPatentBasic],
          total_patent_count: 200,
        }),
      } as Response);

      await searchPatentsByKeyword("metformin", { limit: 500 });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.o.per_page).toBe(100); // Should not exceed 100
    });
  });

  describe("getPatentDetails", () => {
    it("should retrieve detailed patent information (happy path)", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patents: [mockPatentBasic],
        }),
      } as Response);

      const result = await getPatentDetails("10123456");
      expect(result).toBeDefined();
      expect(result?.patent_number).toBe("10123456");
      expect(result?.assignees).toHaveLength(1);
      expect(result?.inventors).toHaveLength(2);
    });

    it("should return null for non-existent patent (negative case)", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patents: [],
        }),
      } as Response);

      const result = await getPatentDetails("99999999");
      expect(result).toBeNull();
    });

    it("should handle missing inventors gracefully (degraded path)", async () => {
      const patentNoInventors = { ...mockPatentBasic, inventors: undefined };
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patents: [patentNoInventors],
        }),
      } as Response);

      const result = await getPatentDetails("10123456");
      expect(result?.inventors).toEqual([]); // Should normalize to empty array
    });

    it("should handle missing assignees gracefully (degraded path)", async () => {
      const patentNoAssignees = { ...mockPatentBasic, assignees: undefined };
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patents: [patentNoAssignees],
        }),
      } as Response);

      const result = await getPatentDetails("10123456");
      expect(result?.assignees).toEqual([]); // Should normalize to empty array
    });

    it("should send correct query parameters (verification)", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patents: [mockPatentBasic],
        }),
      } as Response);

      await getPatentDetails("10123456");

      const fetchCall = (global.fetch as any).mock.calls[0];
      const url = fetchCall[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(url).toContain("patentsview.org");
      expect(body.q.patent_number).toBe("10123456");
      expect(body.f).toContain("patent_number");
      expect(body.f).toContain("patent_title");
    });
  });

  describe("getPatentsByAssignee", () => {
    it("should return patents by company (happy path)", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patents: [mockPatentBasic],
          total_patent_count: 150,
        }),
      } as Response);

      const result = await getPatentsByAssignee("Merck");
      expect(result.patents).toBeDefined();
      expect(result.total_patent_count).toBe(150);
    });

    it("should filter by drug keyword when provided (feature)", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patents: [mockPatentBasic],
          total_patent_count: 1,
        }),
      } as Response);

      const result = await getPatentsByAssignee("Merck", {
        drugKeyword: "metformin",
        yearFrom: 2010,
        yearTo: 2020,
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      // Should have combined conditions with AND
      expect(body.q._and).toContainEqual(
        expect.objectContaining({
          assignee_organization: "Merck",
        }),
      );

      // Should include keyword filter
      expect(body.q._and).toContainEqual(
        expect.objectContaining({
          _text_any: expect.objectContaining({
            patent_abstract: "metformin",
          }),
        }),
      );
    });

    it("should return empty array for company with no patents (boundary case)", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patents: [],
          total_patent_count: 0,
        }),
      } as Response);

      const result = await getPatentsByAssignee("NonexistentCorp");
      expect(result.patents).toHaveLength(0);
      expect(result.total_patent_count).toBe(0);
    });

    it("should build AND conditions correctly for all filters (verification)", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          patents: [mockPatentBasic],
          total_patent_count: 5,
        }),
      } as Response);

      await getPatentsByAssignee("Pfizer", {
        yearFrom: 2015,
        yearTo: 2023,
        drugKeyword: "insulin",
        limit: 75,
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      // Verify AND conditions array structure
      expect(body.q._and).toBeInstanceOf(Array);
      expect(body.q._and.length).toBeGreaterThan(1); // Company + date filters + keyword

      // Verify limit is respected
      expect(body.o.per_page).toBe(75);
    });
  });
});
