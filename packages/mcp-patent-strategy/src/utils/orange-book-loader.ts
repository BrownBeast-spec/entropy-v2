/**
 * Orange Book Data Loader
 *
 * Loads FDA Orange Book CSV files (products, patents, exclusivity) using DataCacheManager.
 *
 * Data sources:
 * - Products: https://www.fda.gov/media/76860/download (products.txt)
 * - Patents: https://www.fda.gov/media/76861/download (patent.txt)
 * - Exclusivity: https://www.fda.gov/media/76862/download (exclusivity.txt)
 */

import { DataCacheManager } from "@entropy/mcp-shared";
import {
  parseOrangeBookProducts,
  parseOrangeBookPatents,
  parseOrangeBookExclusivity,
  type OrangeBookProduct,
  type OrangeBookPatent,
  type OrangeBookExclusivity,
} from "@entropy/mcp-shared";

const ORANGE_BOOK_URLS = {
  products: "https://www.fda.gov/media/76860/download",
  patents: "https://www.fda.gov/media/76861/download",
  exclusivity: "https://www.fda.gov/media/76862/download",
} as const;

// Cache for 7 days (Orange Book updated monthly)
const cacheManager = new DataCacheManager(".cache/orange-book", 7);

// Async wrapper for synchronous parser (parseOrangeBookProducts is sync, not async)
async function wrapParser<T>(
  parser: (buffer: Buffer) => T[],
): Promise<(buffer: Buffer) => Promise<T[]>> {
  return async (buffer: Buffer) => Promise.resolve(parser(buffer));
}

/**
 * Load Orange Book products data
 */
export async function loadOrangeBookProducts(): Promise<OrangeBookProduct[]> {
  const asyncParser = await wrapParser(parseOrangeBookProducts);
  const result = await cacheManager.fetchOrCache(
    ORANGE_BOOK_URLS.products,
    "products.txt",
    asyncParser,
  );
  return result.data;
}

/**
 * Load Orange Book patents data
 */
export async function loadOrangeBookPatents(): Promise<OrangeBookPatent[]> {
  const asyncParser = await wrapParser(parseOrangeBookPatents);
  const result = await cacheManager.fetchOrCache(
    ORANGE_BOOK_URLS.patents,
    "patents.txt",
    asyncParser,
  );
  return result.data;
}

/**
 * Load Orange Book exclusivity data
 */
export async function loadOrangeBookExclusivity(): Promise<
  OrangeBookExclusivity[]
> {
  const asyncParser = await wrapParser(parseOrangeBookExclusivity);
  const result = await cacheManager.fetchOrCache(
    ORANGE_BOOK_URLS.exclusivity,
    "exclusivity.txt",
    asyncParser,
  );
  return result.data;
}

/**
 * Search Orange Book products by ingredient name
 */
export async function searchOrangeBookByIngredient(
  ingredient: string,
): Promise<OrangeBookProduct[]> {
  const products = await loadOrangeBookProducts();
  const searchTerm = ingredient.toLowerCase().trim();

  return products.filter((product) =>
    product.ingredient.toLowerCase().includes(searchTerm),
  );
}

/**
 * Get Orange Book data for a specific application number
 */
export async function getOrangeBookByApplNo(applNo: string): Promise<{
  product: OrangeBookProduct | null;
  patents: OrangeBookPatent[];
  exclusivities: OrangeBookExclusivity[];
}> {
  const [products, patents, exclusivities] = await Promise.all([
    loadOrangeBookProducts(),
    loadOrangeBookPatents(),
    loadOrangeBookExclusivity(),
  ]);

  const product = products.find((p) => p.applNo === applNo) ?? null;
  const productPatents = patents.filter((p) => p.appl_no === applNo);
  const productExclusivities = exclusivities.filter(
    (e) => e.appl_no === applNo,
  );

  return {
    product,
    patents: productPatents,
    exclusivities: productExclusivities,
  };
}
