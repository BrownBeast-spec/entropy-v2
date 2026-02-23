import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPubMedTools } from "../tools/pubmed.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeJsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
    headers: new Headers(),
  } as unknown as Response;
}

function makeTextResponse(text: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    text: () => Promise.resolve(text),
    headers: new Headers(),
  } as unknown as Response;
}

const SAMPLE_PUBMED_XML = `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>12345678</PMID>
      <Article>
        <ArticleTitle>Test Article on Cancer Research</ArticleTitle>
        <Journal>
          <Title>Nature Medicine</Title>
          <JournalIssue>
            <PubDate>
              <Year>2024</Year>
              <Month>Jan</Month>
            </PubDate>
          </JournalIssue>
        </Journal>
        <Abstract>
          <AbstractText>This is a test abstract about cancer research.</AbstractText>
        </Abstract>
        <AuthorList>
          <Author>
            <LastName>Smith</LastName>
            <Initials>JA</Initials>
          </Author>
          <Author>
            <LastName>Jones</LastName>
            <Initials>BK</Initials>
          </Author>
        </AuthorList>
      </Article>
      <MeshHeadingList>
        <MeshHeading>
          <DescriptorName>Neoplasms</DescriptorName>
        </MeshHeading>
        <MeshHeading>
          <DescriptorName>Immunotherapy</DescriptorName>
        </MeshHeading>
      </MeshHeadingList>
      <KeywordList>
        <Keyword>cancer</Keyword>
        <Keyword>immunotherapy</Keyword>
      </KeywordList>
    </MedlineCitation>
    <PubmedData>
      <ArticleIdList>
        <ArticleId IdType="pubmed">12345678</ArticleId>
        <ArticleId IdType="doi">10.1038/s41591-024-00001</ArticleId>
      </ArticleIdList>
    </PubmedData>
  </PubmedArticle>
</PubmedArticleSet>`;

const SAMPLE_MULTI_ARTICLE_XML = `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>11111111</PMID>
      <Article>
        <ArticleTitle>First Article</ArticleTitle>
        <Journal>
          <Title>Journal A</Title>
          <JournalIssue>
            <PubDate><Year>2024</Year></PubDate>
          </JournalIssue>
        </Journal>
        <Abstract>
          <AbstractText>Abstract one.</AbstractText>
        </Abstract>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>22222222</PMID>
      <Article>
        <ArticleTitle>Second Article</ArticleTitle>
        <Journal>
          <Title>Journal B</Title>
          <JournalIssue>
            <PubDate><Year>2024</Year><Month>Feb</Month></PubDate>
          </JournalIssue>
        </Journal>
        <Abstract>
          <AbstractText>Abstract two.</AbstractText>
        </Abstract>
      </Article>
    </MedlineCitation>
  </PubmedArticle>
</PubmedArticleSet>`;

