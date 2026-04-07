/**
 * Perplexity Drug/Ingredient Extractor
 *
 * Uses Perplexity API to extract structured pharmaceutical information
 * from natural language queries.
 */

interface DrugExtractionResult {
  drugName: string;
  ingredient: string;
  genericName: string;
  brandName: string;
  indication?: string;
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class PerplexityExtractor {
  private apiKey: string;
  private apiUrl = "https://api.perplexity.ai/chat/completions";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Extract drug name and active ingredient from natural language query
   */
  async extractDrugInfo(query: string): Promise<DrugExtractionResult> {
    const prompt = `Extract pharmaceutical information from this query: "${query}"

Return a JSON object with these fields:
- drugName: The primary drug name mentioned (generic or brand)
- ingredient: The active pharmaceutical ingredient (API) name
- genericName: The generic/scientific name
- brandName: The brand/trade name (if mentioned, otherwise use generic)
- indication: The medical condition/indication (if mentioned)

Rules:
- Use standard pharmaceutical naming (e.g., "Metformin" not "metformin hydrochloride")
- For ingredient, use the base active ingredient without salt forms
- If only generic name given, use it for both drugName and genericName
- Return valid JSON only, no markdown

Example:
Query: "Metformin for diabetes"
Response: {"drugName":"Metformin","ingredient":"Metformin","genericName":"Metformin","brandName":"Glucophage","indication":"diabetes"}`;

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            {
              role: "system",
              content:
                "You are a pharmaceutical data extraction expert. Always respond with valid JSON only.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.0,
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Perplexity API error: ${response.status} ${response.statusText}`,
        );
      }

      const data: PerplexityResponse = await response.json();
      const content = data.choices[0]?.message?.content || "{}";

      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```\n?$/, "");
      }

      const extracted: DrugExtractionResult = JSON.parse(jsonStr);

      // Validate required fields
      if (!extracted.drugName || !extracted.ingredient) {
        throw new Error(
          "Failed to extract required fields (drugName, ingredient)",
        );
      }

      return extracted;
    } catch (error) {
      console.error("Perplexity extraction failed:", error);

      // Fallback: simple extraction
      return this.fallbackExtraction(query);
    }
  }

  /**
   * Fallback extraction when Perplexity fails
   */
  private fallbackExtraction(query: string): DrugExtractionResult {
    // Extract first capitalized word or first word before "for"
    const match =
      query.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/) ||
      query.match(/^(\w+)/);

    const drugName = match ? match[1] : query.split(" ")[0];

    return {
      drugName,
      ingredient: drugName,
      genericName: drugName,
      brandName: drugName,
    };
  }
}

/**
 * Singleton instance
 */
let extractorInstance: PerplexityExtractor | null = null;

export function getPerplexityExtractor(): PerplexityExtractor {
  if (!extractorInstance) {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error("PERPLEXITY_API_KEY not found in environment");
    }
    extractorInstance = new PerplexityExtractor(apiKey);
  }
  return extractorInstance;
}
