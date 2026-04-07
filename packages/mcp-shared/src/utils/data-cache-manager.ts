import * as fs from "fs/promises";
import * as path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

export interface CacheMetadata {
  lastUpdated: Date;
  sourceUrl: string;
  recordCount?: number;
}

export interface CachedData<T> {
  data: T[];
  metadata: CacheMetadata;
}

export class DataCacheManager {
  private cacheDir: string;
  private ttlMs: number;

  constructor(cacheDir: string, ttlDays: number) {
    this.cacheDir = cacheDir;
    this.ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  }

  /**
   * Fetch data from cache or download from source URL if cache is stale/missing
   */
  async fetchOrCache<T>(
    sourceUrl: string,
    filename: string,
    parser: (buffer: Buffer) => Promise<T[]>,
  ): Promise<CachedData<T>> {
    const cacheFilePath = path.join(this.cacheDir, filename);
    const metadataPath = path.join(this.cacheDir, `${filename}.meta.json`);

    // Ensure cache directory exists
    await fs.mkdir(this.cacheDir, { recursive: true });

    // Check if cached file exists and is fresh
    const isCacheFresh = await this.isCacheFresh(metadataPath);

    if (isCacheFresh) {
      // Load from cache
      const buffer = await fs.readFile(cacheFilePath);
      const metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
      metadata.lastUpdated = new Date(metadata.lastUpdated);

      const data = await parser(buffer);
      return { data, metadata };
    }

    // Download from source
    console.log(`Downloading fresh data from ${sourceUrl}...`);
    const response = await fetch(sourceUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to download from ${sourceUrl}: ${response.status} ${response.statusText}`,
      );
    }

    // Save to cache
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(cacheFilePath, buffer);

    // Parse data
    const data = await parser(buffer);

    // Save metadata
    const metadata: CacheMetadata = {
      lastUpdated: new Date(),
      sourceUrl,
      recordCount: data.length,
    };
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    return { data, metadata };
  }

  /**
   * Check if cache is fresh (within TTL)
   */
  private async isCacheFresh(metadataPath: string): Promise<boolean> {
    try {
      const metadataContent = await fs.readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(metadataContent);
      const lastUpdated = new Date(metadata.lastUpdated);
      const age = Date.now() - lastUpdated.getTime();

      return age < this.ttlMs;
    } catch (error) {
      // Cache doesn't exist or is invalid
      return false;
    }
  }

  /**
   * Manually invalidate cache for a specific file
   */
  async invalidateCache(filename: string): Promise<void> {
    const cacheFilePath = path.join(this.cacheDir, filename);
    const metadataPath = path.join(this.cacheDir, `${filename}.meta.json`);

    await Promise.all([
      fs.unlink(cacheFilePath).catch(() => {}),
      fs.unlink(metadataPath).catch(() => {}),
    ]);
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files.map((file) => fs.unlink(path.join(this.cacheDir, file))),
      );
    } catch (error) {
      // Directory doesn't exist or is empty
    }
  }
}