describe("PubMed Tools", () => {
  let server: McpServer;
  let registeredTools: Map<
    string,
    { handler: (...args: unknown[]) => unknown }
  >;

  beforeEach(() => {
    vi.clearAllMocks();
    server = new McpServer({ name: "test", version: "0.0.1" });

    registeredTools = new Map();
    const originalTool = server.tool.bind(server);
    server.tool = ((...args: unknown[]) => {
      const name = args[0] as string;
      const cb = args[args.length - 1];
      registeredTools.set(name, {
        handler: cb as (...a: unknown[]) => unknown,
      });
      return originalTool(...(args as Parameters<typeof originalTool>));
    }) as typeof server.tool;

    registerPubMedTools(server);
  });

  describe("search_literature", () => {
    it("should search PubMed and return papers", async () => {
      // First call: esearch
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          esearchresult: {
            count: "42",
            idlist: ["12345678"],
          },
        }),
      );
      // Second call: efetch (XML)
      mockFetch.mockResolvedValueOnce(makeTextResponse(SAMPLE_PUBMED_XML));

      const handler = registeredTools.get("search_literature")!.handler;
      const result = (await handler({
        disease: "cancer",
        year: 2024,
        limit: 5,
      })) as { content: Array<{ type: string; text: string }> };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.topic).toBe("cancer");
      expect(parsed.total_found).toBe("42");
      expect(parsed.top_papers).toHaveLength(1);
      expect(parsed.top_papers[0].id).toBe("12345678");
      expect(parsed.top_papers[0].title).toBe(
        "Test Article on Cancer Research",
      );
      expect(parsed.top_papers[0].journal).toBe("Nature Medicine");
      expect(parsed.top_papers[0].pub_date).toBe("2024 Jan");
      expect(parsed.top_papers[0].abstract).toContain("cancer research");
      expect(parsed.top_papers[0].link).toBe(
        "https://pubmed.ncbi.nlm.nih.gov/12345678/",
      );
    });

    it("should handle multiple papers", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          esearchresult: {
            count: "100",
            idlist: ["11111111", "22222222"],
          },
        }),
      );
      mockFetch.mockResolvedValueOnce(
        makeTextResponse(SAMPLE_MULTI_ARTICLE_XML),
      );

      const handler = registeredTools.get("search_literature")!.handler;
      const result = (await handler({
        disease: "NSCLC",
        year: 2024,
        limit: 5,
      })) as { content: Array<{ type: string; text: string }> };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.top_papers).toHaveLength(2);
      expect(parsed.top_papers[0].id).toBe("11111111");
      expect(parsed.top_papers[1].id).toBe("22222222");
    });

    it("should return empty array when no papers found", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          esearchresult: { count: "0", idlist: [] },
        }),
      );

      const handler = registeredTools.get("search_literature")!.handler;
      const result = (await handler({
        disease: "xyznonexistent",
        year: 2024,
        limit: 5,
      })) as { content: Array<{ type: string; text: string }> };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.top_papers).toEqual([]);
      expect(parsed.total_found).toBe("0");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const handler = registeredTools.get("search_literature")!.handler;
      const result = (await handler({
        disease: "cancer",
        year: 2024,
        limit: 5,
      })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("Network failure");
    });
  });

  describe("search_preprints", () => {
    it("should search preprints and filter by topic", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          collection: [
            {
              doi: "10.1101/2024.01.01.001",
              title: "CRISPR Gene Editing in Cancer",
              date: "2024-01-15",
              abstract: "A study about CRISPR and cancer therapy.",
            },
            {
              doi: "10.1101/2024.01.02.002",
              title: "Unrelated Plant Study",
              date: "2024-01-16",
              abstract: "This is about plants.",
            },
            {
              doi: "10.1101/2024.01.03.003",
              title: "Another Study",
              date: "2024-01-17",
              abstract: "This abstract mentions cancer treatment options.",
            },
          ],
        }),
      );

      const handler = registeredTools.get("search_preprints")!.handler;
      const result = (await handler({
        topic: "cancer",
        server: "biorxiv",
        days: 30,
      })) as { content: Array<{ type: string; text: string }> };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.source).toBe("biorxiv");
      expect(parsed.topic).toBe("cancer");
      expect(parsed.total_scanned).toBe(3);
      expect(parsed.matched).toBe(2);
      expect(parsed.top_papers).toHaveLength(2);
      expect(parsed.top_papers[0].id).toBe("10.1101/2024.01.01.001");
      expect(parsed.top_papers[0].link).toBe(
        "https://doi.org/10.1101/2024.01.01.001",
      );
    });

    it("should return empty when no matches", async () => {
      mockFetch.mockResolvedValueOnce(
        makeJsonResponse({
          collection: [
            {
              doi: "10.1101/2024.01.01.001",
              title: "Plant Biology",
              date: "2024-01-15",
              abstract: "About plants.",
            },
          ],
        }),
      );

      const handler = registeredTools.get("search_preprints")!.handler;
      const result = (await handler({
        topic: "quantum physics",
        server: "biorxiv",
        days: 30,
      })) as { content: Array<{ type: string; text: string }> };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.matched).toBe(0);
      expect(parsed.top_papers).toEqual([]);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection timeout"));

      const handler = registeredTools.get("search_preprints")!.handler;
      const result = (await handler({
        topic: "cancer",
        server: "biorxiv",
        days: 30,
      })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("Connection timeout");
    });

    it("should handle medrxiv server", async () => {
      mockFetch.mockResolvedValueOnce(makeJsonResponse({ collection: [] }));

      const handler = registeredTools.get("search_preprints")!.handler;
      const result = (await handler({
        topic: "covid",
        server: "medrxiv",
        days: 7,
      })) as { content: Array<{ type: string; text: string }> };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.source).toBe("medrxiv");
      expect(parsed.total_scanned).toBe(0);
      // Verify the URL was called with medrxiv
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("medrxiv"),
      );
    });
  });

  describe("get_abstract", () => {
    it("should return abstract for a PMID", async () => {
      mockFetch.mockResolvedValueOnce(makeTextResponse(SAMPLE_PUBMED_XML));

      const handler = registeredTools.get("get_abstract")!.handler;
      const result = (await handler({ pmid: "12345678" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.pmid).toBe("12345678");
      expect(parsed.title).toBe("Test Article on Cancer Research");
      expect(parsed.abstract).toContain("cancer research");
      expect(parsed.link).toBe("https://pubmed.ncbi.nlm.nih.gov/12345678/");
    });

    it("should handle article not found", async () => {
      const emptyXml = `<?xml version="1.0"?><PubmedArticleSet></PubmedArticleSet>`;
      mockFetch.mockResolvedValueOnce(makeTextResponse(emptyXml));

      const handler = registeredTools.get("get_abstract")!.handler;
      const result = (await handler({ pmid: "99999999" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("not found");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const handler = registeredTools.get("get_abstract")!.handler;
      const result = (await handler({ pmid: "12345678" })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("ECONNREFUSED");
    });
  });

  describe("get_paper_metadata", () => {
    it("should return full metadata for a PMID", async () => {
      mockFetch.mockResolvedValueOnce(makeTextResponse(SAMPLE_PUBMED_XML));

      const handler = registeredTools.get("get_paper_metadata")!.handler;
      const result = (await handler({ pmid: "12345678" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.pmid).toBe("12345678");
      expect(parsed.title).toBe("Test Article on Cancer Research");
      expect(parsed.authors).toEqual(["Smith JA", "Jones BK"]);
      expect(parsed.journal).toBe("Nature Medicine");
      expect(parsed.pub_date).toBe("2024 Jan");
      expect(parsed.doi).toBe("10.1038/s41591-024-00001");
      expect(parsed.mesh_terms).toContain("Neoplasms");
      expect(parsed.mesh_terms).toContain("Immunotherapy");
      expect(parsed.keywords).toContain("cancer");
      expect(parsed.keywords).toContain("immunotherapy");
      expect(parsed.abstract).toContain("cancer research");
      expect(parsed.link).toBe("https://pubmed.ncbi.nlm.nih.gov/12345678/");
    });

    it("should handle article not found", async () => {
      const emptyXml = `<?xml version="1.0"?><PubmedArticleSet></PubmedArticleSet>`;
      mockFetch.mockResolvedValueOnce(makeTextResponse(emptyXml));

      const handler = registeredTools.get("get_paper_metadata")!.handler;
      const result = (await handler({ pmid: "99999999" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.error).toContain("not found");
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Timeout"));

      const handler = registeredTools.get("get_paper_metadata")!.handler;
      const result = (await handler({ pmid: "12345678" })) as {
        content: Array<{ type: string; text: string }>;
        isError: boolean;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(result.isError).toBe(true);
      expect(parsed.error).toContain("Timeout");
    });

    it("should handle missing optional fields gracefully", async () => {
      const minimalXml = `<?xml version="1.0"?>
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation>
      <PMID>55555555</PMID>
      <Article>
        <ArticleTitle>Minimal Article</ArticleTitle>
        <Journal>
          <Title>Some Journal</Title>
          <JournalIssue>
            <PubDate><Year>2024</Year></PubDate>
          </JournalIssue>
        </Journal>
      </Article>
    </MedlineCitation>
    <PubmedData>
      <ArticleIdList>
        <ArticleId IdType="pubmed">55555555</ArticleId>
      </ArticleIdList>
    </PubmedData>
  </PubmedArticle>
</PubmedArticleSet>`;
      mockFetch.mockResolvedValueOnce(makeTextResponse(minimalXml));

      const handler = registeredTools.get("get_paper_metadata")!.handler;
      const result = (await handler({ pmid: "55555555" })) as {
        content: Array<{ type: string; text: string }>;
      };
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.pmid).toBe("55555555");
      expect(parsed.title).toBe("Minimal Article");
      expect(parsed.authors).toEqual([]);
      expect(parsed.doi).toBeNull();
      expect(parsed.mesh_terms).toEqual([]);
      expect(parsed.keywords).toEqual([]);
      expect(parsed.abstract).toBe("No Abstract Available.");
    });
  });
});
